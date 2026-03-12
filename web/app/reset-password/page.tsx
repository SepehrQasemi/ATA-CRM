"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLocale } from "@/components/locale-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function PasswordVisibilityIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" width="18" height="18">
        <path
          d="M3 4.5L20 21.5M9.88 9.88A3 3 0 0 0 14.12 14.12M10.73 5.08A10.94 10.94 0 0 1 12 5C16.67 5 20.44 8 22 12c-.49 1.25-1.2 2.39-2.09 3.36M6.61 6.61C4.45 8 2.76 9.89 2 12c1.56 4 5.33 7 10 7 1.85 0 3.59-.47 5.1-1.29"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" width="18" height="18">
      <path
        d="M2 12C3.56 8 7.33 5 12 5s8.44 3 10 7c-1.56 4-5.33 7-10 7S3.56 16 2 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export default function ResetPasswordPage() {
  const { tr } = useLocale();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
          // Fallback for environments where recovery URL carries a code that can be verified as token hash.
          const { error: otpFallbackError } = await supabase.auth.verifyOtp({
            token_hash: code,
            type: "recovery",
          });
          if (otpFallbackError) {
            if (!mounted) return;
            setHasRecoverySession(false);
            setReady(true);
            setError(codeError.message);
            return;
          }
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

      for (let attempt = 0; attempt < 20; attempt += 1) {
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
        await new Promise((resolve) => window.setTimeout(resolve, 500));
      }
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        if (!mounted) return;
        setHasRecoverySession(true);
        setReady(true);
        return;
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
            <div className="stack">
              <label htmlFor="reset-password">{tr("New password")}</label>
              <div className="password-input-wrap">
                <input
                  id="reset-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? "text" : "password"}
                  placeholder="********"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? tr("Hide password") : tr("Show password")}
                  title={showPassword ? tr("Hide password") : tr("Show password")}
                >
                  <PasswordVisibilityIcon visible={showPassword} />
                </button>
              </div>
            </div>

            <div className="stack">
              <label htmlFor="reset-confirm-password">{tr("Confirm password")}</label>
              <div className="password-input-wrap">
                <input
                  id="reset-confirm-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="********"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? tr("Hide password") : tr("Show password")}
                  title={showConfirmPassword ? tr("Hide password") : tr("Show password")}
                >
                  <PasswordVisibilityIcon visible={showConfirmPassword} />
                </button>
              </div>
            </div>

            {error ? <p className="error">{error}</p> : null}
            {success ? <p className="success">{success}</p> : null}

            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? tr("Processing...") : tr("Update password")}
            </button>

            <button className="btn-link" type="button" onClick={() => router.push("/login")}>
              {tr("Back to login")}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
