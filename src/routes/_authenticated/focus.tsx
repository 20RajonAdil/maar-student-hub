/**
 * Focus Room — Pomodoro timer.
 *
 * Accuracy: the running timer stores its `startedAt` timestamp in localStorage.
 * Every render (and every 500ms tick) we compute elapsed = now - startedAt,
 * so the timer is correct even if the tab was minimised, the browser paused
 * timers, or the page was refreshed.
 *
 * On completion or manual stop, we insert a row into focus_sessions.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getUserId } from "@/lib/app-utils";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Pause, Square } from "lucide-react";

export const Route = createFileRoute("/_authenticated/focus")({
  head: () => ({ meta: [{ title: "Focus — MAAR" }] }),
  component: FocusPage,
});

type TimerState = {
  startedAt: number;      // epoch ms
  plannedSeconds: number;
  pausedElapsed: number;  // seconds accumulated before current run
  running: boolean;
};

const KEY = "maar-focus-timer";

function loadState(): TimerState | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; }
}
function saveState(s: TimerState | null) {
  if (s) localStorage.setItem(KEY, JSON.stringify(s));
  else localStorage.removeItem(KEY);
}

function FocusPage() {
  const qc = useQueryClient();
  const [planned, setPlanned] = useState(25); // minutes
  const [state, setState] = useState<TimerState | null>(null);
  const [, force] = useState(0);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load persisted state on mount (client-only)
  useEffect(() => {
    setState(loadState());
  }, []);

  // Tick every 500ms while running
  useEffect(() => {
    if (state?.running) {
      ticker.current = setInterval(() => force(x => x + 1), 500);
      return () => { if (ticker.current) clearInterval(ticker.current); };
    }
  }, [state?.running]);

  const elapsed = state
    ? state.pausedElapsed + (state.running ? Math.floor((Date.now() - state.startedAt) / 1000) : 0)
    : 0;
  const remaining = state ? Math.max(0, state.plannedSeconds - elapsed) : planned * 60;

  const log = useMutation({
    mutationFn: async ({ actual, plannedSecs }: { actual: number; plannedSecs: number }) => {
      const uid = await getUserId();
      const { error } = await supabase.from("focus_sessions").insert({
        user_id: uid,
        mode: "pomodoro",
        planned_seconds: plannedSecs,
        actual_seconds: actual,
        started_at: new Date(Date.now() - actual * 1000).toISOString(),
        ended_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["focus-history"] }),
  });

  function start() {
    const s: TimerState = { startedAt: Date.now(), plannedSeconds: planned * 60, pausedElapsed: 0, running: true };
    setState(s); saveState(s);
  }
  function pause() {
    if (!state) return;
    const s: TimerState = { ...state, running: false, pausedElapsed: elapsed, startedAt: Date.now() };
    setState(s); saveState(s);
  }
  function resume() {
    if (!state) return;
    const s: TimerState = { ...state, running: true, startedAt: Date.now() };
    setState(s); saveState(s);
  }
  function stop() {
    if (!state) return;
    const actual = elapsed;
    log.mutate({ actual, plannedSecs: state.plannedSeconds });
    setState(null); saveState(null);
    toast.success(`Session logged — ${Math.floor(actual/60)}m ${actual%60}s`);
  }

  // Auto-log when timer reaches 0
  useEffect(() => {
    if (state && remaining === 0 && state.running) {
      const actual = state.plannedSeconds;
      log.mutate({ actual, plannedSecs: state.plannedSeconds });
      setState(null); saveState(null);
      toast.success("Focus session complete 🎉");
    }
  }, [state, remaining, log]);

  const history = useQuery({
    queryKey: ["focus-history"],
    queryFn: async () => {
      const uid = await getUserId();
      const { data } = await supabase.from("focus_sessions").select("*").eq("user_id", uid).order("started_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <AppShell title="Focus Room">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col items-center gap-6 py-14">
            <div className="text-center">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {state ? (state.running ? "Focus in progress" : "Paused") : "Ready when you are"}
              </p>
              <p className="font-display mt-4 text-8xl font-semibold tabular-nums text-foreground">
                {mm}:{ss}
              </p>
            </div>

            {!state && (
              <div className="flex items-end gap-3">
                <div className="space-y-1.5">
                  <Label>Session length (min)</Label>
                  <Input type="number" min={5} max={240} value={planned} onChange={e => setPlanned(Math.max(1, Number(e.target.value) || 1))} className="w-32" />
                </div>
                <Button size="lg" onClick={start}><Play className="h-5 w-5" /> Start</Button>
              </div>
            )}
            {state && (
              <div className="flex gap-2">
                {state.running ? (
                  <Button size="lg" variant="outline" onClick={pause}><Pause className="h-5 w-5" /> Pause</Button>
                ) : (
                  <Button size="lg" onClick={resume}><Play className="h-5 w-5" /> Resume</Button>
                )}
                <Button size="lg" variant="destructive" onClick={stop}><Square className="h-5 w-5" /> Stop &amp; log</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent sessions</CardTitle></CardHeader>
          <CardContent>
            {!history.data?.length && <p className="py-6 text-center text-sm text-muted-foreground">No sessions yet.</p>}
            <ul className="divide-y divide-border">
              {history.data?.map(s => (
                <li key={s.id} className="py-2.5 text-sm">
                  <p className="font-medium">{Math.floor(s.actual_seconds/60)}m {s.actual_seconds%60}s</p>
                  <p className="text-xs text-muted-foreground">{new Date(s.started_at).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
