import { createFileRoute, Link } from "@tanstack/react-router";
import { LogoMark } from "@/components/Logo";
import { HeroCanvas } from "@/components/HeroCanvas";
import { ArrowUpRight, KeyRound, Network, Database, Cpu, ShieldCheck, Bot, FileText, Lock } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/30 bg-background/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <LogoMark animated />
          <Link
            to="/login"
            className="group inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/40 px-4 py-1.5 text-xs font-medium tracking-wide hover:border-primary/50 hover:text-primary transition-colors"
          >
            Launch
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-screen">
        <div className="absolute inset-0 bg-grid opacity-[0.06]" />
        <div className="absolute inset-0"><HeroCanvas /></div>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 50% at 50% 35%, transparent, var(--background) 75%)" }}
        />

        <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 text-center">
          <LiveBadge />

          <h1
            className="animate-float-up mt-6 font-display text-[clamp(2.75rem,7vw,5.5rem)] font-semibold leading-[0.95] tracking-tight"
            style={{ animationDelay: "80ms" }}
          >
            Autonomous defense<br />
            <span className="text-gradient">for your cloud.</span>
          </h1>

          <p
            className="animate-float-up mt-6 max-w-sm text-[15px] text-muted-foreground"
            style={{ animationDelay: "160ms" }}
          >
            Strata's agents detect, triage, contain and report — without you.
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
              href="#how"
              className="rounded-full border border-border/60 px-6 py-3 text-sm font-medium hover:border-primary/50 transition-colors"
            >
              How it works
            </a>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-8 flex justify-center">
          <div className="h-10 w-px bg-gradient-to-b from-transparent via-primary/40 to-transparent" />
        </div>
      </section>

      {/* Layers — icons, no L1/L2 */}
      <section id="layers" className="relative border-t border-border/30 py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-end justify-between gap-10">
            <h2 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
              Five layers.<br /><span className="text-gradient">One signal.</span>
            </h2>
            <p className="hidden max-w-xs text-sm text-muted-foreground md:block">
              Every AWS event correlated across the stack, mapped to MITRE ATT&CK.
            </p>
          </div>

          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-border/40 sm:grid-cols-2 lg:grid-cols-5">
            <Layer icon={KeyRound} name="Identity" mono="iam" />
            <Layer icon={Cpu}      name="API"      mono="cloudtrail" />
            <Layer icon={Network}  name="Network"  mono="vpc" />
            <Layer icon={Database} name="Data"     mono="s3 · kms" />
            <Layer icon={ShieldCheck} name="Control" mono="guardduty" />
          </div>
        </div>
      </section>

      {/* How it works — clean four-step ladder */}
      <section id="how" className="relative border-t border-border/30 py-32">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">how it works</p>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">
              Connect once.<br /><span className="text-gradient">Agents handle the rest.</span>
            </h2>
          </div>

          <ol className="relative space-y-0">
            <Step
              i="01"
              icon={Lock}
              title="Connect AWS"
              desc="Paste a read-only IAM key. Validated with sts:GetCallerIdentity. Encrypted with AES-256-GCM at rest."
            />
            <Step
              i="02"
              icon={Bot}
              title="Agents draft your rules"
              desc="Gemini reads your account shape and writes a tailored detection ruleset — MITRE-tagged, severity-scored."
            />
            <Step
              i="03"
              icon={ShieldCheck}
              title="Live triage & containment"
              desc="CloudTrail and GuardDuty stream in. Each event is triaged. With auto-response on, compromised keys get disabled instantly."
            />
            <Step
              i="04"
              icon={FileText}
              title="Incident reports, written"
              desc="When patterns cluster, agents stitch them into a timeline, summary, and remediation plan you can hand to your team."
              last
            />
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="relative border-t border-border/30 py-32">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
            Three minutes to a<br /><span className="text-gradient">watched cloud.</span>
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
            © {new Date().getFullYear()} strata · autonomous cloud defense
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

function Layer({ icon: Icon, name, mono }: { icon: any; name: string; mono: string }) {
  return (
    <div className="group bg-card/40 p-6 transition-colors hover:bg-card/80">
      <Icon className="h-5 w-5 text-primary transition-transform group-hover:scale-110" strokeWidth={1.5} />
      <h3 className="mt-4 font-display text-lg font-medium">{name}</h3>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">{mono}</p>
    </div>
  );
}

function Step({ i, icon: Icon, title, desc, last = false }: { i: string; icon: any; title: string; desc: string; last?: boolean }) {
  return (
    <li className="relative grid grid-cols-[auto_1fr] gap-6 pb-12 last:pb-0 md:gap-10">
      {/* Rail */}
      <div className="relative flex flex-col items-center">
        <div className="grid h-12 w-12 place-items-center rounded-xl border border-primary/30 bg-primary/[0.04] text-primary">
          <Icon className="h-5 w-5" strokeWidth={1.5} />
        </div>
        {!last && <div className="mt-2 w-px flex-1 bg-gradient-to-b from-primary/40 via-border/40 to-transparent" />}
      </div>
      <div className="pt-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary/70">{i}</p>
        <h3 className="mt-2 font-display text-2xl font-medium tracking-tight">{title}</h3>
        <p className="mt-2 max-w-xl text-[15px] text-muted-foreground">{desc}</p>
      </div>
    </li>
  );
}
