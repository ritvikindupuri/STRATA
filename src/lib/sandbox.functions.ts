// Sandbox: seed the connected AWS account with realistic mock signals so every
// part of the IDS (dashboard, timeline, findings, rules, reports) lights up
// without waiting for real CloudTrail data. Also: connect to an Elasticsearch
// cluster and pull logs from there.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { encryptSecret, decryptSecret } from "@/lib/aws/crypto";

// ---------- Mock data seeding ----------
export const seedMockData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const { data: conn } = await supabaseAdmin
      .from("aws_connections")
      .select("id, region, aws_account_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!conn) return { ok: false as const, error: "Connect AWS first" };

    const region = conn.region;
    const acct = conn.aws_account_id ?? "000000000000";
    const now = Date.now();

    const SCENARIOS = [
      {
        source: "cloudtrail", event_name: "ConsoleLogin",
        username: "alice.dev", source_ip: "203.0.113.42", user_agent: "Mozilla/5.0",
        ai_severity: "critical", ai_category: "Suspicious Login",
        title: "Root console login from new geo (Belarus)",
        ai_summary: "Root user logged in from an IP geolocated to Minsk, BY — first time this account has authenticated from that ASN. MFA was not used.",
        ai_remediation: "Force a root password rotation, enforce MFA, and review all actions performed by this session in the last hour.",
        raw: { eventName: "ConsoleLogin", userIdentity: { type: "Root", userName: "root", accessKeyId: "ASIATESTROOTKEY01" }, sourceIPAddress: "203.0.113.42", additionalEventData: { MFAUsed: "No" } },
      },
      {
        source: "cloudtrail", event_name: "CreateAccessKey",
        username: "alice.dev", source_ip: "203.0.113.42",
        ai_severity: "critical", ai_category: "Persistence",
        title: "New long-lived access key minted for high-privilege IAM user",
        ai_summary: "A new programmatic access key was created for IAM user 'alice.dev' (AdministratorAccess) from the same IP that performed the suspicious console login 4 minutes earlier.",
        ai_remediation: "Disable the new key, rotate alice.dev's credentials, and audit CloudTrail for any API calls that used the new key.",
        raw: { eventName: "CreateAccessKey", userIdentity: { userName: "alice.dev", accessKeyId: "AKIATESTALICE0001" }, requestParameters: { userName: "alice.dev" }, responseElements: { accessKey: { accessKeyId: "AKIATEST0002COMPRO" } } },
      },
      {
        source: "guardduty", event_name: "UnauthorizedAccess:IAMUser/ConsoleLoginSuccess.B",
        username: "alice.dev", source_ip: "203.0.113.42",
        ai_severity: "high", ai_category: "Suspicious Login",
        title: "GuardDuty: anomalous console login pattern",
        ai_summary: "GuardDuty flagged this login as inconsistent with the IAM user's historical behavior (new ASN, new user agent, off-hours).",
        ai_remediation: "Correlate with the matching CloudTrail event; if not legitimate, suspend the user and revoke active sessions.",
        raw: { Id: "gd-mock-001", Type: "UnauthorizedAccess:IAMUser/ConsoleLoginSuccess.B", Severity: 8, Resource: { AccessKeyDetails: { UserName: "alice.dev", AccessKeyId: "AKIATESTALICE0001" } } },
      },
      {
        source: "cloudtrail", event_name: "StopLogging",
        username: "alice.dev", source_ip: "203.0.113.42",
        ai_severity: "critical", ai_category: "Defense Evasion",
        title: "CloudTrail logging stopped on primary audit trail",
        ai_summary: "The 'org-audit-trail' was disabled, blinding detection in this region. Classic anti-forensics step in a kill chain.",
        ai_remediation: "Immediately re-enable the trail, lock the trail with an SCP that denies cloudtrail:StopLogging, and treat the account as compromised.",
        raw: { eventName: "StopLogging", requestParameters: { name: "org-audit-trail" }, userIdentity: { userName: "alice.dev" } },
      },
      {
        source: "cloudtrail", event_name: "AuthorizeSecurityGroupIngress",
        username: "alice.dev", source_ip: "203.0.113.42",
        ai_severity: "high", ai_category: "Network Exposure",
        title: "Security group opened SSH (22) to 0.0.0.0/0",
        ai_summary: "Inbound rule added to sg-prod-app allowing SSH from the entire internet — high blast radius for compromised production hosts.",
        ai_remediation: "Revoke the rule, restrict to known bastion CIDRs, and require approval workflows for SG changes via SCP.",
        raw: { eventName: "AuthorizeSecurityGroupIngress", requestParameters: { groupId: "sg-prod-app", ipPermissions: { items: [{ ipProtocol: "tcp", fromPort: 22, toPort: 22, ipRanges: { items: [{ cidrIp: "0.0.0.0/0" }] } }] } } },
      },
      {
        source: "cloudtrail", event_name: "GetSecretValue",
        username: "alice.dev", source_ip: "203.0.113.42",
        ai_severity: "high", ai_category: "Data Exfiltration",
        title: "Bulk Secrets Manager reads (32 secrets in 90s)",
        ai_summary: "Same identity enumerated and read 32 secrets in rapid succession, including 'prod/db/master' and 'stripe/live'.",
        ai_remediation: "Rotate every secret accessed in that window and add anomaly detection on secretsmanager:GetSecretValue volume.",
        raw: { eventName: "GetSecretValue", requestParameters: { secretId: "arn:aws:secretsmanager:us-east-1:" + acct + ":secret:prod/db/master" } },
      },
      {
        source: "cloudtrail", event_name: "PutBucketPolicy",
        username: "ops.bot", source_ip: "10.0.5.12",
        ai_severity: "medium", ai_category: "Misconfiguration",
        title: "S3 bucket policy widened to AllowAll Principal",
        ai_summary: "Bucket policy on 'analytics-exports' now permits s3:GetObject for Principal '*' without a Condition block.",
        ai_remediation: "Restore the previous policy and require a least-privilege Condition (aws:SourceVpce or aws:PrincipalOrgID).",
        raw: { eventName: "PutBucketPolicy", requestParameters: { bucketName: "analytics-exports" } },
      },
      {
        source: "cloudtrail", event_name: "AssumeRole",
        username: "ci-deployer", source_ip: "52.10.20.30",
        ai_severity: "low", ai_category: "Benign",
        title: "CI role assumed for scheduled deploy",
        ai_summary: "Expected AssumeRole from the CI pipeline; matches historical baseline.",
        ai_remediation: "No action required.",
        raw: { eventName: "AssumeRole", requestParameters: { roleArn: `arn:aws:iam::${acct}:role/ci-deployer` } },
      },
      {
        source: "cloudtrail", event_name: "CreateUser",
        username: "alice.dev", source_ip: "203.0.113.42",
        ai_severity: "high", ai_category: "Persistence",
        title: "New IAM user 'backup-svc' created outside of IaC",
        ai_summary: "IAM user was created directly via the console rather than the Terraform pipeline — does not match any active change ticket.",
        ai_remediation: "Delete the user, restrict iam:CreateUser to the deploy role, and require change-ticket annotation in CloudTrail.",
        raw: { eventName: "CreateUser", requestParameters: { userName: "backup-svc" } },
      },
      {
        source: "guardduty", event_name: "Recon:IAMUser/MaliciousIPCaller.Custom",
        username: "backup-svc", source_ip: "198.51.100.7",
        ai_severity: "medium", ai_category: "Recon",
        title: "GuardDuty: API calls from threat-intel-listed IP",
        ai_summary: "The newly created IAM user immediately enumerated permissions from an IP listed in a threat-intel feed.",
        ai_remediation: "Disable backup-svc, block the source IP at the network edge, and review attached policies.",
        raw: { Id: "gd-mock-002", Type: "Recon:IAMUser/MaliciousIPCaller.Custom", Severity: 5 },
      },
    ];

    const rows = SCENARIOS.map((s, i) => ({
      user_id: userId,
      connection_id: conn.id,
      source: s.source,
      external_id: `mock-${now}-${i}`,
      event_name: s.event_name,
      event_time: new Date(now - (SCENARIOS.length - i) * 4 * 60 * 1000).toISOString(),
      region,
      username: s.username,
      source_ip: s.source_ip,
      user_agent: s.user_agent ?? null,
      severity: null,
      title: s.title,
      raw: s.raw,
      ai_severity: s.ai_severity,
      ai_category: s.ai_category,
      ai_summary: s.ai_summary,
      ai_remediation: s.ai_remediation,
      ai_analyzed_at: new Date().toISOString(),
    }));

    const { error: findingsErr } = await supabaseAdmin.from("findings").insert(rows);
    if (findingsErr) return { ok: false as const, error: findingsErr.message };

    // Detection rules (mock baseline if none exist)
    const { data: ruleCount } = await supabaseAdmin
      .from("detection_rules").select("id").eq("user_id", userId).limit(1);
    let rulesCreated = 0;
    if (!ruleCount?.length) {
      const ruleRows = [
        { name: "Root console login", description: "Any console login by the root account is critical.", mitre_technique: "T1078.004", severity: "critical", match_event_names: ["ConsoleLogin"], match_keywords: ["Root"] },
        { name: "CloudTrail tampering", description: "Disabling or deleting trails is a defense-evasion signal.", mitre_technique: "T1562.008", severity: "critical", match_event_names: ["StopLogging", "DeleteTrail"], match_keywords: [] },
        { name: "Public security group ingress", description: "Inbound 0.0.0.0/0 on sensitive ports.", mitre_technique: "T1133", severity: "high", match_event_names: ["AuthorizeSecurityGroupIngress"], match_keywords: ["0.0.0.0/0"] },
        { name: "Bulk Secrets Manager reads", description: "Rapid enumeration of secrets values.", mitre_technique: "T1552.007", severity: "high", match_event_names: ["GetSecretValue"], match_keywords: [] },
        { name: "Out-of-band IAM user creation", description: "IAM users created outside the deploy pipeline.", mitre_technique: "T1136.003", severity: "high", match_event_names: ["CreateUser"], match_keywords: [] },
      ].map((r) => ({ ...r, user_id: userId, connection_id: conn.id, generated_by: "sandbox", enabled: true }));
      const { error: rulesErr } = await supabaseAdmin.from("detection_rules").insert(ruleRows);
      if (!rulesErr) rulesCreated = ruleRows.length;
    }

    // Pre-built incident report tying the attack chain together
    const insertedIds = (await supabaseAdmin.from("findings").select("id, ai_severity")
      .eq("user_id", userId).eq("connection_id", conn.id)
      .in("ai_severity", ["high", "critical"]).order("created_at", { ascending: false }).limit(8)).data ?? [];

    if (insertedIds.length) {
      await supabaseAdmin.from("incident_reports").insert({
        user_id: userId,
        connection_id: conn.id,
        title: "Account takeover via compromised IAM credentials",
        severity: "critical",
        executive_summary: "An attacker authenticated as root from a previously-unseen geography, minted new long-lived access keys, disabled CloudTrail, opened production SSH to the internet, and bulk-read Secrets Manager. The chain has the hallmarks of credential-stuffing followed by hands-on-keyboard escalation.",
        mitre_tactics: ["TA0001", "TA0003", "TA0005", "TA0006", "TA0010"],
        affected_resources: [`arn:aws:iam::${acct}:user/alice.dev`, "org-audit-trail", "sg-prod-app", "secret:prod/db/master"],
        timeline: rows.slice(0, 6).map((r) => ({
          time: r.event_time, actor: `${r.username} (${r.source_ip})`,
          event: r.title, significance: r.ai_summary,
        })),
        recommendations: "1. **Rotate** root credentials and every secret accessed in the window.\n2. **Disable** alice.dev and the new access keys.\n3. **Re-enable** CloudTrail and lock it with an SCP.\n4. **Revoke** the public SG ingress rule.\n5. **Force** MFA for all human IAM users and migrate workloads to IAM Identity Center.",
        related_finding_ids: insertedIds.map((f) => f.id),
      });
    }

    await supabaseAdmin.from("aws_connections")
      .update({ mock_data_seeded_at: new Date().toISOString() })
      .eq("id", conn.id);

    await supabaseAdmin.from("agent_actions").insert({
      user_id: userId, connection_id: conn.id, action_type: "seed",
      target: "sandbox", status: "success",
      reasoning: `Seeded ${rows.length} mock findings, ${rulesCreated} baseline rules and 1 incident report for testing.`,
      details: { findings: rows.length, rules: rulesCreated },
    });

    return { ok: true as const, findings: rows.length, rules: rulesCreated, report: 1 };
  });

