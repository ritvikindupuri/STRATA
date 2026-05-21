import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { signAwsRequest } from "@/lib/aws/sigv4";
import { encryptSecret, decryptSecret } from "@/lib/aws/crypto";

const REGIONS = [
  "us-east-1", "us-east-2", "us-west-1", "us-west-2",
  "eu-west-1", "eu-central-1", "ap-southeast-1", "ap-southeast-2",
  "ap-northeast-1", "sa-east-1", "ca-central-1",
] as const;

// ---------- Validate + save credentials ----------
const SaveSchema = z.object({
  label: z.string().trim().min(1).max(60).default("Primary AWS Account"),
  region: z.enum(REGIONS),
  accessKeyId: z.string().trim().regex(/^[A-Z0-9]{16,32}$/, "Invalid AWS Access Key ID format"),
  secretAccessKey: z.string().trim().min(20).max(128),
});

export const saveAwsConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // STS GetCallerIdentity — real AWS call to validate credentials
    const body = "Action=GetCallerIdentity&Version=2011-06-15";
    const signed = await signAwsRequest({
      method: "POST",
      service: "sts",
      region: data.region,
      host: "sts.amazonaws.com",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      accessKeyId: data.accessKeyId,
      secretAccessKey: data.secretAccessKey,
    });

    const res = await fetch(signed.url, { method: "POST", headers: signed.headers, body });
    const text = await res.text();

    if (!res.ok) {
      const msg = extractAwsError(text) || `STS returned HTTP ${res.status}`;
      return { ok: false as const, error: msg };
    }

    const accountId = /<Account>([^<]+)<\/Account>/.exec(text)?.[1] ?? null;
    const arn = /<Arn>([^<]+)<\/Arn>/.exec(text)?.[1] ?? null;

    // Upsert connection (one per user for now)
    const { data: existing } = await supabaseAdmin
      .from("aws_connections")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    const payload = {
      user_id: userId,
      label: data.label,
      region: data.region,
      access_key_id: data.accessKeyId,
      secret_access_key: data.secretAccessKey,
      aws_account_id: accountId,
      aws_arn: arn,
      status: "connected" as const,
      last_validated_at: new Date().toISOString(),
      last_error: null,
    };

    if (existing) {
      const { error } = await supabaseAdmin.from("aws_connections").update(payload).eq("id", existing.id);
      if (error) return { ok: false as const, error: error.message };
      return { ok: true as const, accountId, arn, connectionId: existing.id };
    } else {
      const { data: ins, error } = await supabaseAdmin.from("aws_connections").insert(payload).select("id").single();
      if (error) return { ok: false as const, error: error.message };
      return { ok: true as const, accountId, arn, connectionId: ins.id };
    }
  });

// ---------- Re-validate existing connection ----------
export const revalidateAwsConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const conn = await loadConnection(context.userId);
    if (!conn) return { ok: false as const, error: "No AWS connection configured" };

    const body = "Action=GetCallerIdentity&Version=2011-06-15";
    const signed = await signAwsRequest({
      method: "POST", service: "sts", region: conn.region, host: "sts.amazonaws.com",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body, accessKeyId: conn.access_key_id, secretAccessKey: conn.secret_access_key,
    });
    const res = await fetch(signed.url, { method: "POST", headers: signed.headers, body });
    const text = await res.text();
    if (!res.ok) return { ok: false as const, error: extractAwsError(text) || `HTTP ${res.status}` };
    return { ok: true as const, accountId: conn.aws_account_id, arn: conn.aws_arn };
  });

// ---------- Disconnect ----------
export const disconnectAws = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await supabaseAdmin.from("aws_connections").delete().eq("user_id", context.userId);
    return { ok: true as const };
  });

