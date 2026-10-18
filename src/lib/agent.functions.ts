// Autonomous IDS agent. Runs the full loop: generate rules → sync events →
// triage with AI → execute response actions → cluster findings into incident
// reports. Every step is logged to agent_actions.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { signAwsRequest } from "@/lib/aws/sigv4";
import { decryptSecret } from "@/lib/aws/crypto";
import { syncFindings } from "@/lib/aws.functions";
import { validateExternalUrl } from "@/lib/security";
import { checkRateLimitByUser, RATE_LIMITS, createRateLimitResponse } from "@/lib/rate-limit";
import { writeAuditLog, AUDIT_ACTIONS, getRequestMetadata } from "@/lib/audit";
import {
  getAuthorizedAwsConnection,
  verifyActionOwnership,
  createUnauthorizedResponse,
} from "@/lib/authorization";
import { createSafeErrorResponse } from "@/lib/redaction";
import type { Json, Tables } from "@/integrations/supabase/types";
import {
  asRecord,
  chatMessageContent,
  getErrorMessage,
  nestedString,
  readJson,
} from "@/lib/type-utils";

// ---------- Public entry: run the full autonomous cycle ----------
export const runAutopilot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;

    // SECURITY: Rate limit autopilot runs (expensive operation)
    const rateLimit = checkRateLimitByUser(userId, RATE_LIMITS.AUTOPILOT);
    if (!rateLimit.allowed) {
      return { ok: false as const, error: "Rate limit exceeded" };
    }

    // SECURITY: Audit log start
    await writeAuditLog({
      user_id: userId,
      action: AUDIT_ACTIONS.AGENT_RUN_START,
      status: "success",
    });

    const conn = await getAuthorizedAwsConnection(userId);
    if (!conn) return { ok: false as const, error: "No AWS connection configured" };

    const { data: run } = await supabaseAdmin
      .from("agent_runs")
      .insert({ user_id: userId, connection_id: conn.id, status: "running" })
      .select("id")
      .single();
    const runId = run?.id;
    const errors: string[] = [];
    const stats = { rules_created: 0, events_synced: 0, approvals_created: 0, reports: 0 };

    // 1. RULE GENERATION — ensure tailored detection rules exist
    try {
      const existing = await supabaseAdmin
        .from("detection_rules")
        .select("id")
        .eq("user_id", userId)
        .limit(1);
      if (!existing.data?.length) {
        const created = await generateRules(userId, conn.id);
        stats.rules_created = created;
        await logAction(
          userId,
          conn.id,
          null,
          "rule_create",
          "ruleset",
          "success",
          `Generated ${created} AI detection rules tailored to this AWS account`,
        );
      }
    } catch (e: unknown) {
      errors.push(`rules: ${getErrorMessage(e)}`);
    }

    // 2. SYNC — pull CloudTrail + GuardDuty (existing function, AI-analyzed)
    try {
      const syncRes = await syncFindings();
      if (syncRes && "ok" in syncRes && syncRes.ok) {
        stats.events_synced = (syncRes.cloudtrail ?? 0) + (syncRes.guardduty ?? 0);
      } else if (syncRes && "error" in syncRes && syncRes.error) {
        errors.push(`sync: ${syncRes.error}`);
      }
    } catch (e: unknown) {
      errors.push(`sync: ${getErrorMessage(e)}`);
    }

    // 3. CONTAINMENT — create approval requests (SECURITY: human-in-the-loop for AWS writes)
    if (conn.auto_response_enabled) {
      try {
        stats.approvals_created = await createContainmentApprovals(userId, conn);
      } catch (e: unknown) {
        errors.push(`contain: ${getErrorMessage(e)}`);
      }
    }

    // 4. REPORT — cluster recent high/critical findings into an incident report
    try {
      const created = await generateIncidentReport(userId, conn.id);
      if (created) stats.reports = 1;
    } catch (e: unknown) {
      errors.push(`report: ${getErrorMessage(e)}`);
    }

    if (runId) {
      await supabaseAdmin
        .from("agent_runs")
        .update({
          status: errors.length ? "completed_with_errors" : "completed",
          stats,
          errors,
          finished_at: new Date().toISOString(),
        })
        .eq("id", runId);
    }

    // SECURITY: Audit log completion
    await writeAuditLog({
      user_id: userId,
      action: AUDIT_ACTIONS.AGENT_RUN_COMPLETE,
      details: { stats },
      status: errors.length === 0 ? "success" : "failure",
    });

    return { ok: true as const, ...stats, errors };
  });

