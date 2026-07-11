"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sun, Moon, Mail, Lock, LogIn, UserPlus, CheckCircle2 } from "lucide-react";
import { useTheme } from "@/lib/themeContext";
import { useAuth } from "@/lib/authContext";
import { Logo } from "@/components/Logo";

// Google-icon glyph as inline SVG so we don't need an external asset for the (currently disabled) button.
function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.87c2.27-2.09 3.56-5.17 3.56-8.65z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.87-3c-1.08.72-2.46 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.94H1.3v3.1C3.26 21.3 7.3 24 12 24z" />
      <path fill="#FBBC05" d="M5.29 14.31A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.58.39-2.31v-3.1H1.3A11.98 11.98 0 0 0 0 12c0 1.93.46 3.76 1.3 5.41z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.24 0 12 0 7.3 0 3.26 2.7 1.3 6.59l3.99 3.1C6.23 6.86 8.88 4.75 12 4.75z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { signIn, signUp, authAvailable } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!authAvailable) {
      // No Supabase auth configured in this environment — demo mode proceeds straight through.
      router.push("/dashboard");
      return;
    }

    setSubmitting(true);
    if (mode === "signin") {
      const { error } = await signIn(email, password);
      setSubmitting(false);
      if (error) return setError(error);
      router.push("/dashboard");
    } else {
      const { error, needsEmailConfirm } = await signUp(email, password);
      setSubmitting(false);
      if (error) return setError(error);
      if (needsEmailConfirm) {
        setConfirmSent(true);
      } else {
        router.push("/dashboard");
      }
    }
  }

  return (
    <div className="min-h-full flex flex-col">
      <header className="flex items-center justify-between px-4 md:px-8 py-4 max-w-6xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text">
          <ArrowLeft size={14} /> Back
        </Link>
        <button
          onClick={toggleTheme}
          aria-label="Toggle light / dark theme"
          className="h-8 w-8 flex items-center justify-center rounded-md border border-border text-text-secondary hover:text-text hover:border-border-strong"
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-1.5">
            <Link href="/" className="inline-flex items-center gap-2 font-display font-semibold text-text mb-2">
              <Logo size={32} />
            </Link>
            <h1 className="font-display text-xl font-semibold text-text">
              {mode === "signin" ? "Sign in to Innfetch" : "Create your Innfetch account"}
            </h1>
            <p className="text-sm text-text-muted">Unified asset &amp; operations brain</p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
            {confirmSent ? (
              <div className="text-center space-y-3 py-4">
                <CheckCircle2 size={28} className="text-accent mx-auto" />
                <p className="text-sm text-text">Check your inbox to confirm {email}</p>
                <p className="text-xs text-text-muted">
                  Once confirmed, come back and sign in below.
                </p>
                <button
                  onClick={() => {
                    setConfirmSent(false);
                    setMode("signin");
                  }}
                  className="text-sm text-accent hover:underline"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  disabled
                  title="Google sign-in is not wired up yet — coming soon"
                  className="w-full flex items-center justify-center gap-2 border border-border rounded-lg px-4 py-2.5 text-sm font-medium text-text-muted cursor-not-allowed opacity-60"
                >
                  <GoogleGlyph />
                  Continue with Google
                  <span className="text-[10px] uppercase tracking-wide text-text-muted ml-1">Soon</span>
                </button>

                <div className="flex items-center gap-3 text-[10px] uppercase tracking-wide text-text-muted">
                  <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
                </div>

                <form onSubmit={submit} className="space-y-3">
                  <label className="block">
                    <span className="text-xs text-text-muted mb-1 block">Email</span>
                    <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 focus-within:border-accent">
                      <Mail size={14} className="text-text-muted shrink-0" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@plant.com"
                        className="flex-1 bg-transparent text-sm outline-none text-text placeholder:text-text-muted"
                      />
                    </div>
                  </label>
                  <label className="block">
                    <span className="text-xs text-text-muted mb-1 block">Password</span>
                    <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 focus-within:border-accent">
                      <Lock size={14} className="text-text-muted shrink-0" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="flex-1 bg-transparent text-sm outline-none text-text placeholder:text-text-muted"
                      />
                    </div>
                  </label>

                  {error && <p className="text-xs text-danger">{error}</p>}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-strong disabled:opacity-60 text-accent-fg font-medium rounded-lg px-4 py-2.5 text-sm"
                  >
                    {mode === "signin" ? <LogIn size={15} /> : <UserPlus size={15} />}
                    {submitting ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
                  </button>
                </form>

                <p className="text-[11px] text-text-muted text-center">
                  {authAvailable ? (
                    mode === "signin" ? (
                      <>
                        Don&apos;t have an account?{" "}
                        <button onClick={() => setMode("signup")} className="text-accent hover:underline">
                          Sign up
                        </button>
                      </>
                    ) : (
                      <>
                        Already have an account?{" "}
                        <button onClick={() => setMode("signin")} className="text-accent hover:underline">
                          Sign in
                        </button>
                      </>
                    )
                  ) : (
                    "Demo mode — auth isn't configured here, any email & password proceeds through."
                  )}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