// ---------- Sync: fetch CloudTrail events + GuardDuty findings, analyze with AI, store ----------
export const syncFindings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const conn = await loadConnection(context.userId);
    if (!conn) return { ok: false as const, error: "No AWS connection configured" };

    const results = { cloudtrail: 0, guardduty: 0, analyzed: 0, errors: [] as string[] };

    // ---- CloudTrail LookupEvents (last 24h, up to 50) ----
    try {
      const ctBody = JSON.stringify({
        MaxResults: 50,
        StartTime: Math.floor((Date.now() - 24 * 3600 * 1000) / 1000),
        EndTime: Math.floor(Date.now() / 1000),
      });
      const ctSigned = await signAwsRequest({
        method: "POST", service: "cloudtrail", region: conn.region,
        host: `cloudtrail.${conn.region}.amazonaws.com`,
        headers: {
          "content-type": "application/x-amz-json-1.1",
          "x-amz-target": "CloudTrail_20131101.LookupEvents",
        },
        body: ctBody,
        accessKeyId: conn.access_key_id, secretAccessKey: conn.secret_access_key,
      });
      const ctRes = await fetch(ctSigned.url, { method: "POST", headers: ctSigned.headers, body: ctBody });
      const ctJson: any = await ctRes.json().catch(() => ({}));
      if (!ctRes.ok) results.errors.push(`CloudTrail: ${ctJson?.Message || ctRes.status}`);
      else {
        for (const ev of ctJson.Events ?? []) {
          const parsed = safeJson(ev.CloudTrailEvent);
          const row = {
            user_id: context.userId,
            connection_id: conn.id,
            source: "cloudtrail",
            external_id: ev.EventId,
            event_name: ev.EventName,
            event_time: new Date((ev.EventTime ?? 0) * 1000).toISOString(),
            region: parsed?.awsRegion ?? conn.region,
            username: ev.Username ?? parsed?.userIdentity?.userName ?? null,
            source_ip: parsed?.sourceIPAddress ?? null,
            user_agent: parsed?.userAgent ?? null,
            severity: null,
            title: ev.EventName,
            raw: parsed ?? ev,
          };
          const { data: inserted } = await supabaseAdmin
            .from("findings")
            .upsert(row, { onConflict: "connection_id,source,external_id", ignoreDuplicates: false })
            .select("id, ai_analyzed_at, event_name, source_ip, username, raw")
            .single();
          if (inserted) {
            results.cloudtrail++;
            if (!inserted.ai_analyzed_at && shouldAnalyzeCloudTrail(ev.EventName)) {
              await analyzeAndStore(inserted.id, inserted);
              results.analyzed++;
            }
          }
        }
      }
    } catch (e: any) {
      results.errors.push(`CloudTrail: ${e.message}`);
    }

    // ---- GuardDuty: list detectors then list findings (best-effort; skip if not enabled) ----
    try {
      const detSigned = await signAwsRequest({
        method: "GET", service: "guardduty", region: conn.region,
        host: `guardduty.${conn.region}.amazonaws.com`,
        path: "/detector",
        accessKeyId: conn.access_key_id, secretAccessKey: conn.secret_access_key,
      });
      const detRes = await fetch(detSigned.url, { headers: detSigned.headers });
      const detJson: any = await detRes.json().catch(() => ({}));
      if (detRes.ok && Array.isArray(detJson.DetectorIds)) {
        for (const detectorId of detJson.DetectorIds) {
          const listSigned = await signAwsRequest({
            method: "POST", service: "guardduty", region: conn.region,
            host: `guardduty.${conn.region}.amazonaws.com`,
            path: `/detector/${detectorId}/findings`,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ MaxResults: 50 }),
            accessKeyId: conn.access_key_id, secretAccessKey: conn.secret_access_key,
          });
          const listRes = await fetch(listSigned.url, { method: "POST", headers: listSigned.headers, body: JSON.stringify({ MaxResults: 50 }) });
          const listJson: any = await listRes.json().catch(() => ({}));
          const ids: string[] = listJson.FindingIds ?? [];
          if (!ids.length) continue;
          const getBody = JSON.stringify({ FindingIds: ids });
          const getSigned = await signAwsRequest({
            method: "POST", service: "guardduty", region: conn.region,
            host: `guardduty.${conn.region}.amazonaws.com`,
            path: `/detector/${detectorId}/findings/get`,
            headers: { "content-type": "application/json" },
            body: getBody,
            accessKeyId: conn.access_key_id, secretAccessKey: conn.secret_access_key,
          });
          const getRes = await fetch(getSigned.url, { method: "POST", headers: getSigned.headers, body: getBody });
          const getJson: any = await getRes.json().catch(() => ({}));
          for (const f of getJson.Findings ?? []) {
            const row = {
              user_id: context.userId,
              connection_id: conn.id,
              source: "guardduty",
              external_id: f.Id,
              event_name: f.Type,
              event_time: f.UpdatedAt ?? f.CreatedAt ?? new Date().toISOString(),
              region: f.Region ?? conn.region,
              username: f.Resource?.AccessKeyDetails?.UserName ?? null,
              source_ip: f.Service?.Action?.NetworkConnectionAction?.RemoteIpDetails?.IpAddressV4 ?? null,
              user_agent: null,
              severity: f.Severity,
              title: f.Title,
              raw: f,
            };
            const { data: inserted } = await supabaseAdmin
              .from("findings")
              .upsert(row, { onConflict: "connection_id,source,external_id" })
              .select("id, ai_analyzed_at, event_name, title, raw")
              .single();
            if (inserted) {
              results.guardduty++;
              if (!inserted.ai_analyzed_at) {
                await analyzeAndStore(inserted.id, inserted);
                results.analyzed++;
              }
            }
          }
        }
      }
    } catch (e: any) {
      results.errors.push(`GuardDuty: ${e.message}`);
    }

    return { ok: true as const, ...results };
  });

