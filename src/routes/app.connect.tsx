import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { saveAwsConnection, revalidateAwsConnection, disconnectAws } from "@/lib/aws.functions";
import { setAutoResponse, runAutopilot } from "@/lib/agent.functions";
import { seedMockData, clearMockData, connectElasticsearch, disconnectElasticsearch, syncFromElasticsearch } from "@/lib/sandbox.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, Copy, ExternalLink, AlertCircle, Trash2, FlaskConical, Database, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/app/connect")({ component: ConnectAws });

const REGIONS = [
  "us-east-1", "us-east-2", "us-west-1", "us-west-2",
  "eu-west-1", "eu-central-1", "ap-southeast-1", "ap-southeast-2",
  "ap-northeast-1", "sa-east-1", "ca-central-1",
];

type SafeConn = {
  id: string; status: string; aws_account_id: string | null; aws_arn: string | null;
  region: string; last_validated_at: string | null; auto_response_enabled: boolean;
  es_endpoint: string | null; es_index: string | null; es_connected: boolean;
  mock_data_seeded_at: string | null;
};

function ConnectAws() {
  const save = useServerFn(saveAwsConnection);
  const revalidate = useServerFn(revalidateAwsConnection);
  const disconnect = useServerFn(disconnectAws);
  const autopilot = useServerFn(runAutopilot);
  const seed = useServerFn(seedMockData);
  const clear = useServerFn(clearMockData);
  const esConnect = useServerFn(connectElasticsearch);
  const esDisconnect = useServerFn(disconnectElasticsearch);
  const esSync = useServerFn(syncFromElasticsearch);

  const conn = useQuery({
    queryKey: ["aws-conn"],
    queryFn: async (): Promise<SafeConn | null> => {
      const { data } = await (supabase as any).rpc("my_aws_connection");
      return (Array.isArray(data) && data.length ? data[0] : null) as SafeConn | null;
    },
  });
  const c = conn.data;

  const [label, setLabel] = useState("Primary AWS Account");
  const [region, setRegion] = useState("us-east-1");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [esEndpoint, setEsEndpoint] = useState("");
  const [esApiKey, setEsApiKey] = useState("");
  const [esIndex, setEsIndex] = useState("cloudtrail-*");
  const [esBusy, setEsBusy] = useState(false);
  const [seedBusy, setSeedBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const r: any = await save({ data: { label, region, accessKeyId: accessKeyId.trim(), secretAccessKey: secretAccessKey.trim() } });
      if (!r.ok) { toast.error(r.error ?? "Validation failed"); return; }
      toast.success(`Connected to AWS account ${r.accountId} — agents starting now`);
      setAccessKeyId(""); setSecretAccessKey("");
      conn.refetch();
      autopilot().then((rr: any) => {
        if (rr?.ok) toast.success(`Agents ready · ${rr.rules_created} rules · ${rr.events_synced} events`);
      }).catch(() => {});
    } catch (err: any) { toast.error(err.message ?? "Failed"); }
    finally { setSubmitting(false); }
  };

  const handleSeed = async () => {
    setSeedBusy(true);
    try {
      const r: any = await seed({});
      if (r.ok) toast.success(`Sandbox populated · ${r.findings} findings · ${r.rules} rules · ${r.report} report`);
      else toast.error(r.error);
      conn.refetch();
    } finally { setSeedBusy(false); }
  };
  const handleClear = async () => {
    if (!confirm("Remove all sandbox mock data?")) return;
    await clear({}); toast.success("Sandbox cleared"); conn.refetch();
  };
  const handleEsConnect = async (e: React.FormEvent) => {
    e.preventDefault(); setEsBusy(true);
    try {
      const r: any = await esConnect({ data: { endpoint: esEndpoint.trim(), apiKey: esApiKey.trim(), index: esIndex.trim() } });
      if (r.ok) { toast.success(`Connected to ${r.cluster ?? "cluster"} · ${r.status} · ${r.nodes} nodes`); setEsApiKey(""); conn.refetch(); }
      else toast.error(r.error);
    } finally { setEsBusy(false); }
  };
  const handleEsSync = async () => {
    const t = toast.loading("Pulling from Elasticsearch…");
    try {
      const r: any = await esSync({});
      toast.dismiss(t);
      if (r.ok) toast.success(`Synced ${r.inserted} events from Elasticsearch`);
      else toast.error(r.error);
    } catch { toast.dismiss(t); }
  };

  return (
    <div className="mx-auto max-w-5xl p-8">
      <p className="font-mono text-xs uppercase tracking-widest text-primary">// step-by-step</p>
      <h1 className="mt-1 font-display text-3xl font-semibold">Connect your AWS account</h1>
      <p className="mt-2 text-muted-foreground">A read-only IAM user is all Strata needs. Follow these steps exactly — it takes about 3 minutes.</p>

      {c?.status === "connected" && (
        <div className="mt-6 rounded-2xl border border-[color:var(--success)]/40 bg-[color:var(--success)]/5 p-6 card-elevated">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 shrink-0" style={{ color: "var(--success)" }} />
            <div className="flex-1">
              <h2 className="font-display text-lg font-semibold">Connected</h2>
              <div className="mt-2 grid gap-1 font-mono text-xs text-muted-foreground">
                <div>account · <span className="text-foreground">{c.aws_account_id}</span></div>
                <div>arn · <span className="text-foreground">{c.aws_arn}</span></div>
                <div>region · <span className="text-foreground">{c.region}</span></div>
                <div>validated · <span className="text-foreground">{c.last_validated_at ? formatDistanceToNow(new Date(c.last_validated_at), { addSuffix: true }) : "never"}</span></div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={async () => {
                  const r: any = await revalidate({});
                  if (r.ok) { toast.success("Connection healthy"); conn.refetch(); } else toast.error(r.error);
                }}>Re-validate</Button>
                <Button size="sm" variant="outline" onClick={async () => {
                  const enabled = !c.auto_response_enabled;
                  await setAutoResponse({ data: { enabled } });
                  toast.success(enabled ? "Auto-response enabled" : "Auto-response disabled");
                  conn.refetch();
                }}>
                  {c.auto_response_enabled ? "Disable auto-response" : "Enable auto-response"}
                </Button>
                <Button size="sm" variant="outline" onClick={async () => {
                  if (!confirm("Disconnect this AWS account? Findings will be preserved.")) return;
                  await disconnect({}); toast.success("Disconnected"); conn.refetch();
                }} className="text-[color:var(--critical)]"><Trash2 className="mr-2 h-4 w-4" />Disconnect</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sandbox + Elasticsearch — only after AWS is connected */}
      {c?.status === "connected" && (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {/* SANDBOX */}
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 card-elevated">
            <div className="flex items-start gap-3">
              <FlaskConical className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h3 className="font-display text-base font-semibold">Sandbox — seed mock data</h3>
                <p className="mt-1 text-sm text-muted-foreground">Populate this account with a realistic attack chain so you can exercise the dashboard, timeline, findings, rules and incident reports end-to-end — no real AWS traffic required.</p>
                {c.mock_data_seeded_at && (
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-primary">
                    seeded {formatDistanceToNow(new Date(c.mock_data_seeded_at), { addSuffix: true })}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={handleSeed} disabled={seedBusy} className="glow-ring">
                    <Sparkles className="mr-2 h-4 w-4" />{seedBusy ? "Seeding…" : "Populate sandbox"}
                  </Button>
                  {c.mock_data_seeded_at && (
                    <Button size="sm" variant="outline" onClick={handleClear}><Trash2 className="mr-2 h-4 w-4" />Clear mock data</Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ELASTICSEARCH */}
          <div className="rounded-2xl border border-border bg-card/60 p-6 card-elevated">
            <div className="flex items-start gap-3">
              <Database className="h-5 w-5 text-accent mt-0.5" />
              <div className="flex-1">
                <h3 className="font-display text-base font-semibold">Elasticsearch / OpenSearch</h3>
                <p className="mt-1 text-sm text-muted-foreground">Stream logs from an existing ELK / OpenSearch cluster. Strata will pull recent docs and run the same triage pipeline.</p>
                {c.es_connected ? (
                  <div className="mt-3">
                    <div className="font-mono text-xs text-muted-foreground">endpoint · <span className="text-foreground">{c.es_endpoint}</span></div>
                    <div className="font-mono text-xs text-muted-foreground">index · <span className="text-foreground">{c.es_index}</span></div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" onClick={handleEsSync}>Pull latest events</Button>
                      <Button size="sm" variant="outline" onClick={async () => { await esDisconnect({}); toast.success("Disconnected"); conn.refetch(); }} className="text-[color:var(--critical)]"><Trash2 className="mr-2 h-4 w-4" />Disconnect</Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleEsConnect} className="mt-3 space-y-3">
                    <Input placeholder="https://my-cluster.es.amazonaws.com" value={esEndpoint} onChange={(e) => setEsEndpoint(e.target.value)} required className="font-mono text-xs" />
                    <Input placeholder="Base64 API key" value={esApiKey} onChange={(e) => setEsApiKey(e.target.value)} required type="password" className="font-mono text-xs" autoComplete="off" />
                    <Input placeholder="Index pattern (cloudtrail-*)" value={esIndex} onChange={(e) => setEsIndex(e.target.value)} className="font-mono text-xs" />
                    <Button size="sm" type="submit" disabled={esBusy}>{esBusy ? "Validating…" : "Connect cluster"}</Button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-10 grid gap-8 md:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <StepBlock n="1" title="Sign in to the AWS Console" body={
            <>Open the AWS IAM console. Make sure you're signed in to the AWS account you want Strata to watch.
              <a href="https://us-east-1.console.aws.amazon.com/iam/home#/users" target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-primary hover:underline">
                Open IAM → Users <ExternalLink className="h-3.5 w-3.5" />
              </a></>
          } />
          <StepBlock n="2" title="Create a new IAM user" body={
            <>Click <Kbd>Create user</Kbd>. Set <b>User name</b> to <Copyable value="strata-readonly" />. Do <b>not</b> tick "Provide user access to the AWS Management Console". Click <Kbd>Next</Kbd>.</>
          } />
          <StepBlock n="3" title="Attach these two AWS-managed policies" body={
            <>
              On the <b>Set permissions</b> screen choose <Kbd>Attach policies directly</Kbd>:
              <div className="mt-3 space-y-2">
                <PolicyCopy name="AWSCloudTrailReadOnlyAccess" />
                <PolicyCopy name="AmazonGuardDutyReadOnlyAccess" />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Read-only — Strata cannot modify your account with these.</p>
            </>
          } />
          <StepBlock n="4" title="Create an access key" body={
            <>Security credentials → Access keys → <Kbd>Create access key</Kbd> → <Kbd>Third-party service</Kbd>. AWS shows the secret <b>once</b> — copy both values now.</>
          } />
          <StepBlock n="5" title="Paste them into Strata →" body="Strata will call sts:GetCallerIdentity to confirm the keys and identify your account." />
        </div>

        <form onSubmit={submit} className="h-fit rounded-2xl border border-border bg-card/70 p-6 card-elevated sticky top-6">
          <h3 className="font-display text-lg font-semibold">{c?.status === "connected" ? "Update connection" : "Enter credentials"}</h3>
          <div className="mt-4 space-y-4">
            <div><Label htmlFor="label">Label</Label><Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} className="mt-1" /></div>
            <div><Label htmlFor="region">Default region</Label>
              <select id="region" value={region} onChange={(e) => setRegion(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-input px-3 py-2 text-sm font-mono">
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div><Label htmlFor="ak">Access Key ID</Label><Input id="ak" required placeholder="AKIA…" value={accessKeyId} onChange={(e) => setAccessKeyId(e.target.value)} className="mt-1 font-mono" autoComplete="off" spellCheck={false} /></div>
            <div><Label htmlFor="sk">Secret Access Key</Label><Input id="sk" required type="password" placeholder="••••••••••••••••••••" value={secretAccessKey} onChange={(e) => setSecretAccessKey(e.target.value)} className="mt-1 font-mono" autoComplete="off" spellCheck={false} /></div>
            <Button type="submit" disabled={submitting} className="w-full glow-ring">{submitting ? "Validating with AWS…" : "Validate & connect"}</Button>
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Keys are stored encrypted at rest and never exposed to the browser.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

function StepBlock({ n, title, body }: { n: string; title: string; body: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-5 card-elevated">
      <div className="flex items-start gap-4">
        <div className="font-mono text-2xl font-semibold text-gradient leading-none">{n}</div>
        <div className="flex-1">
          <h3 className="font-display text-base font-semibold">{title}</h3>
          <div className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</div>
        </div>
      </div>
    </div>
  );
}
function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-xs text-foreground">{children}</kbd>;
}
function Copyable({ value }: { value: string }) {
  return (
    <button type="button" onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied"); }} className="inline-flex items-center gap-1.5 rounded border border-border bg-background px-2 py-0.5 font-mono text-xs hover:border-primary/40">
      {value} <Copy className="h-3 w-3" />
    </button>
  );
}
function PolicyCopy({ name }: { name: string }) {
  return (
    <button type="button" onClick={() => { navigator.clipboard.writeText(name); toast.success(`Copied "${name}"`); }} className="flex w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-left font-mono text-xs transition-colors hover:border-primary/40">
      <span className="text-foreground">{name}</span>
      <span className="inline-flex items-center gap-1.5 text-primary">copy <Copy className="h-3 w-3" /></span>
    </button>
  );
}
