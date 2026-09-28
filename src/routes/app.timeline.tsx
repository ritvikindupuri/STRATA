import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format } from "date-fns";
import { ShieldAlert, ShieldCheck, Activity, Bot, FileText, ShieldX } from "lucide-react";

export const Route = createFileRoute("/app/timeline")({ component: TimelinePage });

const ICON: Record<string, any> = {
  block: ShieldX,
  rule_create: Bot,
  report: FileText,
  detect: ShieldAlert,
  triage: ShieldCheck,
  default: Activity,
};

function TimelinePage() {
  const events = useQuery({
    queryKey: ["timeline"],
    refetchInterval: 15000,
    queryFn: async () => {
      const [actions, findings, reports] = await Promise.all([
        supabase
          .from("agent_actions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(80),
        supabase
          .from("findings")
          .select(
            "id,title,event_name,event_time,ai_severity,ai_category,source,username,source_ip,created_at",
          )
          .in("ai_severity", ["high", "critical"])
          .order("created_at", { ascending: false })
          .limit(80),
        supabase
          .from("incident_reports")
          .select("id,title,severity,created_at,executive_summary")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      const items: any[] = [];
      for (const a of actions.data ?? []) items.push({ kind: "action", ts: a.created_at, data: a });
      for (const f of findings.data ?? [])
        items.push({ kind: "finding", ts: f.event_time ?? f.created_at, data: f });
      for (const r of reports.data ?? []) items.push({ kind: "report", ts: r.created_at, data: r });
      return items.sort((a, b) => +new Date(b.ts) - +new Date(a.ts));
    },
  });

  const items = events.data ?? [];

  return (
    <div className="p-8">
      <p className="font-mono text-xs uppercase tracking-widest text-primary">
        // incident timeline
      </p>
      <h1 className="mt-1 font-display text-3xl font-semibold">Live event ledger</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Every detection, agent action, and incident report — in order.
      </p>

      <div className="mt-8 relative">
        <div className="absolute left-[14px] top-2 bottom-2 w-px bg-gradient-to-b from-primary/40 via-border to-transparent" />
        <ul className="space-y-4">
          {items.map((it, idx) => (
            <TimelineItem key={idx} item={it} />
          ))}
          {!items.length && (
            <li className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No timeline events yet. Run the Autopilot from the dashboard.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

function TimelineItem({ item }: { item: any }) {
  const { kind, ts, data } = item;
  let Icon = ICON.default,
    color = "var(--primary)",
    title = "",
    desc = "",
    tag = "";

  if (kind === "action") {
    Icon = ICON[data.action_type] ?? ICON.default;
    title = data.reasoning ?? data.action_type;
    desc = data.target ? `target: ${data.target}` : "";
    tag = `agent · ${data.action_type}`;
    color =
      data.status === "failed"
        ? "var(--critical)"
        : data.status === "skipped"
          ? "var(--muted-foreground)"
          : "var(--success)";
  } else if (kind === "finding") {
    Icon = ShieldAlert;
    title = data.title ?? data.event_name;
    desc = [data.username, data.source_ip, data.ai_category].filter(Boolean).join(" · ");
    tag = `finding · ${data.source}`;
    color = data.ai_severity === "critical" ? "var(--critical)" : "var(--warning)";
  } else if (kind === "report") {
    Icon = FileText;
    title = data.title;
    desc = data.executive_summary?.slice(0, 160) ?? "";
    tag = `report · ${data.severity}`;
    color = data.severity === "critical" ? "var(--critical)" : "var(--accent)";
  }

  return (
    <li className="relative pl-12">
      <div
        className="absolute left-0 top-1 grid h-7 w-7 place-items-center rounded-full border bg-background"
        style={{ borderColor: color, boxShadow: `0 0 14px ${color}55` }}
      >
        <Icon className="h-3.5 w-3.5" style={{ color }} />
      </div>
      <div className="rounded-lg border border-border bg-card/50 p-4 card-elevated">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-sm font-semibold">{title}</span>
          <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {tag}
          </span>
        </div>
        {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
        <p
          className="mt-2 font-mono text-[10px] text-muted-foreground/70"
          title={format(new Date(ts), "PPpp")}
        >
          {formatDistanceToNow(new Date(ts), { addSuffix: true })}
        </p>
      </div>
    </li>
  );
}
