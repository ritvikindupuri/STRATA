// Autonomous IDS agent. Runs the full loop: generate rules → sync events →
// triage with AI → execute response actions → cluster findings into incident
// reports. Every step is logged to agent_actions.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { signAwsRequest } from "@/lib/aws/sigv4";
import { decryptSecret } from "@/lib/aws/crypto";
import { syncFindings } from "@/lib/aws.functions";

// ---------- Public entry: run the full autonomous cycle ----------
export const runAutopilot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const conn = await loadConnection(userId);
    if (!conn) return { ok: false as const, error: "No AWS connection configured" };

    const { data: run } = await supabaseAdmin
      .from("agent_runs")
      .insert({ user_id: userId, connection_id: conn.id, status: "running" })
      .select("id")
      .single();
    const runId = run?.id;
    const errors: string[] = [];
    const stats = { rules_created: 0, events_synced: 0, blocked: 0, reports: 0 };

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
        await logAction(userId, conn.id, null, "rule_create", "ruleset", "success",
          `Generated ${created} AI detection rules tailored to this AWS account`);
      }
    } catch (e: any) { errors.push(`rules: ${e.message}`); }

    // 2. SYNC — pull CloudTrail + GuardDuty (existing function, AI-analyzed)
    try {
      const syncRes: any = await (syncFindings as any)({});
      if (syncRes?.ok) {
        stats.events_synced = (syncRes.cloudtrail ?? 0) + (syncRes.guardduty ?? 0);
      } else if (syncRes?.error) errors.push(`sync: ${syncRes.error}`);
    } catch (e: any) { errors.push(`sync: ${e.message}`); }

    // 3. CONTAINMENT — auto-respond to critical IAM-key findings
    if (conn.auto_response_enabled) {
      try {
        stats.blocked = await autoContain(userId, conn);
      } catch (e: any) { errors.push(`contain: ${e.message}`); }
    }

    // 4. REPORT — cluster recent high/critical findings into an incident report
    try {
      const created = await generateIncidentReport(userId, conn.id);
      if (created) stats.reports = 1;
    } catch (e: any) { errors.push(`report: ${e.message}`); }

    if (runId) {
      await supabaseAdmin.from("agent_runs").update({
        status: errors.length ? "completed_with_errors" : "completed",
        stats, errors, finished_at: new Date().toISOString(),
      }).eq("id", runId);
    }

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
    await supabaseAdmin.from("aws_connections")
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
    ? safeDecrypt(data.encrypted_secret) ?? data.secret_access_key
    : data.secret_access_key;
  return { ...data, secret_access_key: secret };
}

function safeDecrypt(payload: string): string | null {
  try { return decryptSecret(payload); } catch { return null; }
}

async function logAction(
  userId: string, connectionId: string | null, findingId: string | null,
  type: string, target: string | null, status: string, reasoning: string,
  details: Record<string, any> = {},
) {
  await supabaseAdmin.from("agent_actions").insert({
    user_id: userId, connection_id: connectionId, finding_id: findingId,
    action_type: type, target, status, reasoning, details,
  });
}

