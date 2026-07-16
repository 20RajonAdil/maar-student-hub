/**
 * Onboarding wizard. Writes to profiles and marks onboarding_completed.
 * Dashboard checks this flag and sends users here on first login.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getUserId, LEARNING_STYLES, EDUCATION_SYSTEMS } from "@/lib/app-utils";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Welcome — MAAR" }] }),
  component: Onboarding,
});

const onboardingSchema = z.object({
  full_name: z.string().trim().min(1).max(80),
  age: z.number().int().min(5).max(120).nullable(),
  country: z.string().trim().max(80).nullable(),
  education_system: z.string().trim().max(80).nullable(),
  institution: z.string().trim().max(120).nullable(),
  academic_year: z.string().trim().max(40).nullable(),
  subjects: z.array(z.string().trim().min(1).max(60)).max(20),
  study_goals: z.string().trim().max(500).nullable(),
  daily_study_minutes: z.number().int().min(0).max(1440),
  focus_session_minutes: z.number().int().min(5).max(240),
  learning_style: z.enum(["visual","auditory","reading_writing","kinaesthetic","unsure"]).nullable(),
});

const STEPS = ["About you", "Your studies", "Study habits"] as const;

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    full_name: "",
    age: "" as string,
    country: "",
    education_system: "",
    institution: "",
    academic_year: "",
    subjectsInput: "",
    study_goals: "",
    daily_study_minutes: 60,
    focus_session_minutes: 25,
    learning_style: "" as string,
  });

  const save = useMutation({
    mutationFn: async () => {
      const uid = await getUserId();
      const payload = onboardingSchema.parse({
        full_name: form.full_name,
        age: form.age ? Number(form.age) : null,
        country: form.country || null,
        education_system: form.education_system || null,
        institution: form.institution || null,
        academic_year: form.academic_year || null,
        subjects: form.subjectsInput.split(",").map(s => s.trim()).filter(Boolean),
        study_goals: form.study_goals || null,
        daily_study_minutes: Number(form.daily_study_minutes),
        focus_session_minutes: Number(form.focus_session_minutes),
        learning_style: (form.learning_style || null) as never,
      });
      const { error } = await supabase.from("profiles").update({
        ...payload,
        onboarding_completed: true,
      }).eq("id", uid);
      if (error) throw error;

      // Seed subjects table from the list they gave us
      if (payload.subjects.length) {
        await supabase.from("subjects").insert(
          payload.subjects.map((name, i) => ({
            user_id: uid,
            name,
            color: ["#0B1F3A","#10B981","#F59E0B","#7C6BF2","#EF4444","#06B6D4","#EC4899","#84CC16"][i % 8],
          })),
        );
      }
    },
    onSuccess: () => {
      toast.success("You're all set — welcome to MAAR.");
      navigate({ to: "/dashboard", replace: true });
    },
    onError: (err) => {
      toast.error(err instanceof z.ZodError ? err.errors[0].message : (err as Error).message);
    },
  });

  const pct = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="flex min-h-screen items-center justify-center hero-bg px-4 py-10">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-8 shadow-lift">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <span className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length}</span>
        </div>
        <Progress value={pct} className="mb-6" />

        <h1 className="font-display text-2xl font-semibold">{STEPS[step]}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A few quick questions so MAAR fits how you actually study.
        </p>

        <div className="mt-6 space-y-4">
          {step === 0 && (
            <>
              <Field label="Full name">
                <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Age (optional)">
                  <Input type="number" min={5} max={120} value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} />
                </Field>
                <Field label="Country (optional)">
                  <Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} />
                </Field>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <Field label="Education system">
                <Select value={form.education_system} onValueChange={v => setForm({ ...form, education_system: v })}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{EDUCATION_SYSTEMS.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="School / College / University">
                  <Input value={form.institution} onChange={e => setForm({ ...form, institution: e.target.value })} />
                </Field>
                <Field label="Academic year">
                  <Input placeholder="e.g. Year 12, Freshman" value={form.academic_year} onChange={e => setForm({ ...form, academic_year: e.target.value })} />
                </Field>
              </div>
              <Field label="Your subjects" hint="Comma-separated. e.g. Maths, Physics, English">
                <Input value={form.subjectsInput} onChange={e => setForm({ ...form, subjectsInput: e.target.value })} />
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <Field label="What do you want to achieve?">
                <Textarea rows={3} value={form.study_goals} onChange={e => setForm({ ...form, study_goals: e.target.value })} placeholder="e.g. Get all A/A* at A-Level, stay consistent, reduce cramming." />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Daily study target (minutes)">
                  <Input type="number" min={0} max={1440} value={form.daily_study_minutes} onChange={e => setForm({ ...form, daily_study_minutes: Number(e.target.value) })} />
                </Field>
                <Field label="Focus session length (minutes)">
                  <Input type="number" min={5} max={240} value={form.focus_session_minutes} onChange={e => setForm({ ...form, focus_session_minutes: Number(e.target.value) })} />
                </Field>
              </div>
              <Field label="Learning style">
                <Select value={form.learning_style} onValueChange={v => setForm({ ...form, learning_style: v })}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{LEARNING_STYLES.map(x => <SelectItem key={x.value} value={x.value}>{x.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </>
          )}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0 || save.isPending}>
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={step === 0 && !form.full_name.trim()}>
              Continue
            </Button>
          ) : (
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Finish
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
