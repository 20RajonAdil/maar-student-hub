/**
 * Public auth page. Email+password (sign in / sign up) and Google.
 * Redirects to /dashboard on success (which itself redirects to /onboarding
 * for first-time users).
 */
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/Logo";
import { Footer } from "@/components/brand/Footer";
import { Loader2 } from "lucide-react";

// URL ?mode=signup switches the initial tab
const searchSchema = z.object({ mode: z.enum(["signin", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({ meta: [{ title: "Sign in — MAAR Student Hub" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  // If already signed in, bounce to dashboard.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const creds = z.object({
        email: z.string().email("Enter a valid email").max(255),
        password: z.string().min(8, "Password must be at least 8 characters").max(72),
      }).parse({ email, password });

      if (mode === "signup") {
        const name = z.string().trim().min(1, "Please enter your name").max(80).parse(fullName);
        const { error } = await supabase.auth.signUp({
          email: creds.email,
          password: creds.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Account created — welcome to MAAR.");
      } else {
        const { error } = await supabase.auth.signInWithPassword(creds);
        if (error) throw error;
      }
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      const msg = err instanceof z.ZodError ? err.errors[0].message : (err as Error).message;
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw error;
      // Browser is redirecting to Google — nothing else to do.
    } catch (err) {
      toast.error((err as Error).message ?? "Sign-in failed");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col hero-bg">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6">
        <Link to="/"><Logo /></Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-16">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lift">
          <h1 className="font-display text-2xl font-semibold text-card-foreground">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signup" ? "Start organising your studies in one place." : "Sign in to your MAAR workspace."}
          </p>

          <Button
            type="button"
            variant="outline"
            className="mt-6 w-full"
            onClick={handleGoogle}
            disabled={loading}
          >
            <GoogleIcon /> Continue with Google
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" required />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={8} />
              {mode === "signup" && <p className="text-xs text-muted-foreground">Minimum 8 characters.</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signup" ? "Already have an account?" : "New to MAAR?"}{" "}
            <button
              type="button"
              className="font-medium text-brand hover:underline"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            >
              {mode === "signup" ? "Sign in" : "Create one"}
            </button>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.3l6.7-6.7C35.6 2 30.1 0 24 0 14.7 0 6.7 5.3 2.7 13l7.8 6c1.9-5.6 7.2-9.5 13.5-9.5z"/>
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.7 6.9l7.3 5.7c4.3-3.9 6.8-9.7 6.8-17.1z"/>
      <path fill="#FBBC05" d="M10.5 28.9c-.5-1.4-.8-3-.8-4.5s.3-3.1.8-4.5l-7.8-6C1 17.3 0 20.5 0 24s1 6.7 2.7 10.1l7.8-5.2z"/>
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.8-5.8l-7.3-5.7c-2 1.4-4.7 2.2-8.5 2.2-6.3 0-11.6-3.9-13.5-9.5l-7.8 6C6.7 42.7 14.7 48 24 48z"/>
    </svg>
  );
}
