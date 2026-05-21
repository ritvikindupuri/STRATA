import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { syncFindings } from "@/lib/aws.functions";
import { runAutopilot } from "@/lib/agent.functions";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Activity, ShieldCheck, RefreshCw, Cloud, ArrowRight, Bot } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/app/")({ component: Dashboard });

function Dashboard() {
  const sync = useServerFn(syncFindings);
  const [syncing, setSyncing] = useState(false);

  const conn = useQuery({
    queryKey: ["aws-conn"],
    queryFn: async () => {
      const { data } = await supabase.from("aws_connections_safe").select("*").maybeSingle();
      return data;
    },
  });

  const findings = useQuery({
    queryKey: ["findings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("findings")
        .select("*")
        .order("event_time", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  const stats = computeStats(findings.data ?? []);

  const handleSync = async () => {
    setSyncing(true);
    const t = toast.loading("Syncing CloudTrail + GuardDuty…");
    try {
      const r: any = await sync();
      toast.dismiss(t);
      if (!r.ok) { toast.error(r.error ?? "Sync failed"); return; }
      toast.success(`Synced — ${r.cloudtrail} CloudTrail · ${r.guardduty} GuardDuty · ${r.analyzed} AI-analyzed`);
      findings.refetch();
    } catch (e: any) {
      toast.dismiss(t);
      toast.error(e.message ?? "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-primary">// dashboard</p>
          <h1 className="mt-1 font-display text-3xl font-semibold">Threat overview</h1>
        </div>
        {conn.data?.status === "connected" && (
          <Button onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Sync now"}
          </Button>
        )}
      </header>

      {!conn.data || conn.data.status !== "connected" ? (
        <div className="mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center card-elevated">
          <Cloud className="mx-auto h-12 w-12 text-primary" />
          <h2 className="mt-4 font-display text-xl font-semibold">Connect your AWS account to start</h2>
          <p className="mt-2 text-sm text-muted-foreground">Strata needs read-only AWS credentials to begin pulling CloudTrail and GuardDuty signals.</p>
          <Link to="/app/connect" className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:opacity-90">
            Open connection wizard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <StatCard label="Total events" value={stats.total} icon={Activity} />
            <StatCard label="Critical" value={stats.critical} icon={AlertTriangle} tone="critical" />
            <StatCard label="High" value={stats.high} icon={AlertTriangle} tone="warning" />
            <StatCard label="AI-analyzed" value={stats.analyzed} icon={ShieldCheck} tone="success" />
          </div>

          <div className="mt-6 rounded-xl border border-border bg-card/60 px-4 py-3 font-mono text-xs text-muted-foreground card-elevated">
            <span className="text-primary">aws://</span>
            {conn.data.aws_account_id ?? "—"} · region {conn.data.region} · {conn.data.last_validated_at ? `validated ${formatDistanceToNow(new Date(conn.data.last_validated_at), { addSuffix: true })}` : "not validated"}
          </div>

          <section className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">Recent findings</h2>
              <Link to="/app/findings" className="text-sm text-primary hover:underline">View all →</Link>
            </div>
            <div className="mt-4 space-y-3">
              {(findings.data ?? []).slice(0, 8).map((f: any) => <FindingRow key={f.id} f={f} />)}
              {(findings.data ?? []).length === 0 && (
                <div className="rounded-lg border border-dashed border-border bg-card/30 p-8 text-center text-sm text-muted-foreground">
                  No findings yet. Hit <span className="text-primary">Sync now</span> to pull the latest events.
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function computeStats(rows: any[]) {
  let critical = 0, high = 0, analyzed = 0;
  for (const r of rows) {
    if (r.ai_analyzed_at) analyzed++;
    if (r.ai_severity === "critical") critical++;
    if (r.ai_severity === "high") high++;
  }
  return { total: rows.length, critical, high, analyzed };
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone?: "critical" | "warning" | "success" }) {
  const toneColor = tone === "critical" ? "var(--critical)" : tone === "warning" ? "var(--warning)" : tone === "success" ? "var(--success)" : "var(--primary)";
  return (
    <div className="rounded-xl border border-border bg-card/60 p-5 card-elevated">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4" style={{ color: toneColor }} />
      </div>
      <div className="mt-2 font-display text-3xl font-semibold" style={{ color: toneColor }}>{value}</div>
    </div>
  );
}

export function FindingRow({ f }: { f: any }) {
  const sev = (f.ai_severity ?? "low") as string;
  const color = sev === "critical" ? "var(--critical)" : sev === "high" ? "var(--warning)" : sev === "medium" ? "var(--accent)" : "var(--muted-foreground)";
  return (
    <Link to="/app/findings" className="block">
      <div className="group rounded-lg border border-border bg-card/40 p-4 transition-colors hover:border-primary/40 hover:bg-card">
        <div className="flex items-start gap-4">
          <div className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-sm font-semibold truncate">{f.title || f.event_name}</span>
              <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{f.source}</span>
              {f.ai_category && <span className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] text-primary">{f.ai_category}</span>}
            </div>
            <div className="mt-1 font-mono text-xs text-muted-foreground">
              {f.username ?? "—"} · {f.source_ip ?? "—"} · {f.event_time ? formatDistanceToNow(new Date(f.event_time), { addSuffix: true }) : ""}
            </div>
            {f.ai_summary && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{f.ai_summary}</p>}
          </div>
          <span className="rounded px-2 py-1 font-mono text-[10px] uppercase" style={{ background: `color-mix(in oklab, ${color} 15%, transparent)`, color }}>{sev}</span>
        </div>
      </div>
    </Link>
  );
}
