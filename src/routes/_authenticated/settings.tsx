/**
 * Settings — profile fields + theme toggle.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getUserId, LEARNING_STYLES, EDUCATION_SYSTEMS } from "@/lib/app-utils";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Moon, Sun, Monitor } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — MAAR" }] }),
  component: SettingsPage,
});

function applyTheme(t: string) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const dark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
}

function SettingsPage() {
  const qc = useQueryClient();
  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const uid = await getUserId();
      const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState<Record<string, string | number>>({});
  useEffect(() => {
    if (profile.data) setForm({
      full_name: profile.data.full_name ?? "",
      country: profile.data.country ?? "",
      education_system: profile.data.education_system ?? "",
      institution: profile.data.institution ?? "",
      academic_year: profile.data.academic_year ?? "",
      learning_style: profile.data.learning_style ?? "",
      daily_study_minutes: profile.data.daily_study_minutes ?? 60,
      focus_session_minutes: profile.data.focus_session_minutes ?? 25,
      theme: profile.data.theme ?? "system",
    });
    if (profile.data?.theme) applyTheme(profile.data.theme);
  }, [profile.data]);

  const save = useMutation({
    mutationFn: async () => {
      const uid = await getUserId();
      const { error } = await supabase.from("profiles").update({
        full_name: String(form.full_name || ""),
        country: String(form.country || "") || null,
        education_system: String(form.education_system || "") || null,
        institution: String(form.institution || "") || null,
        academic_year: String(form.academic_year || "") || null,
        learning_style: (form.learning_style || null) as never,
        daily_study_minutes: Number(form.daily_study_minutes) || 0,
        focus_session_minutes: Number(form.focus_session_minutes) || 25,
        theme: String(form.theme || "system"),
      }).eq("id", uid);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["profile"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  function setTheme(t: string) {
    setForm({ ...form, theme: t });
    applyTheme(t);
  }

  return (
    <AppShell title="Settings">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Full name"><Input value={String(form.full_name ?? "")} onChange={e => setForm({ ...form, full_name: e.target.value })} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Country"><Input value={String(form.country ?? "")} onChange={e => setForm({ ...form, country: e.target.value })} /></Field>
              <Field label="Institution"><Input value={String(form.institution ?? "")} onChange={e => setForm({ ...form, institution: e.target.value })} /></Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Education system">
                <Select value={String(form.education_system ?? "")} onValueChange={v => setForm({ ...form, education_system: v })}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{EDUCATION_SYSTEMS.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Academic year"><Input value={String(form.academic_year ?? "")} onChange={e => setForm({ ...form, academic_year: e.target.value })} /></Field>
            </div>
            <Field label="Learning style">
              <Select value={String(form.learning_style ?? "")} onValueChange={v => setForm({ ...form, learning_style: v })}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{LEARNING_STYLES.map(x => <SelectItem key={x.value} value={x.value}>{x.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Daily study target (min)"><Input type="number" value={String(form.daily_study_minutes ?? 60)} onChange={e => setForm({ ...form, daily_study_minutes: Number(e.target.value) })} /></Field>
              <Field label="Focus session length (min)"><Input type="number" value={String(form.focus_session_minutes ?? 25)} onChange={e => setForm({ ...form, focus_session_minutes: Number(e.target.value) })} /></Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">Choose how MAAR looks.</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: "light", label: "Light", icon: Sun },
                { v: "dark", label: "Dark", icon: Moon },
                { v: "system", label: "System", icon: Monitor },
              ].map(({ v, label, icon: Icon }) => (
                <button key={v} onClick={() => setTheme(v)} className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition ${form.theme === v ? "border-brand bg-brand/5" : "border-border hover:bg-accent"}`}>
                  <Icon className="h-5 w-5" />
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>Save changes</Button>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
