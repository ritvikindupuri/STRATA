import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format } from "date-fns";
import { Archive } from "lucide-react";

export const Route = createFileRoute("/app/history")({ component: HistoryPage });

function HistoryPage() {
  const sessions = useQuery({
    queryKey: ["agent-sessions"],
    queryFn: async () => ((await (supabase as any).from("agent_sessions").select("*").order("created_at", { ascending: false }).limit(100)).data ?? []),
  });
  const runs = useQuery({
    queryKey: ["agent-runs"],
    queryFn: async () => ((await (supabase as any).from("agent_runs").select("*").order("started_at", { ascending: false }).limit(50)).data ?? []),
  });

  return (
    <div className="p-8">
      <p className="font-mono text-xs uppercase tracking-widest text-primary">// history</p>
      <h1 className="mt-1 font-display text-3xl font-semibold">Past sessions & agent runs</h1>
      <p className="mt-2 text-sm text-muted-foreground">Cleared sessions are snapshotted here. Below that, every individual autopilot cycle from the current session.</p>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2"><Archive className="h-4 w-4 text-primary" /> Archived sessions</h2>
        <div className="mt-4 space-y-3">
          {(sessions.data ?? []).map((s: any) => (
            <div key={s.id} className="rounded-xl border border-border bg-card/40 p-4 card-elevated">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="font-display text-sm font-semibold">Session cleared {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}</div>
                <div className="font-mono text-[10px] text-muted-foreground">{format(new Date(s.created_at), "PPpp")}</div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 font-mono text-xs">
                <Cell k="runs" v={s.runs} />
                <Cell k="findings" v={s.findings} />
                <Cell k="reports" v={s.reports} />
              </div>
              {s.stats_rollup && Object.keys(s.stats_rollup).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(s.stats_rollup).map(([k, v]: any) => (
                    <span key={k} className="rounded border border-border bg-background/40 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">{k}: {String(v)}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {!sessions.data?.length && (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No archived sessions yet. Use "Clear session" on the dashboard to snapshot the current state.
            </div>
          )}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-lg font-semibold">Recent autopilot cycles</h2>
        <div className="mt-4 space-y-2">
          {(runs.data ?? []).map((r: any) => (
            <div key={r.id} className="rounded-lg border border-border bg-card/40 p-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-mono text-xs">{r.status}</div>
                <div className="font-mono text-[10px] text-muted-foreground">{format(new Date(r.started_at), "PPpp")}</div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(r.stats ?? {}).map(([k, v]: any) => (
                  <span key={k} className="rounded border border-border bg-background/40 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">{k}: {String(v)}</span>
                ))}
              </div>
            </div>
          ))}
          {!runs.data?.length && (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No runs yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}

function Cell({ k, v }: { k: string; v: any }) {
  return (
    <div className="rounded-md border border-border bg-background/40 p-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</div>
      <div className="font-display text-lg">{v ?? 0}</div>
    </div>
  );
}