export const clearMockData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    // Only purge mock rows — keyed by source 'sandbox' rules and external_id prefix
    await supabaseAdmin.from("findings").delete()
      .eq("user_id", userId).like("external_id", "mock-%");
    await supabaseAdmin.from("detection_rules").delete()
      .eq("user_id", userId).eq("generated_by", "sandbox");
    await supabaseAdmin.from("aws_connections")
      .update({ mock_data_seeded_at: null }).eq("user_id", userId);
    return { ok: true as const };
  });

// ---------- Elasticsearch connection ----------
const EsSchema = z.object({
  endpoint: z.string().trim().url().max(500),
  apiKey: z.string().trim().min(8).max(2000),
  index: z.string().trim().min(1).max(120).default("cloudtrail-*"),
});

export const connectElasticsearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => EsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const endpoint = data.endpoint.replace(/\/+$/, "");
    // Validate by hitting /_cluster/health
    try {
      const res = await fetch(`${endpoint}/_cluster/health`, {
        headers: { Authorization: `ApiKey ${data.apiKey}` },
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        return { ok: false as const, error: `Elasticsearch returned ${res.status}: ${t.slice(0, 200)}` };
      }
      const health: any = await res.json().catch(() => ({}));

      // Upsert into the AWS connection row (one cluster per user for now)
      const { data: conn } = await supabaseAdmin.from("aws_connections")
        .select("id").eq("user_id", context.userId).maybeSingle();
      if (!conn) return { ok: false as const, error: "Connect AWS first — Elasticsearch attaches to a connection." };

      await supabaseAdmin.from("aws_connections").update({
        es_endpoint: endpoint,
        es_index: data.index,
        es_api_key_encrypted: encryptSecret(data.apiKey),
      }).eq("id", conn.id);

      await supabaseAdmin.from("agent_actions").insert({
        user_id: context.userId, connection_id: conn.id, action_type: "es_connect",
        target: endpoint, status: "success",
        reasoning: `Connected Elasticsearch cluster (status: ${health.status ?? "unknown"}, nodes: ${health.number_of_nodes ?? "?"}).`,
        details: { cluster_name: health.cluster_name, status: health.status, nodes: health.number_of_nodes },
      });

      return { ok: true as const, cluster: health.cluster_name, status: health.status, nodes: health.number_of_nodes };
    } catch (e: any) {
      return { ok: false as const, error: `Cannot reach cluster: ${e.message}` };
    }
  });

