"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLocale } from "@/components/locale-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function ResetPasswordPage() {
  const { tr } = useLocale();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const supabase = createSupabaseBrowserClient();

    async function resolveRecoverySession() {
      setError(null);
      const currentUrl = new URL(window.location.href);
      const code = currentUrl.searchParams.get("code");
      const tokenHash = currentUrl.searchParams.get("token_hash");
      const otpType = currentUrl.searchParams.get("type");
      const hashParams = new URLSearchParams(currentUrl.hash.replace(/^#/, ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      // Support all Supabase recovery URL variants:
      // 1) PKCE code in query
      // 2) token_hash + type=recovery
      // 3) implicit hash tokens
      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) {
          if (!mounted) return;
          setHasRecoverySession(false);
          setReady(true);
          setError(sessionError.message);
          return;
        }
        window.history.replaceState({}, "", "/reset-password");
      } else if (code) {
        const { error: codeError } = await supabase.auth.exchangeCodeForSession(code);
        if (codeError) {
          if (!mounted) return;
          setHasRecoverySession(false);
          setReady(true);
          setError(codeError.message);
          return;
        }
        window.history.replaceState({}, "", "/reset-password");
      } else if (tokenHash && otpType === "recovery") {
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });
        if (otpError) {
          if (!mounted) return;
          setHasRecoverySession(false);
          setReady(true);
          setError(otpError.message);
          return;
        }
        window.history.replaceState({}, "", "/reset-password");
      }

      for (let attempt = 0; attempt < 4; attempt += 1) {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          if (!mounted) return;
          setError(sessionError.message);
          setReady(true);
          return;
        }
        if (data.session) {
          if (!mounted) return;
          setHasRecoverySession(true);
          setReady(true);
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 300));
      }
      if (!mounted) return;
      setHasRecoverySession(false);
      setReady(true);
      setError(tr("Invalid or expired reset link. Request a new one from login page."));
    }

    void resolveRecoverySession();
    return () => {
      mounted = false;
    };
  }, [tr]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 8) {
      setError(tr("Password must be at least 8 characters."));
      return;
    }

    if (password !== confirmPassword) {
      setError(tr("Passwords do not match."));
      return;
    }

    setLoading(true);
    const supabase = createSupabaseBrowserClient();

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      setSuccess(tr("Password updated. You can sign in now."));
      setPassword("");
      setConfirmPassword("");
      window.setTimeout(() => {
        router.push("/login");
      }, 1200);
    } catch (e) {
      const message = e instanceof Error ? e.message : tr("Unexpected auth error");
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
        <h1>{tr("Set a new password")}</h1>
        <p>{tr("Create a new password to access your account.")}</p>

        {!ready ? <p className="muted">{tr("Processing...")}</p> : null}

        {ready && !hasRecoverySession ? (
          <div className="stack">
            {error ? <p className="error">{error}</p> : null}
            <button className="btn btn-secondary" type="button" onClick={() => router.push("/login")}>
              {tr("Back to login")}
            </button>
          </div>
        ) : null}

        {ready && hasRecoverySession ? (
          <form className="stack" onSubmit={handleSubmit}>
            <label className="stack">
              {tr("New password")}
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                placeholder="********"
                minLength={8}
                required
              />
            </label>

            <label className="stack">
              {tr("Confirm password")}
              <input
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                type="password"
                placeholder="********"
                minLength={8}
                required
              />
            </label>

            {error ? <p className="error">{error}</p> : null}
            {success ? <p className="success">{success}</p> : null}

            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? tr("Processing...") : tr("Update password")}
            </button>

            <button
              className="btn-link"
              type="button"
              onClick={() => router.push("/login")}
            >
              {tr("Back to login")}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
