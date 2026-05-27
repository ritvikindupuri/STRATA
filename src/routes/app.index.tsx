import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { runAutopilot, clearSession } from "@/lib/agent.functions";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Activity, ShieldCheck, Cloud, ArrowRight, Bot, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/app/")({ component: Dashboard });

function Dashboard() {
  const autopilot = useServerFn(runAutopilot);
  const doClear = useServerFn(clearSession);
  const [clearing, setClearing] = useState(false);
  const ranRef = useRef(false);

  const conn = useQuery({
    queryKey: ["aws-conn"],
    queryFn: async () => {
      const { data } = await (supabase as any).rpc("my_aws_connection");
      return (Array.isArray(data) && data.length ? data[0] : null) as null | {
        id: string; status: string; aws_account_id: string | null; aws_arn: string | null;
        region: string; last_validated_at: string | null; auto_response_enabled: boolean;
        es_endpoint: string | null; es_index: string | null; es_connected: boolean;
        mock_data_seeded_at: string | null;
      };
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

  // Autonomous: once an AWS account is connected, agents run on their own.
  // Kick off a cycle when the dashboard first sees a connected account, then
  // continue on a steady cadence in the background.
  useEffect(() => {
    if (conn.data?.status !== "connected") return;
    const trigger = async (silent = false) => {
      const t = silent ? null : toast.loading("Agents running — rules · sync · triage · contain · report");
      try {
        const r: any = await autopilot();
        if (t) toast.dismiss(t);
        if (r?.ok && !silent) {
          toast.success(`Agents complete · ${r.rules_created} rules · ${r.events_synced} events · ${r.blocked} blocked · ${r.reports} reports`);
        }
        findings.refetch();
      } catch {
        if (t) toast.dismiss(t);
      }
    };
    if (!ranRef.current) {
      ranRef.current = true;
      trigger(false);
    }
    const interval = setInterval(() => trigger(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [conn.data?.status]);

  return (
    <div className="p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-primary">// dashboard</p>
          <h1 className="mt-1 font-display text-3xl font-semibold">Threat overview</h1>
        </div>
        {conn.data?.status === "connected" && (
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3.5 py-1.5">
            <Bot className="h-3.5 w-3.5 text-primary animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">agents active</span>
          </div>
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
                  No findings yet. Agents are pulling your latest CloudTrail and GuardDuty signals — this view will update automatically.
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
