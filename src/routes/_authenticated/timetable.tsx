/**
 * Timetable — week view. Create/edit/delete events with subject + category.
 * Conflict-aware rendering is basic (list per day); month/day views land in Phase 2.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getUserId, weekBounds, formatTime } from "@/lib/app-utils";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/timetable")({
  head: () => ({ meta: [{ title: "Timetable — MAAR" }] }),
  component: TimetablePage,
});

const CATEGORIES = ["lesson","revision","exam","homework","work","personal","reminder","other"] as const;

const eventSchema = z.object({
  title: z.string().trim().min(1, "Title required").max(140),
  subject_id: z.string().uuid().nullable(),
  category: z.enum(CATEGORIES),
  location: z.string().trim().max(140).nullable(),
  starts_at: z.string().min(1),
  ends_at: z.string().min(1),
}).refine(d => new Date(d.ends_at) > new Date(d.starts_at), { message: "End must be after start", path: ["ends_at"] });

function TimetablePage() {
  const qc = useQueryClient();
  const [refDate, setRefDate] = useState(new Date());
  const { start, end } = useMemo(() => weekBounds(refDate), [refDate]);

  const events = useQuery({
    queryKey: ["timetable", start.toISOString()],
    queryFn: async () => {
      const uid = await getUserId();
      const { data, error } = await supabase.from("timetable_events").select("*")
        .eq("user_id", uid)
        .gte("starts_at", start.toISOString()).lt("starts_at", end.toISOString())
        .order("starts_at");
      if (error) throw error;
      return data;
    },
  });

  const subjects = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const uid = await getUserId();
      const { data } = await supabase.from("subjects").select("*").eq("user_id", uid).order("name");
      return data ?? [];
    },
  });

  const [open, setOpen] = useState(false);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("timetable_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["timetable"] }); toast.success("Event deleted"); },
  });

  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i);
    return d;
  });

  return (
    <AppShell title="Timetable">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => { const d = new Date(refDate); d.setDate(d.getDate() - 7); setRefDate(d); }} aria-label="Previous week"><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" onClick={() => setRefDate(new Date())}>This week</Button>
          <Button variant="outline" size="icon" onClick={() => { const d = new Date(refDate); d.setDate(d.getDate() + 7); setRefDate(d); }} aria-label="Next week"><ChevronRight className="h-4 w-4" /></Button>
          <p className="ml-3 text-sm text-muted-foreground">
            {start.toLocaleDateString(undefined, { day:"numeric", month:"short" })} – {new Date(end.getTime() - 1).toLocaleDateString(undefined, { day:"numeric", month:"short", year:"numeric" })}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> New event</Button></DialogTrigger>
          <EventDialog subjects={subjects.data ?? []} onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["timetable"] }); }} />
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-7">
        {days.map(d => {
          const dayEvents = (events.data ?? []).filter(e =>
            new Date(e.starts_at).toDateString() === d.toDateString(),
          );
          const isToday = d.toDateString() === new Date().toDateString();
          return (
            <Card key={d.toISOString()} className={isToday ? "ring-2 ring-brand" : ""}>
              <CardContent className="p-3">
                <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                  {d.toLocaleDateString(undefined, { weekday:"short" })}{" "}
                  <span className="text-foreground">{d.getDate()}</span>
                </p>
                {!dayEvents.length && <p className="rounded border border-dashed border-border py-4 text-center text-xs text-muted-foreground">Free</p>}
                <ul className="space-y-2">
                  {dayEvents.map(ev => (
                    <li key={ev.id} className="group rounded-lg border border-border p-2 text-xs" style={{ borderLeftColor: ev.color ?? "var(--brand)", borderLeftWidth: 3 }}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">{ev.title}</p>
                          <p className="text-muted-foreground">{formatTime(ev.starts_at)} – {formatTime(ev.ends_at)}</p>
                          {ev.location && <p className="text-muted-foreground">{ev.location}</p>}
                        </div>
                        <button onClick={() => del.mutate(ev.id)} className="opacity-0 transition-opacity group-hover:opacity-100" aria-label="Delete event"><Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" /></button>
                      </div>
                      <Badge variant="secondary" className="mt-1 text-[10px]">{ev.category}</Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}

function EventDialog({ subjects, onDone }: { subjects: Array<{ id: string; name: string; color: string }>; onDone: () => void }) {
  const [form, setForm] = useState(() => {
    const now = new Date(); now.setMinutes(0, 0, 0);
    const later = new Date(now.getTime() + 3600000);
    return {
      title: "",
      subject_id: "",
      category: "lesson" as (typeof CATEGORIES)[number],
      location: "",
      starts_at: toLocalInput(now),
      ends_at: toLocalInput(later),
    };
  });

  const save = useMutation({
    mutationFn: async () => {
      const uid = await getUserId();
      const payload = eventSchema.parse({
        title: form.title,
        subject_id: form.subject_id || null,
        category: form.category,
        location: form.location || null,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: new Date(form.ends_at).toISOString(),
      });
      const color = subjects.find(s => s.id === payload.subject_id)?.color ?? null;
      const { error } = await supabase.from("timetable_events").insert({ ...payload, color, user_id: uid });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Event added"); onDone(); },
    onError: (e) => toast.error(e instanceof z.ZodError ? e.errors[0].message : (e as Error).message),
  });

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>New event</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5"><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Starts</Label><Input type="datetime-local" value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Ends</Label><Input type="datetime-local" value={form.ends_at} onChange={e => setForm({ ...form, ends_at: e.target.value })} /></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Subject</Label>
            <Select value={form.subject_id} onValueChange={v => setForm({ ...form, subject_id: v })}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Category</Label>
            <Select value={form.category} onValueChange={v => setForm({ ...form, category: v as (typeof CATEGORIES)[number] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5"><Label>Location (optional)</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
      </div>
      <DialogFooter><Button onClick={() => save.mutate()} disabled={save.isPending}>Save</Button></DialogFooter>
    </DialogContent>
  );
}

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
