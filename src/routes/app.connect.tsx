import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { saveAwsConnection, revalidateAwsConnection, disconnectAws } from "@/lib/aws.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, Copy, ExternalLink, AlertCircle, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/app/connect")({ component: ConnectAws });

const REGIONS = [
  "us-east-1", "us-east-2", "us-west-1", "us-west-2",
  "eu-west-1", "eu-central-1", "ap-southeast-1", "ap-southeast-2",
  "ap-northeast-1", "sa-east-1", "ca-central-1",
];

function ConnectAws() {
  const save = useServerFn(saveAwsConnection);
  const revalidate = useServerFn(revalidateAwsConnection);
  const disconnect = useServerFn(disconnectAws);

  const conn = useQuery({
    queryKey: ["aws-conn"],
    queryFn: async () => (await supabase.from("aws_connections_safe").select("*").maybeSingle()).data,
  });

  const [label, setLabel] = useState("Primary AWS Account");
  const [region, setRegion] = useState("us-east-1");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const r: any = await save({ data: { label, region, accessKeyId: accessKeyId.trim(), secretAccessKey: secretAccessKey.trim() } });
      if (!r.ok) { toast.error(r.error ?? "Validation failed"); return; }
      toast.success(`Connected to AWS account ${r.accountId}`);
      setAccessKeyId(""); setSecretAccessKey("");
      conn.refetch();
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally { setSubmitting(false); }
  };

  const handleRevalidate = async () => {
    const r: any = await revalidate({});
    if (r.ok) { toast.success("Connection healthy"); conn.refetch(); }
    else toast.error(r.error);
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect this AWS account? Findings will be preserved.")) return;
    await disconnect({});
    toast.success("Disconnected");
    conn.refetch();
  };

  return (
    <div className="mx-auto max-w-4xl p-8">
      <p className="font-mono text-xs uppercase tracking-widest text-primary">// step-by-step</p>
      <h1 className="mt-1 font-display text-3xl font-semibold">Connect your AWS account</h1>
      <p className="mt-2 text-muted-foreground">A read-only IAM user is all Argus needs. Follow these steps exactly — it takes about 3 minutes.</p>

      {conn.data?.status === "connected" && (
        <div className="mt-6 rounded-2xl border border-[color:var(--success)]/40 bg-[color:var(--success)]/5 p-6 card-elevated">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 shrink-0" style={{ color: "var(--success)" }} />
            <div className="flex-1">
              <h2 className="font-display text-lg font-semibold">Connected</h2>
              <div className="mt-2 grid gap-1 font-mono text-xs text-muted-foreground">
                <div>account · <span className="text-foreground">{conn.data.aws_account_id}</span></div>
                <div>arn · <span className="text-foreground">{conn.data.aws_arn}</span></div>
                <div>region · <span className="text-foreground">{conn.data.region}</span></div>
                <div>validated · <span className="text-foreground">{conn.data.last_validated_at ? formatDistanceToNow(new Date(conn.data.last_validated_at), { addSuffix: true }) : "never"}</span></div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" onClick={handleRevalidate}>Re-validate</Button>
                <Button size="sm" variant="outline" onClick={handleDisconnect} className="text-[color:var(--critical)]"><Trash2 className="mr-2 h-4 w-4" />Disconnect</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-10 grid gap-8 md:grid-cols-[1fr_360px]">
        {/* Steps */}
        <div className="space-y-6">
          <StepBlock n="1" title="Sign in to the AWS Console" body={
            <>
              Open the AWS IAM console. Make sure you're signed in to the AWS account you want Argus to watch (top right).
              <a href="https://us-east-1.console.aws.amazon.com/iam/home#/users" target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-primary hover:underline">
                Open IAM → Users <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </>
          } />

          <StepBlock n="2" title="Create a new IAM user" body={
            <>
              Click <Kbd>Create user</Kbd>. Set <b>User name</b> to <Copyable value="argus-readonly" />. Do <b>not</b> tick "Provide user access to the AWS Management Console" — Argus only needs programmatic access. Click <Kbd>Next</Kbd>.
            </>
          } />

          <StepBlock n="3" title="Attach these two AWS-managed policies" body={
            <>
              On the <b>Set permissions</b> screen choose <Kbd>Attach policies directly</Kbd>. In the search box, find and tick <b>each</b> of these policies (filter category: <span className="font-mono text-xs text-primary">AWS managed</span>):
              <div className="mt-3 space-y-2">
                <PolicyCopy name="AWSCloudTrailReadOnlyAccess" />
                <PolicyCopy name="AmazonGuardDutyReadOnlyAccess" />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">These are read-only AWS-managed policies. Argus cannot create, modify, or delete anything in your account with them.</p>
              Click <Kbd>Next</Kbd>, then <Kbd>Create user</Kbd>.
            </>
          } />

          <StepBlock n="4" title="Create an access key for the user" body={
            <>
              Open the <span className="font-mono">argus-readonly</span> user, go to the <b>Security credentials</b> tab, scroll to <b>Access keys</b>, click <Kbd>Create access key</Kbd>. Pick use case <Kbd>Third-party service</Kbd>, tick the confirmation, click <Kbd>Next</Kbd> and <Kbd>Create access key</Kbd>.
              <p className="mt-2 text-xs text-[color:var(--warning)]">AWS shows the secret key <b>once</b> — copy both values now.</p>
            </>
          } />

          <StepBlock n="5" title="Paste them into Argus →" body="Use the form on the right. Argus will instantly call sts:GetCallerIdentity to confirm the keys work and identify your AWS account." />
        </div>

        {/* Form */}
        <form onSubmit={submit} className="h-fit rounded-2xl border border-border bg-card/70 p-6 card-elevated sticky top-6">
          <h3 className="font-display text-lg font-semibold">{conn.data?.status === "connected" ? "Update connection" : "Enter credentials"}</h3>

          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="label">Label</Label>
              <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="region">Default region</Label>
              <select id="region" value={region} onChange={(e) => setRegion(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-input px-3 py-2 text-sm font-mono">
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="ak">Access Key ID</Label>
              <Input id="ak" required placeholder="AKIA…" value={accessKeyId} onChange={(e) => setAccessKeyId(e.target.value)} className="mt-1 font-mono" autoComplete="off" spellCheck={false} />
            </div>
            <div>
              <Label htmlFor="sk">Secret Access Key</Label>
              <Input id="sk" required type="password" placeholder="••••••••••••••••••••" value={secretAccessKey} onChange={(e) => setSecretAccessKey(e.target.value)} className="mt-1 font-mono" autoComplete="off" spellCheck={false} />
            </div>

            <Button type="submit" disabled={submitting} className="w-full glow-ring">
              {submitting ? "Validating with AWS…" : "Validate & connect"}
            </Button>

            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Keys are stored encrypted at rest and never exposed to the browser. Only your server-side functions can read them.
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
