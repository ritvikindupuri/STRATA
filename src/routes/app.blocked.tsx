import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { explainBlock } from "@/lib/agent.functions";
import { formatDistanceToNow } from "date-fns";
import { ShieldX, Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/blocked")({ component: BlockedPage });

function BlockedPage() {
  const explain = useServerFn(explainBlock);
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const actions = useQuery({
    queryKey: ["blocked-actions"],
    refetchInterval: 20000,
    queryFn: async () => ((await supabase.from("agent_actions").select("*").eq("action_type", "block").order("created_at", { ascending: false }).limit(100)).data ?? []),
  });

  async function runExplain(id: string) {
    setBusy(id);
    try {
      const r: any = await explain({ data: { action_id: id } });
      if (!r?.ok) toast.error(r?.error ?? "Failed to generate explanation");
      await qc.invalidateQueries({ queryKey: ["blocked-actions"] });
      setOpen(id);
    } finally { setBusy(null); }
  }

  return (
    <div className="p-8">
      <p className="font-mono text-xs uppercase tracking-widest text-primary">// containment</p>
      <h1 className="mt-1 font-display text-3xl font-semibold flex items-center gap-3"><ShieldX className="h-7 w-7 text-primary" /> Auto-blocked actions</h1>
      <p className="mt-2 text-sm text-muted-foreground">Every containment action the agent took (deactivated keys, skipped attempts). Click "Explain" to have the AI summarize why.</p>

      <div className="mt-6 space-y-3">
        {(actions.data ?? []).map((a: any) => {
          const expl = (a.details as any)?.ai_explanation as string | undefined;
          const isOpen = open === a.id;
          return (
            <div key={a.id} className="rounded-xl border border-border bg-card/40 card-elevated">
              <div className="p-4 flex flex-wrap items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full" style={{ background: statusColor(a.status), boxShadow: `0 0 10px ${statusColor(a.status)}` }} />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-sm font-semibold">Deactivate access key</span>
                    <span className="rounded px-2 py-0.5 font-mono text-[10px] uppercase" style={{ background: `color-mix(in oklab, ${statusColor(a.status)} 15%, transparent)`, color: statusColor(a.status) }}>{a.status}</span>
                    {a.target && <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground truncate max-w-xs">{a.target}</span>}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{a.reasoning}</p>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground/70">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</p>
                </div>
                <button
                  onClick={() => (expl ? setOpen(isOpen ? null : a.id) : runExplain(a.id))}
                  disabled={busy === a.id}
                  className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs text-primary hover:bg-primary/10 disabled:opacity-50"
                >
                  {busy === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {expl ? (isOpen ? "Hide" : "Show") + " explanation" : "Explain"}
                </button>
              </div>
              {isOpen && expl && (
                <div className="border-t border-border p-5 animate-float-up">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-primary">AI explanation</div>
                  <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">{expl}</pre>
                </div>
              )}
            </div>
          );
        })}
        {!actions.data?.length && (
          <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No blocks yet. Containment only fires on critical IAM findings when auto-response is enabled.
          </div>
        )}
      </div>
    </div>
  );
}

function statusColor(s: string) {
  return s === "success" ? "var(--success)" : s === "failed" ? "var(--critical)" : s === "skipped" ? "var(--muted-foreground)" : "var(--accent)";
}