// ---------- Toggle auto-response (requires IAM write perms in AWS) ----------
export const setAutoResponse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as { enabled?: boolean };
    return { enabled: !!i.enabled };
  })
  .handler(async ({ data, context }) => {
    await supabaseAdmin
      .from("aws_connections")
      .update({ auto_response_enabled: data.enabled })
      .eq("user_id", context.userId);
    return { ok: true as const };
  });

// ---------- Manual rule regeneration ----------
export const regenerateRules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const conn = await loadConnection(context.userId);
    if (!conn) return { ok: false as const, error: "No connection" };
    await supabaseAdmin.from("detection_rules").delete().eq("user_id", context.userId);
    const created = await generateRules(context.userId, conn.id);
    return { ok: true as const, created };
  });

// ---------- SECURITY: Approve or reject a pending containment action ----------
export const handleApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as { approval_id?: string; action?: "approve" | "reject" };
    if (!i.approval_id || !i.action) throw new Error("approval_id and action required");
    return { approval_id: String(i.approval_id), action: i.action };
  })
  .handler(async ({ data, context }) => {
    const userId = context.userId;

    // SECURITY: Verify ownership of the approval
    const { data: approval } = await supabaseAdmin
      .from("pending_approvals")
      .select("*")
      .eq("id", data.approval_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!approval) return createUnauthorizedResponse();

    if (approval.status !== "pending") {
      return { ok: false as const, error: "Approval already processed" };
    }

    // Check expiry
    if (new Date(approval.expires_at) < new Date()) {
      return { ok: false as const, error: "Approval has expired" };
    }

    if (data.action === "reject") {
      // Reject the approval
      await supabaseAdmin
        .from("pending_approvals")
        .update({
          status: "rejected",
          approved_at: new Date().toISOString(),
          approved_by: userId,
        })
        .eq("id", approval.id);

      await writeAuditLog({
        user_id: userId,
        action: AUDIT_ACTIONS.CONTAINMENT_APPROVAL_DENIED,
        resource_type: "iam_access_key",
        resource_id: approval.target,
        details: { reasoning: approval.reasoning },
        status: "success",
      });

      return { ok: true as const, status: "rejected" };
    }

    // Approve and execute the containment action
    const conn = await getAuthorizedAwsConnection(userId);
    if (!conn) return { ok: false as const, error: "No AWS connection" };

    const [userName, accessKeyId] = approval.target.split(":");
    if (!userName || !accessKeyId) {
      return { ok: false as const, error: "Invalid target format" };
    }

    // SECURITY: Final deterministic check - never disable STRATA's own key
    if (conn.aws_arn?.includes(userName)) {
      await writeAuditLog({
        user_id: userId,
        action: AUDIT_ACTIONS.CONTAINMENT_APPROVAL_DENIED,
        resource_type: "iam_access_key",
        resource_id: accessKeyId,
        details: { reason: "Attempted to disable STRATA's own credentials" },
        status: "blocked",
      });
      return { ok: false as const, error: "Cannot disable STRATA's own credentials" };
    }

    const success = await deactivateAccessKey(conn, userName, accessKeyId);

    await supabaseAdmin
      .from("pending_approvals")
      .update({
        status: success ? "approved" : "rejected",
        approved_at: new Date().toISOString(),
        approved_by: userId,
      })
      .eq("id", approval.id);

    await writeAuditLog({
      user_id: userId,
      action: success
        ? AUDIT_ACTIONS.CONTAINMENT_APPROVAL_GRANTED
        : AUDIT_ACTIONS.CONTAINMENT_APPROVAL_DENIED,
      resource_type: "iam_access_key",
      resource_id: accessKeyId,
      details: {
        user_name: userName,
        reasoning: approval.reasoning,
        execution_success: success,
      },
      status: success ? "success" : "failure",
    });

    if (success) {
      await writeAuditLog({
        user_id: userId,
        action: AUDIT_ACTIONS.CONTAINMENT_KEY_DISABLE,
        resource_type: "iam_access_key",
        resource_id: accessKeyId,
        details: { user_name: userName },
        status: "success",
      });
    }

    return { ok: true as const, status: success ? "executed" : "failed" };
  });

