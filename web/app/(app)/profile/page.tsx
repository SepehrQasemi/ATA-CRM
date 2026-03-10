"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLocale } from "@/components/locale-provider";

type ProfileModel = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  position: string | null;
  department: string | null;
  role: string;
};

type ProfileResponse = {
  profile: ProfileModel;
  error?: string;
};

export default function ProfilePage() {
  const { tr } = useLocale();
  const [profile, setProfile] = useState<ProfileModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/profile/me", { cache: "no-store" });
      const json = (await response.json()) as ProfileResponse;

      if (!response.ok || !json.profile) {
        setError(json.error ?? "Failed to load profile");
        setLoading(false);
        return;
      }

      setProfile(json.profile);
      setLoading(false);
    }

    void loadProfile();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/profile/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone,
        email: profile.email,
        position: profile.position,
        department: profile.department,
      }),
    });

    const json = (await response.json()) as ProfileResponse;

    if (!response.ok || !json.profile) {
      setError(json.error ?? "Failed to save profile");
      setSaving(false);
      return;
    }

    setProfile(json.profile);
    setSuccess("Profile updated.");
    setSaving(false);
  }

  const canEditOrgFields =
    profile?.role === "admin" || profile?.role === "manager";

  return (
    <div className="stack">
      <section className="page-head">
        <h1>{tr("My Profile")}</h1>
        <p>{tr("Manage your personal information and internal position.")}</p>
      </section>

      {loading ? <p className="small">{tr("Loading data...")}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {success ? <p className="success">{success}</p> : null}

      {profile ? (
        <section className="panel stack">
          <form className="stack" onSubmit={handleSubmit}>
            <div className="row">
              <label className="stack col-6">
                {tr("First name")}
                <input
                  value={profile.first_name ?? ""}
                  onChange={(event) =>
                    setProfile((prev) =>
                      prev ? { ...prev, first_name: event.target.value } : prev,
                    )
                  }
                  placeholder={tr("First name")}
                />
              </label>

              <label className="stack col-6">
                {tr("Last name")}
                <input
                  value={profile.last_name ?? ""}
                  onChange={(event) =>
                    setProfile((prev) =>
                      prev ? { ...prev, last_name: event.target.value } : prev,
                    )
                  }
                  placeholder={tr("Last name")}
                />
              </label>
            </div>

            <div className="row">
              <label className="stack col-6">
                {tr("Email")}
                <input
                  type="email"
                  value={profile.email ?? ""}
                  onChange={(event) =>
                    setProfile((prev) =>
                      prev ? { ...prev, email: event.target.value } : prev,
                    )
                  }
                  placeholder="name@company.com"
                />
              </label>

              <label className="stack col-6">
                {tr("Phone")}
                <input
                  value={profile.phone ?? ""}
                  onChange={(event) =>
                    setProfile((prev) =>
                      prev ? { ...prev, phone: event.target.value } : prev,
                    )
                  }
                  placeholder={tr("Phone")}
                />
              </label>
            </div>

            <div className="row">
              <label className="stack col-6">
                {tr("Position")}
                <input
                  value={profile.position ?? ""}
                  onChange={(event) =>
                    setProfile((prev) =>
                      prev ? { ...prev, position: event.target.value } : prev,
                    )
                  }
                  disabled={!canEditOrgFields}
                  placeholder={tr("Position")}
                />
              </label>

              <label className="stack col-6">
                {tr("Department")}
                <input
                  value={profile.department ?? ""}
                  onChange={(event) =>
                    setProfile((prev) =>
                      prev ? { ...prev, department: event.target.value } : prev,
                    )
                  }
                  disabled={!canEditOrgFields}
                  placeholder={tr("Department")}
                />
              </label>
            </div>

            {!canEditOrgFields ? (
              <p className="small">{tr("Position/Department can only be updated by manager or admin.")}</p>
            ) : null}

            <div className="inline-actions action-end">
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? tr("Saving...") : tr("Save")}
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  );
}
