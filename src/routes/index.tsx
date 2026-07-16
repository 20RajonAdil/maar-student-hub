/**
 * Public landing page. Explains the product, drives sign-up.
 * Session-aware CTA: shows "Dashboard" once signed in.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/Logo";
import { Footer } from "@/components/brand/Footer";
import { Button } from "@/components/ui/button";
import {
  CalendarClock,
  NotebookPen,
  ListChecks,
  Timer,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MAAR Student Hub — Everything a student needs. One place." },
      { name: "description", content: "Timetable, notes, homework, focus and study tools in one calm workspace built for students." },
      { property: "og:title", content: "MAAR Student Hub" },
      { property: "og:description", content: "Everything a student needs. One place." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Logo />
          <nav className="flex items-center gap-2">
            {signedIn ? (
              <Button asChild><Link to="/dashboard">Open dashboard</Link></Button>
            ) : (
              <>
                <Button asChild variant="ghost"><Link to="/auth">Sign in</Link></Button>
                <Button asChild><Link to="/auth" search={{ mode: "signup" }}>Get started</Link></Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="hero-bg relative overflow-hidden">
          <div className="mx-auto max-w-6xl px-6 py-24 text-center sm:py-32">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3 w-3 text-creative" /> Built for students, not for algorithms
            </span>
            <h1 className="mt-6 font-display text-5xl font-semibold tracking-tight text-foreground sm:text-6xl md:text-7xl">
              Everything a student needs.<br />
              <span className="text-brand">One place.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Your timetable, notes, homework, focus sessions and study tools —
              organised, calm, and always in sync. Stop switching between ten apps to study.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/auth" search={{ mode: "signup" }}>Start free — takes 30 seconds</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth">I already have an account</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              <ShieldCheck className="mr-1 inline h-3 w-3" /> Your data is private. Row-level security on every table.
            </p>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">
              One workspace. Every study need.
            </h2>
            <p className="mt-3 text-muted-foreground">Designed by looking at what Notion, Anki, Todoist and Google Classroom get right — and fixing what they miss.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Feature icon={CalendarClock} title="Smart Timetable" desc="Daily, weekly and monthly views. Recurring lessons, exams, revision blocks and reminders — with conflict detection." tint="brand" />
            <Feature icon={NotebookPen} title="Notes that scale" desc="Notebooks per subject, tags, rich formatting, autosave and instant search across everything you've ever written." tint="success" />
            <Feature icon={ListChecks} title="Homework, sorted" desc="Priority, deadline, estimated time. Filter by subject or urgency. Nothing falls through the cracks." tint="warning" />
            <Feature icon={Timer} title="Focus Room" desc="Timestamp-accurate Pomodoro that survives refreshes and tab switches. Session history you can trust." tint="brand" />
            <Feature icon={Sparkles} title="Source-based study help (soon)" desc="An assistant that only answers from your uploaded materials — no hallucinations, no invented facts." tint="creative" />
            <Feature icon={ShieldCheck} title="Private by design" desc="Every row locked to you via row-level security. Google sign-in and email supported. No data selling. Ever." tint="success" />
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-4xl px-6 pb-24">
          <div className="rounded-3xl border border-border bg-gradient-to-br from-brand to-brand/85 p-10 text-center text-brand-foreground shadow-lift">
            <h3 className="font-display text-3xl font-semibold">Ready to study like it's 2026?</h3>
            <p className="mt-3 text-brand-foreground/80">Free while we build. Your data stays yours.</p>
            <div className="mt-6">
              <Button asChild size="lg" variant="secondary">
                <Link to="/auth" search={{ mode: "signup" }}>Create your account</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  desc,
  tint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  tint: "brand" | "success" | "warning" | "creative";
}) {
  const tintMap = {
    brand: "bg-brand/10 text-brand",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    creative: "bg-creative/15 text-creative",
  } as const;
  return (
    <article className="group rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:shadow-lift">
      <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${tintMap[tint]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-card-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </article>
  );
}