// ---------- Clear current session (wipes findings/runs/actions/reports/rules) ----------
export const clearSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const uid = context.userId;
    // Snapshot run count for the history record before wiping
    const { data: runs } = await supabaseAdmin
      .from("agent_runs")
      .select("id, stats")
      .eq("user_id", uid);
    const { data: findingsCount } = await supabaseAdmin
      .from("findings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid);
    const { data: reportsCount } = await supabaseAdmin
      .from("incident_reports")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid);

    await supabaseAdmin.from("agent_sessions").insert({
      user_id: uid,
      runs: runs?.length ?? 0,
      findings: findingsCount?.length ?? 0,
      reports: reportsCount?.length ?? 0,
      stats_rollup: (runs ?? []).reduce((acc: Record<string, number>, r) => {
        const stats = asRecord(r.stats);
        for (const k of Object.keys(stats)) {
          const value = stats[k];
          acc[k] = (acc[k] ?? 0) + (typeof value === "number" ? value : 0);
        }
        return acc;
      }, {}),
    });

    await Promise.all([
      supabaseAdmin.from("findings").delete().eq("user_id", uid),
      supabaseAdmin.from("agent_actions").delete().eq("user_id", uid),
      supabaseAdmin.from("agent_runs").delete().eq("user_id", uid),
      supabaseAdmin.from("incident_reports").delete().eq("user_id", uid),
      supabaseAdmin.from("detection_rules").delete().eq("user_id", uid),
    ]);
    return { ok: true as const };
  });

// ---------- AI explanation for an auto-block action ----------
export const explainBlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as { action_id?: string };
    if (!i.action_id) throw new Error("action_id required");
    return { action_id: String(i.action_id) };
  })
  .handler(async ({ data, context }) => {
    const { data: action } = await supabaseAdmin
      .from("agent_actions")
      .select("*")
      .eq("id", data.action_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!action) return { ok: false as const, error: "not found" };
    const existingDetails = asRecord(action.details);
    if (typeof existingDetails.ai_explanation === "string") {
      return {
        ok: true as const,
        explanation: existingDetails.ai_explanation,
        cached: true,
      };
    }
    let finding: Tables<"findings"> | null = null;
    if (action.finding_id) {
      const r = await supabaseAdmin
        .from("findings")
        .select("*")
        .eq("id", action.finding_id)
        .maybeSingle();
      finding = r.data;
    }
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { ok: false as const, error: "no api key" };
    const prompt = `You are a SOC analyst. Explain — in 3 short paragraphs — why the autonomous containment agent took the following action and what the user should verify next. Be concrete, reference the finding evidence.

Action: ${action.action_type} on ${action.target}
Status: ${action.status}
Initial reasoning: ${action.reasoning}

Triggering finding:
${JSON.stringify(finding ?? {}, null, 2).slice(0, 4000)}`;

    // SECURITY: Validate AI gateway URL
    const aiGatewayUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
    if (!validateExternalUrl(aiGatewayUrl, ["ai.gateway.lovable.dev"])) {
      return { ok: false as const, error: "Invalid AI gateway URL" };
    }

    const res = await fetch(aiGatewayUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Write clearly and concretely for a security engineer reviewing automated containment.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) return { ok: false as const, error: `ai ${res.status}` };
    const j = await readJson(res);
    const explanation = chatMessageContent(j).trim();
    if (!explanation) return { ok: false as const, error: "empty" };
    await supabaseAdmin
      .from("agent_actions")
      .update({
        details: { ...existingDetails, ai_explanation: explanation } as Json,
      })
      .eq("id", action.id);
    return { ok: true as const, explanation, cached: false };
  });

// ---------------- helpers ----------------

