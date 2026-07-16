/**
 * Homework — list + filters + create/complete/delete.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getUserId } from "@/lib/app-utils";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/homework")({
  head: () => ({ meta: [{ title: "Homework — MAAR" }] }),
  component: HomeworkPage,
});

const PRIORITIES = ["low","medium","high","urgent"] as const;
const STATUSES = ["todo","in_progress","done"] as const;

const hwSchema = z.object({
  title: z.string().trim().min(1).max(200),
  subject_id: z.string().uuid().nullable(),
  due_at: z.string().nullable(),
  priority: z.enum(PRIORITIES),
  estimated_minutes: z.number().int().min(0).max(24*60).nullable(),
  notes: z.string().max(2000).nullable(),
});

function HomeworkPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all"|"todo"|"in_progress"|"done">("all");
  const [open, setOpen] = useState(false);

  const list = useQuery({
    queryKey: ["homework", filter],
    queryFn: async () => {
      const uid = await getUserId();
      let q = supabase.from("homework").select("*, subjects(name,color)").eq("user_id", uid).order("due_at", { ascending: true, nullsFirst: false });
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
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

  const toggle = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase.from("homework").update({
        status: done ? "done" : "todo",
        completed_at: done ? new Date().toISOString() : null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["homework"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("homework").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["homework"] }); toast.success("Deleted"); },
  });

  return (
    <AppShell title="Homework">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
          {(["all","todo","in_progress","done"] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`rounded-md px-3 py-1 text-sm capitalize transition ${filter===s ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {s === "in_progress" ? "In progress" : s}
            </button>
          ))}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Add homework</Button></DialogTrigger>
          <HwDialog subjects={subjects.data ?? []} onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["homework"] }); }} />
        </Dialog>
      </div>

      {list.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!list.isLoading && !list.data?.length && (
        <Card><CardContent className="py-16 text-center">
          <p className="text-muted-foreground">Nothing here — enjoy the moment.</p>
        </CardContent></Card>
      )}

      <ul className="space-y-2">
        {list.data?.map(hw => {
          const overdue = hw.due_at && new Date(hw.due_at) < new Date() && hw.status !== "done";
          return (
            <li key={hw.id}>
              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  <Checkbox checked={hw.status === "done"} onCheckedChange={(v) => toggle.mutate({ id: hw.id, done: !!v })} aria-label="Mark complete" />
                  <div className="min-w-0 flex-1">
                    <p className={`font-medium ${hw.status === "done" ? "text-muted-foreground line-through" : ""}`}>{hw.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {hw.subjects && <Badge variant="secondary" style={{ color: hw.subjects.color }}>{hw.subjects.name}</Badge>}
                      <Badge variant={overdue ? "destructive" : "outline"} className="capitalize">{hw.priority}</Badge>
                      {hw.due_at && <span className={overdue ? "text-destructive" : ""}>Due {new Date(hw.due_at).toLocaleString(undefined, { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}</span>}
                      {hw.estimated_minutes && <span>~{hw.estimated_minutes} min</span>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => del.mutate(hw.id)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}

function HwDialog({ subjects, onDone }: { subjects: Array<{ id: string; name: string }>; onDone: () => void }) {
  const [form, setForm] = useState({
    title: "", subject_id: "", due_at: "", priority: "medium" as (typeof PRIORITIES)[number],
    estimated_minutes: "", notes: "",
  });
  const save = useMutation({
    mutationFn: async () => {
      const uid = await getUserId();
      const payload = hwSchema.parse({
        title: form.title,
        subject_id: form.subject_id || null,
        due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
        priority: form.priority,
        estimated_minutes: form.estimated_minutes ? Number(form.estimated_minutes) : null,
        notes: form.notes || null,
      });
      const { error } = await supabase.from("homework").insert({ ...payload, user_id: uid });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Homework added"); onDone(); },
    onError: (e) => toast.error(e instanceof z.ZodError ? e.errors[0].message : (e as Error).message),
  });

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>New homework</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5"><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Subject</Label>
            <Select value={form.subject_id} onValueChange={v => setForm({ ...form, subject_id: v })}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Priority</Label>
            <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v as (typeof PRIORITIES)[number] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Due</Label><Input type="datetime-local" value={form.due_at} onChange={e => setForm({ ...form, due_at: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Estimated minutes</Label><Input type="number" min={0} value={form.estimated_minutes} onChange={e => setForm({ ...form, estimated_minutes: e.target.value })} /></div>
        </div>
        <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
      </div>
      <DialogFooter><Button onClick={() => save.mutate()} disabled={save.isPending}>Save</Button></DialogFooter>
    </DialogContent>
  );
}
