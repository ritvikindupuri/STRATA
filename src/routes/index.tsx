import { createFileRoute, Link } from "@tanstack/react-router";
import { LogoMark } from "@/components/Logo";
import { HeroCanvas } from "@/components/HeroCanvas";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/30 bg-background/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <LogoMark />
          <Link
            to="/login"
            className="group inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/40 px-4 py-1.5 text-xs font-medium tracking-wide hover:border-primary/50 hover:text-primary transition-colors"
          >
            Launch console
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-screen">
        <div className="absolute inset-0 bg-grid opacity-[0.07]" />
        <div className="absolute inset-0">
          <HeroCanvas />
        </div>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 50% at 50% 35%, transparent, var(--background) 75%)" }}
        />

        <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 text-center">
          <LiveBadge />

          <h1 className="animate-float-up mt-6 font-display text-[clamp(2.75rem,7vw,5.5rem)] font-semibold leading-[0.95] tracking-tight" style={{ animationDelay: "80ms" }}>
            See every layer
            <br />
            <span className="text-gradient">of your cloud.</span>
          </h1>

          <p className="animate-float-up mt-6 max-w-md text-[15px] text-muted-foreground" style={{ animationDelay: "160ms" }}>
            AI intrusion detection for AWS. CloudTrail and GuardDuty, triaged in seconds.
          </p>

          <div className="animate-float-up mt-9 flex items-center gap-3" style={{ animationDelay: "240ms" }}>
            <Link
              to="/login"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 glow-ring"
            >
              Connect AWS
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <a
              href="#layers"
              className="rounded-full border border-border/60 px-6 py-3 text-sm font-medium hover:border-primary/50 transition-colors"
            >
              See it work
            </a>
          </div>

          <p className="animate-float-up mt-10 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70" style={{ animationDelay: "320ms" }}>
            read-only iam · keys stay yours
          </p>
        </div>

        <div className="absolute inset-x-0 bottom-8 flex justify-center text-muted-foreground/40">
          <div className="h-10 w-px bg-gradient-to-b from-transparent via-primary/40 to-transparent" />
        </div>
      </section>

      {/* The five layers */}
      <section id="layers" className="relative border-t border-border/30 py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-16 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">005 / strata</p>
              <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">
                Five layers.<br />One signal.
              </h2>
            </div>
            <p className="max-w-sm text-sm text-muted-foreground md:text-right">
              Every AWS event is correlated across identity, API, network, data and control planes — then mapped to MITRE ATT&CK.
            </p>
          </div>

          <div className="mt-16 divide-y divide-border/40 border-y border-border/40">
            <Layer n="L1" name="Identity" mono="iam" desc="Console logins, AssumeRole, MFA changes." />
            <Layer n="L2" name="API" mono="cloudtrail" desc="Every management call signed and audited." />
            <Layer n="L3" name="Network" mono="vpc" desc="Security group mutations and ingress." />
            <Layer n="L4" name="Data" mono="s3 · kms" desc="Bucket policy, GetSecretValue, Decrypt." />
            <Layer n="L5" name="Control" mono="guardduty" desc="Native AWS threat intel, AI-enriched." />
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="relative border-t border-border/30 py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-px overflow-hidden rounded-2xl border border-border/40 md:grid-cols-3">
            <Pillar k="01" title="Signed at the edge" desc="Native AWS SigV4. No agents, no log forwarders, no proxy." />
            <Pillar k="02" title="Gemini triage" desc="Severity, MITRE technique, plain-English remediation — per event." />
            <Pillar k="03" title="Zero trust by design" desc="Secrets written by the server role. Postgres RLS enforces it." />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative border-t border-border/30 py-32">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
            Three minutes to a<br />
            <span className="text-gradient">watched cloud.</span>
          </h2>
          <Link
            to="/login"
            className="group mt-10 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground hover:opacity-90 glow-ring"
          >
            Begin
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/30 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 sm:flex-row">
          <LogoMark />
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60">
            © {new Date().getFullYear()} strata · all layers watched
          </p>
        </div>
      </footer>
    </div>
  );
}

function LiveBadge() {
  const [count, setCount] = useState(1284);
  useEffect(() => {
    const i = setInterval(() => setCount((c) => c + Math.floor(Math.random() * 3) + 1), 1400);
    return () => clearInterval(i);
  }, []);
  return (
    <div className="animate-float-up inline-flex items-center gap-2.5 rounded-full border border-border/60 bg-background/40 px-3.5 py-1.5 backdrop-blur">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-primary" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        live · <span className="text-foreground tabular-nums">{count.toLocaleString()}</span> events / 24h
      </span>
    </div>
  );
}

function Layer({ n, name, mono, desc }: { n: string; name: string; mono: string; desc: string }) {
  return (
    <div className="group grid grid-cols-[auto_1fr_auto] items-center gap-6 py-6 transition-colors hover:bg-primary/[0.03] md:gap-10 md:py-8">
      <span className="font-mono text-xs text-muted-foreground/60">{n}</span>
      <div>
        <h3 className="font-display text-xl font-medium md:text-2xl">{name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      </div>
      <span className="hidden font-mono text-[10px] uppercase tracking-[0.25em] text-primary/70 sm:inline">
        {mono}
      </span>
    </div>
  );
}

function Pillar({ k, title, desc }: { k: string; title: string; desc: string }) {
  return (
    <div className="bg-card/40 p-8 transition-colors hover:bg-card/70">
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary/70">{k}</span>
      <h3 className="mt-5 font-display text-lg font-medium">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