// ---------- helpers ----------
async function loadConnection(userId: string) {
  const { data } = await supabaseAdmin
    .from("aws_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

function safeJson(s: any) {
  if (!s) return null;
  if (typeof s !== "string") return s;
  try { return JSON.parse(s); } catch { return null; }
}

function extractAwsError(text: string): string | null {
  const m = /<Message>([^<]+)<\/Message>/.exec(text);
  if (m) return m[1];
  try {
    const j = JSON.parse(text);
    return j.Message || j.message || j.__type || null;
  } catch { return null; }
}

function shouldAnalyzeCloudTrail(eventName: string): boolean {
  // Focus AI budget on security-relevant events
  const watch = [
    "ConsoleLogin", "AssumeRole", "CreateUser", "CreateAccessKey", "DeleteTrail",
    "StopLogging", "PutBucketPolicy", "PutBucketAcl", "AuthorizeSecurityGroupIngress",
    "AuthorizeSecurityGroupEgress", "CreatePolicy", "AttachUserPolicy", "AttachRolePolicy",
    "PassRole", "DeactivateMFADevice", "DeleteUserPolicy", "UpdateAssumeRolePolicy",
    "RunInstances", "TerminateInstances", "CreateLoginProfile", "UpdateLoginProfile",
    "PutUserPolicy", "PutRolePolicy", "GetSecretValue", "Decrypt", "Invoke",
  ];
  return watch.some((w) => eventName?.includes(w));
}

async function analyzeAndStore(findingId: string, row: any) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return;
  const prompt = `You are a senior cloud security analyst. Analyze this AWS security event and return strict JSON:
{
 "severity": "low|medium|high|critical",
 "category": "short label like 'Privilege Escalation', 'Suspicious Login', 'Data Exfiltration', 'Config Tampering', 'Recon', 'Benign'",
 "summary": "2-3 sentence plain-English explanation of what happened and why it matters",
 "remediation": "concrete action the operator should take, 1-3 sentences"
}

Event:
${JSON.stringify(row.raw ?? row, null, 2).slice(0, 6000)}`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a precise cloud security analyst. Respond with ONLY valid JSON, no markdown, no prose." },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
      }),
    });
    if (!res.ok) return;
    const j: any = await res.json();
    const content = j?.choices?.[0]?.message?.content ?? "";
    const clean = content.replace(/^```json\s*|\s*```$/g, "").trim();
    const parsed = JSON.parse(clean);
    await supabaseAdmin.from("findings").update({
      ai_severity: String(parsed.severity ?? "low").toLowerCase(),
      ai_category: parsed.category ?? "Unknown",
      ai_summary: parsed.summary ?? "",
      ai_remediation: parsed.remediation ?? "",
      ai_analyzed_at: new Date().toISOString(),
    }).eq("id", findingId);
  } catch {
    // best-effort
  }
}