async function loadConnection(userId: string) {
  const { data } = await supabaseAdmin
    .from("aws_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  // Prefer encrypted secret, fall back to legacy plaintext
  const secret = data.encrypted_secret
    ? (safeDecrypt(data.encrypted_secret) ?? data.secret_access_key)
    : data.secret_access_key;
  return { ...data, secret_access_key: secret };
}

function safeDecrypt(payload: string): string | null {
  try {
    return decryptSecret(payload);
  } catch {
    return null;
  }
}

async function logAction(
  userId: string,
  connectionId: string | null,
  findingId: string | null,
  type: string,
  target: string | null,
  status: string,
  reasoning: string,
  details: Record<string, unknown> = {},
) {
  await supabaseAdmin.from("agent_actions").insert({
    user_id: userId,
    connection_id: connectionId,
    finding_id: findingId,
    action_type: type,
    target,
    status,
    reasoning,
    details: details as Json,
  });
}

// ---------- Rule generation via Gemini ----------
async function generateRules(userId: string, connectionId: string): Promise<number> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return 0;
  const prompt = `You are designing a baseline AWS cloud intrusion detection ruleset.
Output STRICT JSON: { "rules": [ { "name": string, "description": string, "mitre_technique": string, "severity": "low|medium|high|critical", "match_event_names": string[], "match_keywords": string[] } ] }
Generate 8-10 high-signal detection rules covering: credential exfiltration, privilege escalation, log tampering, persistence, defense evasion, suspicious console logins, security group exposure, S3/KMS data access.`;

  // SECURITY: Validate AI gateway URL
  const aiGatewayUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
  if (!validateExternalUrl(aiGatewayUrl, ["ai.gateway.lovable.dev"])) {
    console.error("Invalid AI gateway URL");
    return 0;
  }

  const res = await fetch(aiGatewayUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-5",

      messages: [
        { role: "system", content: "Respond with ONLY valid JSON. No markdown, no prose." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
    }),
  });
  if (!res.ok) return 0;
  const j = await readJson(res);
  const content = chatMessageContent(j)
    .replace(/^```json\s*|\s*```$/g, "")
    .trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return 0;
  }
  const parsedRecord = asRecord(parsed);
  const rules = Array.isArray(parsedRecord.rules) ? parsedRecord.rules : [];
  if (!rules.length) return 0;
  const rows = rules.map((rule) => {
    const r = asRecord(rule);
    return {
      user_id: userId,
      connection_id: connectionId,
      name: String(r.name ?? "Unnamed rule").slice(0, 120),
      description: String(r.description ?? ""),
      mitre_technique: typeof r.mitre_technique === "string" ? r.mitre_technique : null,
      severity: String(r.severity ?? "medium").toLowerCase(),
      match_event_names: Array.isArray(r.match_event_names)
        ? r.match_event_names.map(String).slice(0, 20)
        : [],
      match_keywords: Array.isArray(r.match_keywords)
        ? r.match_keywords.map(String).slice(0, 20)
        : [],
    };
  });
  const { error } = await supabaseAdmin.from("detection_rules").insert(rows);
  if (error) return 0;
  return rows.length;
}

// ---------- SECURITY: Create approval requests for containment (human-in-the-loop) ----------
// LLM analysis cannot directly trigger AWS writes; requires explicit human approval
async function createContainmentApprovals(
  userId: string,
  conn: Tables<"aws_connections">,
): Promise<number> {
  // Look at critical findings from the last hour that name an IAM user + access key
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: critical } = await supabaseAdmin
    .from("findings")
    .select("*")
    .eq("user_id", userId)
    .eq("ai_severity", "critical")
    .gte("created_at", since);

  let created = 0;
  for (const f of critical ?? []) {
    const target = extractCompromisedKey(f);
    if (!target) continue;

    // SECURITY: Deterministic check - never block STRATA's own credentials
    // This check cannot be downgraded by LLM output
    if (conn.aws_arn?.includes(target.userName)) {
      await logAction(
        userId,
        conn.id,
        f.id,
        "approval_skip",
        target.accessKeyId,
        "skipped",
        "SECURITY: Refused to create approval for STRATA's own access key",
      );
      continue;
    }

    // Check if approval already exists
    const { data: existing } = await supabaseAdmin
      .from("pending_approvals")
      .select("id")
      .eq("user_id", userId)
      .eq("target", `${target.userName}:${target.accessKeyId}`)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) continue; // Already has pending approval

    // Create approval request
    const { error } = await supabaseAdmin.from("pending_approvals").insert({
      user_id: userId,
      action_type: "disable_access_key",
      target: `${target.userName}:${target.accessKeyId}`,
      reasoning: `Critical finding: ${f.title}. AI analysis: ${f.ai_summary}. Recommendation: ${f.ai_remediation}`,
      finding_id: f.id,
      status: "pending",
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour expiry
    });

    if (!error) {
      created++;
      await logAction(
        userId,
        conn.id,
        f.id,
        "approval_request",
        `${target.userName}:${target.accessKeyId}`,
        "success",
        "Created approval request for containment action - requires human approval to proceed",
      );

      // SECURITY: Audit log
      await writeAuditLog({
        user_id: userId,
        action: AUDIT_ACTIONS.CONTAINMENT_APPROVAL_REQUEST,
        resource_type: "iam_access_key",
        resource_id: target.accessKeyId,
        details: {
          user_name: target.userName,
          finding_title: f.title,
          ai_severity: f.ai_severity,
        },
        status: "success",
      });
    }
  }
  return created;
}

