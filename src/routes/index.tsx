import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo, LogoMark } from "@/components/Logo";
import { HeroCanvas } from "@/components/HeroCanvas";
import {
  ArrowUpRight,
  KeyRound,
  Network,
  Database,
  Cpu,
  ShieldCheck,
  Bot,
  FileText,
  Lock,
  Activity,
  Zap,
  Eye,
  GitBranch,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* NAV */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/30 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <LogoMark animated />
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#platform" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Platform</a>
            <a href="#agents" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Agents</a>
            <a href="#how" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it works</a>
            <a href="#security" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Security</a>
          </nav>
          <Link
            to="/login"
            className="group inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Launch
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </header>

      {/* HERO — split layout, left content + right live console */}
      <section className="relative pt-32 pb-24 lg:pt-40 lg:pb-32">
        <div className="absolute inset-0 bg-grid opacity-[0.04]" />
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[600px] w-[1100px] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
          style={{ background: "radial-gradient(ellipse at center, oklch(0.78 0.165 60 / 0.18), transparent 65%)" }} />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 lg:grid-cols-[1.05fr_1fr]">
          {/* LEFT */}
          <div>
            <div className="animate-float-up inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 backdrop-blur">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-primary" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                <span className="text-foreground">Strata v1</span> · agents online
              </span>
            </div>

            <h1
              className="animate-float-up mt-6 font-display text-[clamp(2.5rem,6vw,4.75rem)] font-semibold leading-[1.02] tracking-tight"
              style={{ animationDelay: "80ms" }}
            >
              Autonomous defense<br />
              <span className="text-gradient">for your AWS cloud.</span>
            </h1>

            <p
              className="animate-float-up mt-6 max-w-xl text-[16px] leading-relaxed text-muted-foreground"
              style={{ animationDelay: "160ms" }}
            >
              Connect a read-only AWS key. Strata's agents draft detection rules from
              your account shape, triage every CloudTrail and GuardDuty event,
              contain compromised credentials, and write the incident report — on their own.
            </p>

            <div className="animate-float-up mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "240ms" }}>
              <Link
                to="/login"
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 glow-ring"
              >
                Connect AWS
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <a
                href="#how"
                className="rounded-full border border-border/60 bg-card/30 px-6 py-3 text-sm font-medium text-foreground hover:border-primary/50 hover:text-primary transition-colors backdrop-blur"
              >
                See how it works
              </a>
            </div>

            {/* Trust strip */}
            <div className="animate-float-up mt-10 grid max-w-xl grid-cols-3 gap-6 border-t border-border/40 pt-6" style={{ animationDelay: "320ms" }}>
              <TrustItem k="AES-256" v="encryption at rest" />
              <TrustItem k="Read-only" v="IAM permissions" />
              <TrustItem k="< 3 min" v="to first detection" />
            </div>
          </div>

          {/* RIGHT — live console mock */}
          <div className="animate-float-up relative" style={{ animationDelay: "200ms" }}>
            <LiveConsole />
          </div>
        </div>
      </section>

      {/* PLATFORM — five layers, dense */}
      <section id="platform" className="relative border-t border-border/30 py-28">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeader
            tag="platform"
            title={<>Five layers. <span className="text-gradient">One signal.</span></>}
            blurb="Every AWS event is correlated across identity, API, network, data and control planes, then mapped to MITRE ATT&CK."
          />

          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-border/40 bg-border/40 sm:grid-cols-2 lg:grid-cols-5">
            <Layer icon={KeyRound} name="Identity" mono="iam · sts" />
            <Layer icon={Cpu}      name="API"      mono="cloudtrail" />
            <Layer icon={Network}  name="Network"  mono="vpc · flow" />
            <Layer icon={Database} name="Data"     mono="s3 · kms" />
            <Layer icon={ShieldCheck} name="Control" mono="guardduty" />
          </div>
        </div>
      </section>

      {/* AGENTS — feature grid */}
      <section id="agents" className="relative border-t border-border/30 py-28">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeader
            tag="agents"
            title={<>Six agents. <span className="text-gradient">Zero seats to hire.</span></>}
            blurb="Each agent owns one job. Together they replace the toil of a small SOC team."
          />

          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-border/40 bg-border/40 md:grid-cols-2 lg:grid-cols-3">
            <Feature icon={GitBranch} name="Rule Architect" desc="Reads your account shape and drafts a detection ruleset, MITRE-tagged and severity-scored." />
            <Feature icon={Activity}  name="Telemetry"     desc="Pulls CloudTrail and GuardDuty on every cycle, normalizes events into one stream." />
            <Feature icon={Eye}       name="Triage"        desc="Gemini classifies every event — category, severity, who, what, and a one-line summary." />
            <Feature icon={Zap}       name="Containment"   desc="When auto-response is on, compromised IAM access keys are deactivated on the spot." />
            <Feature icon={FileText}  name="Reporter"      desc="Clusters correlated findings into a timeline, executive summary and remediation plan." />
            <Feature icon={Sparkles}  name="Orchestrator"  desc="Runs the loop on a schedule — rules, sync, triage, contain, report — without you." />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="relative border-t border-border/30 py-28">
        <div className="mx-auto max-w-5xl px-6">
          <SectionHeader
            tag="how it works"
            title={<>Connect once. <span className="text-gradient">Agents handle the rest.</span></>}
            blurb=""
            center
          />

          <ol className="mt-14 space-y-0">
            <Step i="01" icon={Lock} title="Connect AWS" desc="Paste a read-only IAM access key. Strata validates it with sts:GetCallerIdentity and stores it encrypted with AES-256-GCM." />
            <Step i="02" icon={Bot} title="Agents draft your rules" desc="Gemini reads your account shape and writes a tailored detection ruleset, tagged with MITRE techniques and severity." />
            <Step i="03" icon={ShieldCheck} title="Continuous triage & containment" desc="Events stream in and are triaged on every cycle. With auto-response enabled, compromised IAM keys are disabled automatically." />
            <Step i="04" icon={FileText} title="Incident reports, written for you" desc="When related findings cluster, agents stitch them into a timeline, summary, and remediation plan." last />
          </ol>
        </div>
      </section>

      {/* SECURITY */}
      <section id="security" className="relative border-t border-border/30 py-28">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeader
            tag="security"
            title={<>Built like the systems <span className="text-gradient">it protects.</span></>}
            blurb=""
          />

          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-border/40 bg-border/40 md:grid-cols-3">
            <Pillar k="Read-only by default" v="Strata only attaches AWSCloudTrailReadOnlyAccess and AmazonGuardDutyReadOnlyAccess. Write access is opt-in, scoped to iam:UpdateAccessKey." />
            <Pillar k="Secrets never leave the server" v="AWS secret access keys are encrypted at rest with AES-256-GCM and only decrypted inside server functions — the browser never sees them." />
            <Pillar k="Auditable autonomy" v="Every agent action — rule created, event triaged, key disabled, report written — lands in the timeline with a full trail." />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative border-t border-border/30 py-28">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <Logo size={44} className="mx-auto opacity-90" animated />
          <h2 className="mt-6 font-display text-4xl font-semibold tracking-tight md:text-5xl">
            Three minutes to a<br /><span className="text-gradient">watched cloud.</span>
          </h2>
          <p className="mt-5 text-[15px] text-muted-foreground">No agents to deploy. No log shippers. Just a key.</p>
          <Link
            to="/login"
            className="group mt-9 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground hover:opacity-90 glow-ring"
          >
            Begin
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/30 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 sm:flex-row">
          <LogoMark />
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60">
            © {new Date().getFullYear()} strata · autonomous cloud defense
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ---------- pieces ---------- */

function TrustItem({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="font-display text-lg font-semibold text-foreground">{k}</div>
      <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{v}</div>
    </div>
  );
}

function SectionHeader({ tag, title, blurb, center = false }: { tag: string; title: React.ReactNode; blurb?: string; center?: boolean }) {
  return (
    <div className={center ? "text-center" : "flex flex-col gap-6 md:flex-row md:items-end md:justify-between"}>
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">{tag}</p>
        <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">{title}</h2>
      </div>
      {blurb && <p className={`max-w-sm text-[15px] leading-relaxed text-muted-foreground ${center ? "mx-auto mt-4" : ""}`}>{blurb}</p>}
    </div>
  );
}

function Layer({ icon: Icon, name, mono }: { icon: any; name: string; mono: string }) {
  return (
    <div className="group bg-card/50 p-6 transition-colors hover:bg-card">
      <Icon className="h-5 w-5 text-primary transition-transform group-hover:scale-110" strokeWidth={1.5} />
      <h3 className="mt-4 font-display text-lg font-medium text-foreground">{name}</h3>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">{mono}</p>
    </div>
  );
}

function Feature({ icon: Icon, name, desc }: { icon: any; name: string; desc: string }) {
  return (
    <div className="group bg-card/50 p-7 transition-colors hover:bg-card">
      <div className="grid h-10 w-10 place-items-center rounded-lg border border-primary/30 bg-primary/[0.06] text-primary">
        <Icon className="h-4.5 w-4.5" strokeWidth={1.5} />
      </div>
      <h3 className="mt-5 font-display text-lg font-medium text-foreground">{name}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}

function Pillar({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-card/50 p-7">
      <h3 className="font-display text-lg font-medium text-foreground">{k}</h3>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{v}</p>
    </div>
  );
}

function Step({ i, icon: Icon, title, desc, last = false }: { i: string; icon: any; title: string; desc: string; last?: boolean }) {
  return (
    <li className="relative grid grid-cols-[auto_1fr] gap-6 pb-12 last:pb-0 md:gap-10">
      <div className="relative flex flex-col items-center">
        <div className="grid h-12 w-12 place-items-center rounded-xl border border-primary/30 bg-primary/[0.05] text-primary">
          <Icon className="h-5 w-5" strokeWidth={1.5} />
        </div>
        {!last && <div className="mt-2 w-px flex-1 bg-gradient-to-b from-primary/40 via-border/40 to-transparent" />}
      </div>
      <div className="pt-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary/80">{i}</p>
        <h3 className="mt-2 font-display text-2xl font-medium tracking-tight text-foreground">{title}</h3>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-foreground">{desc}</p>
      </div>
    </li>
  );
}

/* ---------- Live console mock ---------- */

const CONSOLE_LINES: { t: string; tag: string; tone: "info" | "warn" | "crit" | "ok" }[] = [
  { t: "agent.rule.architect → drafted 14 rules for account 9132••••", tag: "rules",     tone: "info" },
  { t: "cloudtrail → ConsoleLogin (us-east-1) · root · 92.118.4.21",    tag: "auth",     tone: "warn" },
  { t: "agent.triage → severity=high · category=credential_access",     tag: "triage",   tone: "warn" },
  { t: "guardduty → UnauthorizedAccess:IAMUser/MaliciousIPCaller",      tag: "gd",       tone: "crit" },
  { t: "agent.contain → iam:UpdateAccessKey AKIAX••• → Inactive",       tag: "contain",  tone: "crit" },
  { t: "agent.reporter → incident #2317 · 6 findings · timeline ✓",     tag: "report",   tone: "ok"   },
  { t: "cloudtrail → CreateUser (us-east-1) · admin · 10.4.0.12",       tag: "iam",      tone: "info" },
  { t: "agent.triage → severity=low · category=normal_admin",           tag: "triage",   tone: "info" },
];

function LiveConsole() {
  const [visible, setVisible] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setVisible((v) => (v >= CONSOLE_LINES.length ? 1 : v + 1)), 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative">
      {/* glow */}
      <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-primary/15 via-transparent to-accent/15 blur-2xl" />

      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl card-elevated">
        {/* canvas backdrop */}
        <div className="relative h-40 border-b border-border/50">
          <HeroCanvas />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-card/80" />
          <div className="absolute left-4 top-3 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[color:var(--critical)]/70" />
            <span className="h-2 w-2 rounded-full bg-[color:var(--warning)]/70" />
            <span className="h-2 w-2 rounded-full bg-[color:var(--success)]/70" />
          </div>
          <div className="absolute right-4 top-3 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            strata · live
          </div>
        </div>

        {/* console */}
        <div className="space-y-1.5 p-4 font-mono text-[12px] leading-relaxed">
          {CONSOLE_LINES.slice(0, visible).map((l, i) => (
            <div
              key={i}
              className="flex items-start gap-3 animate-float-up"
              style={{ animationDuration: "350ms" }}
            >
              <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                style={{
                  background:
                    l.tone === "crit" ? "var(--critical)" :
                    l.tone === "warn" ? "var(--warning)" :
                    l.tone === "ok"   ? "var(--success)"  :
                                        "var(--primary)",
                  boxShadow:
                    l.tone === "crit" ? "0 0 10px var(--critical)" :
                    l.tone === "warn" ? "0 0 10px var(--warning)" :
                    l.tone === "ok"   ? "0 0 10px var(--success)"  :
                                        "0 0 10px var(--primary)",
                }}
              />
              <span className="w-16 shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">{l.tag}</span>
              <span className="flex-1 text-foreground/90">{l.t}</span>
            </div>
          ))}
          {/* cursor */}
          <div className="flex items-center gap-3 pt-1">
            <span className="ml-[10px] inline-block h-3 w-1.5 animate-shimmer bg-primary" />
          </div>
        </div>

        {/* footer chips */}
        <div className="flex items-center justify-between border-t border-border/50 bg-background/30 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          <span>region · us-east-1</span>
          <span><span className="text-foreground">14</span> rules</span>
          <span><span className="text-[color:var(--critical)]">2</span> contained</span>
        </div>
      </div>
    </div>
  );
}