// ---------- Rule generation via Gemini ----------
async function generateRules(userId: string, connectionId: string): Promise<number> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return 0;
  const prompt = `You are designing a baseline AWS cloud intrusion detection ruleset.
Output STRICT JSON: { "rules": [ { "name": string, "description": string, "mitre_technique": string, "severity": "low|medium|high|critical", "match_event_names": string[], "match_keywords": string[] } ] }
Generate 8-10 high-signal detection rules covering: credential exfiltration, privilege escalation, log tampering, persistence, defense evasion, suspicious console logins, security group exposure, S3/KMS data access.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
  const j: any = await res.json();
  const content = (j?.choices?.[0]?.message?.content ?? "").replace(/^```json\s*|\s*```$/g, "").trim();
  let parsed: any;
  try { parsed = JSON.parse(content); } catch { return 0; }
  const rules = Array.isArray(parsed?.rules) ? parsed.rules : [];
  if (!rules.length) return 0;
  const rows = rules.map((r: any) => ({
    user_id: userId,
    connection_id: connectionId,
    name: String(r.name ?? "Unnamed rule").slice(0, 120),
    description: String(r.description ?? ""),
    mitre_technique: r.mitre_technique ?? null,
    severity: String(r.severity ?? "medium").toLowerCase(),
    match_event_names: Array.isArray(r.match_event_names) ? r.match_event_names.slice(0, 20) : [],
    match_keywords: Array.isArray(r.match_keywords) ? r.match_keywords.slice(0, 20) : [],
  }));
  const { error } = await supabaseAdmin.from("detection_rules").insert(rows);
  if (error) return 0;
  return rows.length;
}

// ---------- Auto-containment: deactivate compromised access keys ----------
async function autoContain(userId: string, conn: any): Promise<number> {
  // Look at critical findings from the last hour that name an IAM user + access key
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: critical } = await supabaseAdmin
    .from("findings")
    .select("*")
    .eq("user_id", userId)
    .eq("ai_severity", "critical")
    .gte("created_at", since);

  let blocked = 0;
  for (const f of critical ?? []) {
    const target = extractCompromisedKey(f);
    if (!target) continue;
    // Avoid blocking the IAM user Strata itself uses
    if (conn.aws_arn?.includes(target.userName)) {
      await logAction(userId, conn.id, f.id, "block", target.accessKeyId, "skipped",
        "Refused to disable Strata's own access key");
      continue;
    }
    const ok = await deactivateAccessKey(conn, target.userName, target.accessKeyId);
    await logAction(userId, conn.id, f.id, "block", `${target.userName}:${target.accessKeyId}`,
      ok ? "success" : "failed",
      ok ? `Deactivated compromised access key for IAM user ${target.userName}` : `Failed to disable access key — verify iam:UpdateAccessKey permission`);
    if (ok) blocked++;
  }
  return blocked;
}

function extractCompromisedKey(f: any): { userName: string; accessKeyId: string } | null {
  const raw = f.raw ?? {};
  const userName = f.username ?? raw?.userIdentity?.userName ?? raw?.Resource?.AccessKeyDetails?.UserName;
  const accessKeyId = raw?.userIdentity?.accessKeyId ?? raw?.Resource?.AccessKeyDetails?.AccessKeyId;
  if (!userName || !accessKeyId) return null;
  return { userName, accessKeyId };
}

async function deactivateAccessKey(conn: any, userName: string, accessKeyId: string): Promise<boolean> {
  const body = `Action=UpdateAccessKey&UserName=${encodeURIComponent(userName)}&AccessKeyId=${encodeURIComponent(accessKeyId)}&Status=Inactive&Version=2010-05-08`;
  try {
    const signed = await signAwsRequest({
      method: "POST", service: "iam", region: "us-east-1", host: "iam.amazonaws.com",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      accessKeyId: conn.access_key_id, secretAccessKey: conn.secret_access_key,
    });
    const res = await fetch(signed.url, { method: "POST", headers: signed.headers, body });
    return res.ok;
  } catch { return false; }
}

// ---------- Incident report generation ----------
async function generateIncidentReport(userId: string, connectionId: string): Promise<boolean> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return false;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: findings } = await supabaseAdmin
    .from("findings")
    .select("id,title,event_name,event_time,username,source_ip,ai_severity,ai_category,ai_summary,source,region")
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

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Respond with ONLY valid JSON. No markdown wrapper, no prose." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    }),
  });
  if (!res.ok) return false;
  const j: any = await res.json();
  const content = (j?.choices?.[0]?.message?.content ?? "").replace(/^```json\s*|\s*```$/g, "").trim();
  let parsed: any;
  try { parsed = JSON.parse(content); } catch { return false; }

  await supabaseAdmin.from("incident_reports").insert({
    user_id: userId,
    connection_id: connectionId,
    title: String(parsed.title ?? "Cloud incident detected").slice(0, 200),
    severity: String(parsed.severity ?? "medium").toLowerCase(),
    executive_summary: String(parsed.executive_summary ?? ""),
    mitre_tactics: Array.isArray(parsed.mitre_tactics) ? parsed.mitre_tactics : [],
    affected_resources: Array.isArray(parsed.affected_resources) ? parsed.affected_resources : [],
    timeline: Array.isArray(parsed.timeline) ? parsed.timeline : [],
    recommendations: String(parsed.recommendations ?? ""),
    related_finding_ids: findings.map((f) => f.id),
  });

  await logAction(userId, connectionId, null, "report", parsed.title ?? null, "success",
    "Generated AI incident report correlating recent high-severity findings");
  return true;
}
