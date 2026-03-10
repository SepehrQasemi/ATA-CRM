"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLocale } from "@/components/locale-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const { tr } = useLocale();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const supabase = createSupabaseBrowserClient();

    try {
      if (mode === "login") {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (loginError) throw loginError;
        router.push("/dashboard");
        router.refresh();
      } else if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName || email.split("@")[0],
            },
          },
        });
        if (signUpError) throw signUpError;
        setSuccess("Signup done. Check your inbox for verification if required.");
      } else {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        );
        if (resetError) throw resetError;
        setSuccess("Password reset email sent.");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unexpected auth error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card stack">
        <div className="inline-actions auth-head">
          <BrandLogo compact />
          <LanguageSwitcher />
        </div>
        <h1>{tr("CRM Food Trading")}</h1>
        <p>{tr("Sign in to manage your leads, contacts, and email campaigns.")}</p>
        <p className="small">
          <Link href="/">{tr("Explore Features")}</Link>
        </p>

        <div className="row">
          <button
            type="button"
            className={`btn col-4 ${mode === "login" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setMode("login")}
          >
            {tr("Login")}
          </button>
          <button
            type="button"
            className={`btn col-4 ${mode === "signup" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setMode("signup")}
          >
            {tr("Signup")}
          </button>
          <button
            type="button"
            className={`btn col-4 ${mode === "reset" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setMode("reset")}
          >
            {tr("Reset")}
          </button>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <label className="stack">
              {tr("Full name")}
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder={tr("Your Name")}
                required
              />
            </label>
          )}

          <label className="stack">
            {tr("Email")}
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="you@company.com"
              required
            />
          </label>

          {mode !== "reset" && (
            <label className="stack">
              {tr("Password")}
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                placeholder="********"
                required
              />
            </label>
          )}

          {error ? <p className="error">{error}</p> : null}
          {success ? <p className="success">{success}</p> : null}

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading
              ? tr("Processing...")
              : mode === "login"
                ? tr("Login")
                : mode === "signup"
                  ? tr("Create account")
                  : tr("Send reset link")}
          </button>
        </form>
      </div>
    </div>
  );
}