export const disconnectElasticsearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await supabaseAdmin.from("aws_connections").update({
      es_endpoint: null, es_api_key_encrypted: null,
    }).eq("user_id", context.userId);
    return { ok: true as const };
  });

export const syncFromElasticsearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: conn } = await supabaseAdmin.from("aws_connections")
      .select("id, region, es_endpoint, es_index, es_api_key_encrypted")
      .eq("user_id", context.userId).maybeSingle();
    if (!conn?.es_endpoint || !conn.es_api_key_encrypted) {
      return { ok: false as const, error: "No Elasticsearch cluster connected" };
    }
    let apiKey: string;
    try { apiKey = decryptSecret(conn.es_api_key_encrypted); }
    catch { return { ok: false as const, error: "Cannot decrypt ES key — reconnect cluster" }; }

    const query = {
      size: 50,
      sort: [{ "@timestamp": { order: "desc" } }],
      query: { range: { "@timestamp": { gte: "now-24h" } } },
    };
    const res = await fetch(`${conn.es_endpoint}/${encodeURIComponent(conn.es_index ?? "cloudtrail-*")}/_search`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `ApiKey ${apiKey}` },
      body: JSON.stringify(query),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { ok: false as const, error: `ES ${res.status}: ${t.slice(0, 200)}` };
    }
    const j: any = await res.json();
    const hits: any[] = j?.hits?.hits ?? [];
    let inserted = 0;
    for (const h of hits) {
      const src = h._source ?? {};
      const row = {
        user_id: context.userId,
        connection_id: conn.id,
        source: "elasticsearch",
        external_id: h._id,
        event_name: src.eventName ?? src.event?.action ?? "es_event",
        event_time: src["@timestamp"] ?? src.eventTime ?? new Date().toISOString(),
        region: src.awsRegion ?? conn.region,
        username: src.userIdentity?.userName ?? src.user?.name ?? null,
        source_ip: src.sourceIPAddress ?? src.source?.ip ?? null,
        user_agent: src.userAgent ?? src.user_agent?.original ?? null,
        severity: null,
        title: src.eventName ?? src.message?.slice(0, 80) ?? "Elasticsearch event",
        raw: src,
      };
      const { error } = await supabaseAdmin.from("findings")
        .upsert(row, { onConflict: "connection_id,source,external_id" });
      if (!error) inserted++;
    }
    await supabaseAdmin.from("agent_actions").insert({
      user_id: context.userId, connection_id: conn.id, action_type: "es_sync",
      target: conn.es_index, status: "success",
      reasoning: `Pulled ${inserted} events from Elasticsearch index ${conn.es_index}`,
      details: { inserted, total_hits: j?.hits?.total?.value ?? hits.length },
    });
    return { ok: true as const, inserted, total: j?.hits?.total?.value ?? hits.length };
  });
