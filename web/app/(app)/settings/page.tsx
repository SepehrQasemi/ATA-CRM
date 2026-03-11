"use client";

import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useLocale } from "@/components/locale-provider";

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

export default function SettingsPage() {
  const { tr } = useLocale();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

    setSaving(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      setSuccess(tr("Password updated. You can sign in now."));
      setPassword("");
      setConfirmPassword("");
    } catch (e) {
      const message = e instanceof Error ? e.message : tr("Unexpected auth error");
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack">
      <section className="page-head">
        <h1>{tr("Settings")}</h1>
        <p>{tr("Change your account password.")}</p>
      </section>

      <section className="panel stack">
        <h2>{tr("Reset password")}</h2>
        <form className="stack" onSubmit={handleSubmit}>
          <div className="stack">
            <label htmlFor="settings-password">{tr("New password")}</label>
            <div className="password-input-wrap">
              <input
                id="settings-password"
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
            <label htmlFor="settings-confirm-password">{tr("Confirm password")}</label>
            <div className="password-input-wrap">
              <input
                id="settings-confirm-password"
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

          <div className="inline-actions action-end">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? tr("Saving...") : tr("Update password")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
