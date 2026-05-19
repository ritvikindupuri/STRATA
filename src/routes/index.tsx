import { createFileRoute, Link } from "@tanstack/react-router";
import { LogoMark, Logo } from "@/components/Logo";
import heroBg from "@/assets/argus-hero-bg.jpg";
import { ArrowRight, Cloud, Eye, ShieldAlert, Sparkles, Activity, Lock, Zap } from "lucide-react";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <LogoMark />
          <nav className="hidden gap-8 text-sm text-muted-foreground md:flex">
            <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#aws" className="hover:text-foreground transition-colors">AWS</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
            <Link to="/login" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity glow-ring">
              Launch console
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-24">
        <div className="absolute inset-0 -z-10">
          <img src={heroBg} alt="" className="h-full w-full object-cover opacity-40" width={1920} height={1080} />
          <div className="absolute inset-0 bg-grid opacity-30" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 40%, var(--background) 100%)" }} />
        </div>

        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-4xl text-center">
            <div className="animate-float-up inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-primary" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Live · Watching AWS in real time
            </div>

            <h1 className="animate-float-up mt-8 font-display text-5xl font-bold tracking-tight md:text-7xl" style={{ animationDelay: "0.1s" }}>
              The all-seeing watchman for your <span className="text-gradient">AWS cloud</span>
            </h1>

            <p className="animate-float-up mx-auto mt-6 max-w-2xl text-lg text-muted-foreground" style={{ animationDelay: "0.2s" }}>
              ARGUS ingests every CloudTrail event and GuardDuty finding from your account, then a multi-model AI brain triages each signal into severity, attack category, and a specific remediation — in seconds.
            </p>

            <div className="animate-float-up mt-10 flex flex-wrap items-center justify-center gap-4" style={{ animationDelay: "0.3s" }}>
              <Link to="/login" className="group inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground transition-all hover:opacity-90 glow-ring">
                Connect your AWS account
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a href="#how" className="inline-flex items-center gap-2 rounded-md border border-border bg-card/40 px-6 py-3 font-medium hover:bg-card transition-colors">
                How it works
              </a>
            </div>

            <p className="animate-float-up mt-4 font-mono text-xs text-muted-foreground" style={{ animationDelay: "0.4s" }}>
              read-only IAM · keys never leave your tenant · zero install
            </p>
          </div>

          {/* Animated radar mock */}
          <div className="animate-float-up mx-auto mt-20 max-w-5xl" style={{ animationDelay: "0.5s" }}>
            <RadarMock />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border/40 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-widest text-primary">// capabilities</p>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight">Built for the moment things go wrong.</h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            <Feature icon={Eye} title="Continuous AWS telemetry" desc="Pulls CloudTrail LookupEvents and GuardDuty findings on demand using read-only SigV4-signed calls — no agents, no log forwarders." />
            <Feature icon={Sparkles} title="AI threat triage" desc="Each event is analyzed by Gemini 2.5 Flash to classify attack category, set severity, and write a precise remediation step." />
            <Feature icon={ShieldAlert} title="Severity-first inbox" desc="Critical and high-severity events surface to the top. Drill into the raw AWS payload one click away." />
            <Feature icon={Lock} title="Zero-trust credentials" desc="Your AWS secret keys are written only via the server role and never exposed to the browser — Postgres RLS enforces it." />
            <Feature icon={Activity} title="CloudTrail + GuardDuty fusion" desc="Two signal sources unified into one timeline. We focus AI budget on the events that actually matter." />
            <Feature icon={Zap} title="Real-time sync" desc="Trigger a sync from the console and findings appear seconds later, fully analyzed and ready to action." />
          </div>
        </div>
      </section>

      {/* How */}
      <section id="how" className="border-t border-border/40 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <p className="font-mono text-xs uppercase tracking-widest text-primary">// how it works</p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight">Three steps to a watched cloud.</h2>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            <Step n="01" title="Create a read-only IAM user" desc="Argus walks you through the exact AWS Console steps and gives you the precise managed policies to attach — copy-paste ready." />
            <Step n="02" title="Paste your access keys" desc="We validate the keys instantly with sts:GetCallerIdentity and surface your Account ID and ARN so you know the connection is real." />
            <Step n="03" title="Hit Sync" desc="Argus pulls the latest 24h of CloudTrail + GuardDuty signals, runs them through Gemini, and lights up the dashboard." />
          </div>
        </div>
      </section>

      {/* AWS section */}
      <section id="aws" className="border-t border-border/40 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-primary">// aws integration</p>
              <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight">Native AWS. No agents.</h2>
              <p className="mt-4 text-muted-foreground">Argus signs every API call to AWS itself using Signature V4 — the same protocol the official AWS SDKs use. No third-party broker, no extra infrastructure in your account.</p>
              <ul className="mt-6 space-y-3 text-sm">
                {["sts:GetCallerIdentity — instant key validation", "cloudtrail:LookupEvents — 24h management-event window", "guardduty:ListFindings + GetFindings — full finding payloads", "Read-only managed policies, nothing else"].map((t) => (
                  <li key={t} className="flex items-start gap-3"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />{t}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-card p-8 card-elevated">
              <div className="font-mono text-xs text-muted-foreground">// permissions required</div>
              <div className="mt-4 space-y-2 font-mono text-sm">
                <Perm>AWSCloudTrailReadOnlyAccess</Perm>
                <Perm>AmazonGuardDutyReadOnlyAccess</Perm>
              </div>
              <div className="mt-6 rounded-lg bg-background/50 p-4">
                <div className="font-mono text-xs text-muted-foreground">// step-by-step wizard inside</div>
                <Link to="/login" className="mt-3 inline-flex items-center gap-2 text-sm text-primary hover:opacity-80">
                  Open the connection wizard <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/40 py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <Cloud className="mx-auto h-12 w-12 text-primary" />
          <h2 className="mt-6 font-display text-4xl font-semibold tracking-tight">Stop reacting. Start <span className="text-gradient">watching</span>.</h2>
          <Link to="/login" className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground hover:opacity-90 glow-ring">
            Get started — free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/40 py-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 text-sm text-muted-foreground">
          <LogoMark />
          <p className="font-mono text-xs">© ARGUS · Hackathon build · {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card/60 p-6 transition-all hover:border-primary/40 hover:bg-card card-elevated">
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <Icon className="h-8 w-8 text-primary" />
      <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-6 card-elevated">
      <div className="font-mono text-3xl font-semibold text-gradient">{n}</div>
      <h3 className="mt-3 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function Perm({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-background/50 px-3 py-2">
      <span>{children}</span>
      <span className="text-xs text-primary">AWS managed</span>
    </div>
  );
}

function RadarMock() {
  return (
    <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-border bg-card/40 card-elevated">
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="absolute left-1/2 top-1/2 h-[140%] w-[140%] -translate-x-1/2 -translate-y-1/2">
        <div className="absolute inset-0 animate-radar" style={{ background: "conic-gradient(from 0deg, transparent 0deg, oklch(0.82 0.16 200 / 0.35) 30deg, transparent 60deg)" }} />
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/20" style={{ width: `${(i + 1) * 18}%`, aspectRatio: 1 }} />
      ))}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <Logo size={48} />
      </div>
      <div className="absolute left-6 top-6 font-mono text-xs text-primary">
        argus@aws ~ # <span className="animate-shimmer">scanning</span>
      </div>
      <div className="absolute bottom-6 left-6 right-6 grid grid-cols-3 gap-3 font-mono text-xs">
        <Stat label="events / 24h" value="1,284" />
        <Stat label="critical" value="3" tone="critical" />
        <Stat label="ai accuracy" value="98.2%" />
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "critical" }) {
  return (
    <div className="rounded-md border border-border bg-background/60 px-3 py-2 backdrop-blur">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold ${tone === "critical" ? "text-[color:var(--critical)]" : "text-foreground"}`}>{value}</div>
    </div>
  );
}
