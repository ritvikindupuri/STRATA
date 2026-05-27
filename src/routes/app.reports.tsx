import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { FileText, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/app/reports")({ component: ReportsPage });

function ReportsPage() {
  const [open, setOpen] = useState<string | null>(null);
  const reports = useQuery({
    queryKey: ["reports"],
    refetchInterval: 20000,
    queryFn: async () => (await supabase.from("incident_reports").select("*").order("created_at", { ascending: false }).limit(50)).data ?? [],
  });
  const rules = useQuery({
    queryKey: ["rules"],
    queryFn: async () => (await supabase.from("detection_rules").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  return (
    <div className="p-8">
      <p className="font-mono text-xs uppercase tracking-widest text-primary">// agent output</p>
      <h1 className="mt-1 font-display text-3xl font-semibold">Reports & detection rules</h1>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Incident reports</h2>
        <div className="mt-4 space-y-3">
          {(reports.data ?? []).map((r: any) => (
            <div key={r.id} className="rounded-xl border border-border bg-card/40 card-elevated">
              <button onClick={() => setOpen(open === r.id ? null : r.id)} className="w-full p-4 text-left">
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full" style={{ background: sevColor(r.severity), boxShadow: `0 0 10px ${sevColor(r.severity)}` }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-sm font-semibold">{r.title}</span>
                      <span className="rounded px-2 py-0.5 font-mono text-[10px] uppercase" style={{ background: `color-mix(in oklab, ${sevColor(r.severity)} 15%, transparent)`, color: sevColor(r.severity) }}>{r.severity}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{r.executive_summary}</p>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground/70">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</p>
                  </div>
                </div>
              </button>
              {open === r.id && (
                <div className="border-t border-border p-5 space-y-5 animate-float-up">
                  <Section title="Executive summary">{r.executive_summary}</Section>
                  {r.mitre_tactics?.length > 0 && (
                    <div>
                      <SectionLabel>MITRE tactics</SectionLabel>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {r.mitre_tactics.map((t: string) => <span key={t} className="rounded border border-primary/30 bg-primary/5 px-2 py-0.5 font-mono text-[10px] text-primary">{t}</span>)}
                      </div>
                    </div>
                  )}
                  {r.affected_resources?.length > 0 && (
                    <div>
                      <SectionLabel>Affected resources</SectionLabel>
                      <ul className="mt-2 space-y-1 font-mono text-xs text-muted-foreground">
                        {r.affected_resources.map((res: string, i: number) => <li key={i} className="truncate">· {res}</li>)}
                      </ul>
                    </div>
                  )}
                  {Array.isArray(r.timeline) && r.timeline.length > 0 && (
                    <div>
                      <SectionLabel>Attack timeline</SectionLabel>
                      <ol className="mt-2 space-y-2">
                        {r.timeline.map((e: any, i: number) => (
                          <li key={i} className="rounded-md border border-border bg-background/40 p-3">
                            <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-primary/80">
                              <span>{e.time}</span>
                              <span className="text-muted-foreground">·</span>
                              <span className="text-foreground">{e.actor}</span>
                            </div>
                            <p className="mt-1 text-sm">{e.event}</p>
                            {e.significance && <p className="mt-1 text-xs text-muted-foreground">{e.significance}</p>}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  <Section title="Recommendations">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{r.recommendations}</pre>
                  </Section>
                </div>
              )}
            </div>
          ))}
          {!reports.data?.length && (
            <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No incident reports yet. Reports are generated when 2+ high-severity findings correlate.
            </div>
          )}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-primary" /> Active detection rules</h2>
        <p className="mt-1 text-sm text-muted-foreground">Click a rule to see the findings it matched. Findings are matched by event name or keyword overlap with the rule definition.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(rules.data ?? []).map((r: any) => <RuleCard key={r.id} rule={r} />)}
          {!rules.data?.length && (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground md:col-span-2">
              No rules yet — run Autopilot to generate a tailored ruleset.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function sevColor(s: string) {
  return s === "critical" ? "var(--critical)" : s === "high" ? "var(--warning)" : s === "medium" ? "var(--accent)" : "var(--muted-foreground)";
}
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="font-mono text-[10px] uppercase tracking-widest text-primary">{children}</div>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <SectionLabel>{title}</SectionLabel>
      <div className="mt-1 text-sm text-foreground/90">{children}</div>
    </div>
  );
}