function extractCompromisedKey(
  f: Tables<"findings">,
): { userName: string; accessKeyId: string } | null {
  const raw = f.raw;
  const userName =
    f.username ??
    nestedString(raw, ["userIdentity", "userName"]) ??
    nestedString(raw, ["Resource", "AccessKeyDetails", "UserName"]);
  const accessKeyId =
    nestedString(raw, ["userIdentity", "accessKeyId"]) ??
    nestedString(raw, ["Resource", "AccessKeyDetails", "AccessKeyId"]);
  if (!userName || !accessKeyId) return null;
  return { userName, accessKeyId };
}

async function deactivateAccessKey(
  conn: Tables<"aws_connections">,
  userName: string,
  accessKeyId: string,
): Promise<boolean> {
  const body = `Action=UpdateAccessKey&UserName=${encodeURIComponent(userName)}&AccessKeyId=${encodeURIComponent(accessKeyId)}&Status=Inactive&Version=2010-05-08`;
  try {
    const signed = await signAwsRequest({
      method: "POST",
      service: "iam",
      region: "us-east-1",
      host: "iam.amazonaws.com",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      accessKeyId: conn.access_key_id,
      secretAccessKey: conn.secret_access_key,
    });
    const res = await fetch(signed.url, { method: "POST", headers: signed.headers, body });
    return res.ok;
  } catch {
    return false;
  }
}

// ---------- Incident report generation ----------
async function generateIncidentReport(userId: string, connectionId: string): Promise<boolean> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return false;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: findings } = await supabaseAdmin
    .from("findings")
    .select(
      "id,title,event_name,event_time,username,source_ip,ai_severity,ai_category,ai_summary,source,region",
    )
    .eq("user_id", userId)
    .in("ai_severity", ["high", "critical"])
    .gte("created_at", since)
    .order("event_time", { ascending: true })
    .limit(40);

  if (!findings || findings.length < 2) return false;

  // Avoid duplicating: skip if a report was already generated covering the latest finding
  const latestId = findings[findings.length - 1].id;
  const { data: existing } = await supabaseAdmin
    .from("incident_reports")
    .select("id, related_finding_ids")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing?.related_finding_ids?.includes(latestId)) return false;

  const prompt = `You are a senior incident responder. Analyze these correlated AWS security findings from the last 24h and produce a STRICT JSON incident report:
{
  "title": "concise incident title",
  "severity": "low|medium|high|critical",
  "executive_summary": "2-4 sentence summary suitable for a CISO",
  "mitre_tactics": ["TA0001", ...],
  "affected_resources": ["arn or name", ...],
  "timeline": [{ "time": "ISO", "actor": "user/ip", "event": "what happened", "significance": "why it matters" }],
  "recommendations": "concrete remediation steps as a numbered list in markdown"
}

Findings:
${JSON.stringify(findings, null, 2).slice(0, 9000)}`;

  // SECURITY: Validate AI gateway URL
  const aiGatewayUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
  if (!validateExternalUrl(aiGatewayUrl, ["ai.gateway.lovable.dev"])) {
    console.error("Invalid AI gateway URL");
    return false;
  }

  const res = await fetch(aiGatewayUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-5",
      messages: [
        { role: "system", content: "Respond with ONLY valid JSON. No markdown wrapper, no prose." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    }),
  });
  if (!res.ok) return false;
  const j = await readJson(res);
  const content = chatMessageContent(j)
    .replace(/^```json\s*|\s*```$/g, "")
    .trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return false;
  }
  const report = asRecord(parsed);

  await supabaseAdmin.from("incident_reports").insert({
    user_id: userId,
    connection_id: connectionId,
    title: String(report.title ?? "Cloud incident detected").slice(0, 200),
    severity: String(report.severity ?? "medium").toLowerCase(),
    executive_summary: String(report.executive_summary ?? ""),
    mitre_tactics: Array.isArray(report.mitre_tactics) ? report.mitre_tactics.map(String) : [],
    affected_resources: Array.isArray(report.affected_resources)
      ? report.affected_resources.map(String)
      : [],
    timeline: Array.isArray(report.timeline) ? (report.timeline as Json) : [],
    recommendations: String(report.recommendations ?? ""),
    related_finding_ids: findings.map((f) => f.id),
  });

  await logAction(
    userId,
    connectionId,
    null,
    "report",
    typeof report.title === "string" ? report.title : null,
    "success",
    "Generated AI incident report correlating recent high-severity findings",
  );
  return true;
}
