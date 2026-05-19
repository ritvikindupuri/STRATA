import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/app/findings")({ component: FindingsPage });

const SEVS = ["all", "critical", "high", "medium", "low"] as const;
const SOURCES = ["all", "cloudtrail", "guardduty"] as const;

function FindingsPage() {
  const [sev, setSev] = useState<(typeof SEVS)[number]>("all");
  const [src, setSrc] = useState<(typeof SOURCES)[number]>("all");
  const [open, setOpen] = useState<string | null>(null);

  const findings = useQuery({
    queryKey: ["findings", "all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("findings")
        .select("*")
        .order("event_time", { ascending: false })
        .limit(500);
      return data ?? [];
    },
  });

  const rows = (findings.data ?? []).filter((r: any) =>
    (sev === "all" || r.ai_severity === sev) &&
    (src === "all" || r.source === src)
  );

  return (
    <div className="p-8">
      <p className="font-mono text-xs uppercase tracking-widest text-primary">// findings</p>
      <h1 className="mt-1 font-display text-3xl font-semibold">All detected events</h1>

      <div className="mt-6 flex flex-wrap gap-3">
        <FilterGroup label="severity" value={sev} options={SEVS} onChange={setSev} />
        <FilterGroup label="source" value={src} options={SOURCES} onChange={setSrc} />
      </div>

      <div className="mt-6 space-y-3">
        {rows.map((f: any) => (
          <div key={f.id} className="rounded-xl border border-border bg-card/40 card-elevated">
            <button onClick={() => setOpen(open === f.id ? null : f.id)} className="w-full p-4 text-left">
              <RowHeader f={f} />
            </button>
            {open === f.id && (
              <div className="border-t border-border p-4 animate-float-up">
                {f.ai_summary && (
                  <div className="mb-4">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-primary">AI summary</div>
                    <p className="mt-1 text-sm">{f.ai_summary}</p>
                  </div>
                )}
                {f.ai_remediation && (
                  <div className="mb-4">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-primary">Recommended action</div>
                    <p className="mt-1 text-sm">{f.ai_remediation}</p>
                  </div>
                )}
                <div className="grid gap-2 font-mono text-xs sm:grid-cols-2">
                  <Detail k="event" v={f.event_name} />
                  <Detail k="source" v={f.source} />
                  <Detail k="region" v={f.region} />
                  <Detail k="user" v={f.username} />
                  <Detail k="ip" v={f.source_ip} />
                  <Detail k="user-agent" v={f.user_agent} />
                </div>
                <details className="mt-4">
                  <summary className="cursor-pointer font-mono text-xs text-muted-foreground hover:text-primary">// raw aws payload</summary>
                  <pre className="mt-2 max-h-80 overflow-auto rounded-md border border-border bg-background p-3 font-mono text-[11px]">{JSON.stringify(f.raw, null, 2)}</pre>
                </details>
              </div>
            )}
          </div>
        ))}
        {rows.length === 0 && (
          <div className="rounded-lg border border-dashed border-border bg-card/30 p-12 text-center text-sm text-muted-foreground">
            No findings match these filters.
          </div>
        )}
      </div>
    </div>
  );
}

function RowHeader({ f }: { f: any }) {
  const sev = (f.ai_severity ?? "low") as string;
  const color = sev === "critical" ? "var(--critical)" : sev === "high" ? "var(--warning)" : sev === "medium" ? "var(--accent)" : "var(--muted-foreground)";
  return (
    <div className="flex items-start gap-4">
      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-sm font-semibold">{f.title || f.event_name}</span>
          <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{f.source}</span>
          {f.ai_category && <span className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] text-primary">{f.ai_category}</span>}
        </div>
        <div className="mt-1 font-mono text-xs text-muted-foreground">
          {f.username ?? "—"} · {f.source_ip ?? "—"} · {f.event_time ? formatDistanceToNow(new Date(f.event_time), { addSuffix: true }) : ""}
        </div>
      </div>
      <span className="rounded px-2 py-1 font-mono text-[10px] uppercase" style={{ background: `color-mix(in oklab, ${color} 15%, transparent)`, color }}>{sev}</span>
    </div>
  );
}

function FilterGroup<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly T[]; onChange: (v: T) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-card/40 p-1">
      <span className="px-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)} className={`rounded-md px-3 py-1 font-mono text-xs ${value === o ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{o}</button>
      ))}
    </div>
  );
}

function Detail({ k, v }: { k: string; v: any }) {
  return (
    <div className="rounded-md border border-border bg-background/50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</div>
      <div className="truncate text-foreground">{v ?? "—"}</div>
    </div>
  );
}
