/**
 * Dashboard — the personalised today view. Redirects to onboarding
 * if the profile hasn't been completed yet.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getUserId, formatTime } from "@/lib/app-utils";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarClock,
  NotebookPen,
  ListChecks,
  Timer,
  Plus,
  Flame,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — MAAR" }] }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const uid = await getUserId();
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(start); end.setDate(start.getDate() + 1);
      const weekEnd = new Date(start); weekEnd.setDate(start.getDate() + 7);

      const [profile, todayEvents, dueSoon, recentNotes, sessionsWeek] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("timetable_events").select("*").eq("user_id", uid)
          .gte("starts_at", start.toISOString()).lt("starts_at", end.toISOString())
          .order("starts_at"),
        supabase.from("homework").select("*").eq("user_id", uid).neq("status", "done")
          .lte("due_at", weekEnd.toISOString()).order("due_at").limit(5),
        supabase.from("notes").select("id,title,updated_at").eq("user_id", uid)
          .order("updated_at", { ascending: false }).limit(5),
        supabase.from("focus_sessions").select("actual_seconds,started_at")
          .eq("user_id", uid).gte("started_at", new Date(start.getTime() - 6 * 86400000).toISOString()),
      ]);
      return {
        profile: profile.data,
        todayEvents: todayEvents.data ?? [],
        dueSoon: dueSoon.data ?? [],
        recentNotes: recentNotes.data ?? [],
        sessionsWeek: sessionsWeek.data ?? [],
      };
    },
  });

  // Onboarding gate
  useEffect(() => {
    if (data?.profile && !data.profile.onboarding_completed) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [data?.profile, navigate]);

  const totalFocusMin = Math.round(
    (data?.sessionsWeek.reduce((s, x) => s + (x.actual_seconds ?? 0), 0) ?? 0) / 60,
  );
  const streak = calcStreak(data?.sessionsWeek ?? []);

  const greeting = greet();
  const firstName = (data?.profile?.full_name ?? "").split(" ")[0] || "there";

  return (
    <AppShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{greeting},</p>
          <h1 className="font-display text-3xl font-semibold">{firstName} 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground">Here's your day at a glance.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm"><Link to="/homework"><Plus className="h-4 w-4" /> Homework</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to="/notes"><Plus className="h-4 w-4" /> Note</Link></Button>
          <Button asChild size="sm"><Link to="/focus"><Timer className="h-4 w-4" /> Focus now</Link></Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat icon={<Flame className="h-4 w-4 text-warning-foreground" />} label="Focus this week" value={`${totalFocusMin} min`} tint="warning" />
        <Stat icon={<Timer className="h-4 w-4 text-success" />} label="Study streak" value={`${streak} day${streak === 1 ? "" : "s"}`} tint="success" />
        <Stat icon={<ListChecks className="h-4 w-4 text-brand" />} label="Due this week" value={`${data?.dueSoon.length ?? 0}`} tint="brand" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base"><CalendarClock className="h-4 w-4" /> Today's timetable</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link to="/timetable">Open</Link></Button>
          </CardHeader>
          <CardContent>
            {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!isLoading && !data?.todayEvents.length && (
              <EmptyState text="Nothing scheduled today. Enjoy the calm — or plan tomorrow." href="/timetable" cta="Add event" />
            )}
            <ul className="divide-y divide-border">
              {data?.todayEvents.map(ev => (
                <li key={ev.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{ev.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(ev.starts_at)} — {formatTime(ev.ends_at)}
                      {ev.location && <> · {ev.location}</>}
                    </p>
                  </div>
                  <Badge variant="secondary">{ev.category}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base"><ListChecks className="h-4 w-4" /> Due soon</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link to="/homework">Open</Link></Button>
          </CardHeader>
          <CardContent>
            {!isLoading && !data?.dueSoon.length && <EmptyState text="No homework due this week." href="/homework" cta="Add homework" />}
            <ul className="divide-y divide-border">
              {data?.dueSoon.map(h => (
                <li key={h.id} className="py-3">
                  <p className="text-sm font-medium">{h.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {h.due_at ? new Date(h.due_at).toLocaleDateString(undefined, { weekday:"short", day:"numeric", month:"short" }) : "No date"}
                    {" · "} <span className="capitalize">{h.priority}</span>
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base"><NotebookPen className="h-4 w-4" /> Recent notes</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link to="/notes">Open</Link></Button>
          </CardHeader>
          <CardContent>
            {!isLoading && !data?.recentNotes.length && <EmptyState text="No notes yet — start with today's lesson." href="/notes" cta="New note" />}
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {data?.recentNotes.map(n => (
                <li key={n.id}>
                  <Link to="/notes" className="block rounded-lg border border-border p-3 transition-colors hover:bg-accent">
                    <p className="truncate text-sm font-medium">{n.title || "Untitled"}</p>
                    <p className="text-xs text-muted-foreground">Updated {new Date(n.updated_at).toLocaleDateString()}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function Stat({ icon, label, value, tint }: { icon: React.ReactNode; label: string; value: string; tint: "brand"|"success"|"warning" }) {
  const bg = { brand: "bg-brand/10", success: "bg-success/15", warning: "bg-warning/25" }[tint];
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ text, href, cta }: { text: string; href: string; cta: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border py-8 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
      <Button asChild size="sm" variant="outline" className="mt-3"><Link to={href}>{cta}</Link></Button>
    </div>
  );
}

function greet() {
  const h = new Date().getHours();
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** Count consecutive days (up to 30) with at least one focus session. */
function calcStreak(sessions: { started_at: string }[]) {
  if (!sessions.length) return 0;
  const days = new Set(sessions.map(s => new Date(s.started_at).toDateString()));
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 30; i++) {
    if (days.has(d.toDateString())) streak++;
    else if (i > 0) break;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
