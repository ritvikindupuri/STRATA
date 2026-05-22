import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo, LogoMark } from "@/components/Logo";
import { HeroCanvas } from "@/components/HeroCanvas";
import { ArrowUpRight, KeyRound, Network, Database, Cpu, ShieldCheck, Bot, FileText, Lock } from "lucide-react";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/30 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <LogoMark animated />
          <Link
            to="/login"
            className="group inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/40 px-4 py-1.5 text-xs font-medium tracking-wide text-foreground hover:border-primary/50 hover:text-primary transition-colors"
          >
            Launch
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-screen">
        <div className="absolute inset-0 bg-grid opacity-[0.05]" />
        <div className="absolute inset-0"><HeroCanvas /></div>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 65% 55% at 50% 38%, transparent, var(--background) 78%)" }}
        />

        <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 text-center">
          <div className="animate-float-up mb-8 grid h-20 w-20 place-items-center rounded-2xl border border-border/60 bg-background/40 backdrop-blur-xl shadow-[0_0_60px_-15px_var(--primary)]">
            <Logo size={48} animated />
          </div>

          <p
            className="animate-float-up font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground"
            style={{ animationDelay: "60ms" }}
          >
            AI cloud intrusion detection · AWS
          </p>

          <h1
            className="animate-float-up mt-5 font-display text-[clamp(2.5rem,7vw,5.25rem)] font-semibold leading-[0.98] tracking-tight"
            style={{ animationDelay: "140ms" }}
          >
            Autonomous defense<br />
            <span className="text-gradient">for your cloud.</span>
          </h1>

          <p
            className="animate-float-up mt-6 max-w-md text-[15px] leading-relaxed text-muted-foreground"
            style={{ animationDelay: "220ms" }}
          >
            Connect a read-only AWS key. Strata's agents draft detection rules, triage
            CloudTrail and GuardDuty signals, and write incident reports on their own.
          </p>

          <div className="animate-float-up mt-9 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "300ms" }}>
            <Link
              to="/login"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 glow-ring"
            >
              Connect AWS
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <a
              href="#how"
              className="rounded-full border border-border/60 px-6 py-3 text-sm font-medium text-foreground hover:border-primary/50 hover:text-primary transition-colors"
            >
              How it works
            </a>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-8 flex justify-center">
          <div className="h-10 w-px bg-gradient-to-b from-transparent via-primary/40 to-transparent" />
        </div>
      </section>

      {/* Layers */}
      <section id="layers" className="relative border-t border-border/30 py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <h2 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
              Five layers.<br /><span className="text-gradient">One signal.</span>
            </h2>
            <p className="max-w-xs text-sm text-muted-foreground">
              Every AWS event is correlated across the stack and mapped to MITRE ATT&CK.
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

      {/* How it works */}
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
              desc="Paste a read-only IAM access key. Strata validates it with sts:GetCallerIdentity and stores it encrypted with AES-256-GCM."
            />
            <Step
              i="02"
              icon={Bot}
              title="Agents draft your rules"
              desc="Gemini reads your account shape and writes a tailored detection ruleset, tagged with MITRE techniques and severity."
            />
            <Step
              i="03"
              icon={ShieldCheck}
              title="Continuous triage & containment"
              desc="CloudTrail and GuardDuty events stream in and are triaged on every cycle. With auto-response enabled, compromised IAM keys are disabled automatically."
            />
            <Step
              i="04"
              icon={FileText}
              title="Incident reports, written for you"
              desc="When related findings cluster, agents stitch them into a timeline, executive summary, and remediation plan."
              last
            />
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="relative border-t border-border/30 py-32">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <Logo size={40} className="mx-auto opacity-90" />
          <h2 className="mt-6 font-display text-4xl font-semibold tracking-tight md:text-5xl">
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

function Layer({ icon: Icon, name, mono }: { icon: any; name: string; mono: string }) {
  return (
    <div className="group bg-card/40 p-6 transition-colors hover:bg-card/80">
      <Icon className="h-5 w-5 text-primary transition-transform group-hover:scale-110" strokeWidth={1.5} />
      <h3 className="mt-4 font-display text-lg font-medium text-foreground">{name}</h3>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">{mono}</p>
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
