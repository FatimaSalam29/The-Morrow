import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Masthead } from "@/components/paper/Masthead";

const search = z.object({ redirect: z.string().optional(), mode: z.enum(["signin", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Sign in — The Morrow" },
      { name: "description", content: "Sign in or subscribe to The Morrow, your personal morning paper." },
      { property: "og:title", content: "Sign in — The Morrow" },
      { property: "og:description", content: "Sign in or subscribe to The Morrow, your personal morning paper." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function safePath(p?: string) {
  return p && p.startsWith("/") && !p.startsWith("//") ? p : "/today";
}

function GoogleG() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
    </svg>
  );
}

function AuthPage() {
  const { redirect, mode: initialMode } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const dest = safePath(redirect);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: dest, replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: dest, replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [dest, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: name || undefined } },
        });
        if (error) throw error;
        if (!data.session) setCheckEmail(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function oauth(provider: "google") {
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error(result.error.message ?? "Sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate({ to: dest, replace: true });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Masthead size="md" left="Est. 2026" right="Subscriber desk" />
      <div className="mt-10 grid gap-10 md:grid-cols-[1.1fr_1fr]">
        <div className="hidden md:block">
          <p className="kicker">Reader services</p>
          <h2 className="headline mt-2 text-4xl text-ink">One paper. Written around you.</h2>
          <p className="prose-news dropcap mt-5 text-lg text-ink-soft">
            Every morning we gather the stories that matter to you from the world's most trusted
            newsrooms, summarise them faithfully, and set them in a paper made for one reader. It
            learns as you read — skip what bores you, keep what moves you.
          </p>
        </div>
        <div className="paper-sheet p-6 sm:p-8 animate-press-in">
          {checkEmail ? (
            <div className="text-center">
              <p className="kicker">One more step</p>
              <h3 className="headline mt-2 text-2xl">Check your inbox</h3>
              <p className="prose-news mt-3 text-ink-soft">
                We sent a confirmation link to <strong>{email}</strong>. Open it to start your
                subscription.
              </p>
              <Button variant="quiet" className="mt-6" onClick={() => { setCheckEmail(false); setMode("signin"); }}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              <p className="kicker">{mode === "signin" ? "Welcome back" : "New subscriber"}</p>
              <h3 className="headline mt-1 text-3xl">{mode === "signin" ? "Sign in" : "Start your paper"}</h3>
              <div className="mt-6 grid gap-3">
                <Button type="button" variant="google" className="h-11 w-full gap-[10px] px-3" onClick={() => oauth("google")}>
                  <GoogleG />
                  Continue with Google
                </Button>
              </div>
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-rule" />
                <span className="byline">or with email</span>
                <div className="h-px flex-1 bg-rule" />
              </div>
              <form onSubmit={submit} className="grid gap-4">
                {mode === "signup" && (
                  <div className="grid gap-1.5">
                    <Label htmlFor="name">Name on the masthead</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Fatima" />
                  </div>
                )}
                <div className="grid gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} />
                </div>
                <Button type="submit" size="lg" disabled={busy} className="mt-2 uppercase tracking-[0.16em]">
                  {busy ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "signin" ? "New here?" : "Already a reader?"}{" "}
                <button className="font-semibold text-editorial link-ink" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
                  {mode === "signin" ? "Create an account" : "Sign in"}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
