"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/locale-provider";

type AccessUser = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  position: string | null;
  department: string | null;
  role: string;
  is_self: boolean;
};

type AccessResponse = {
  actorRole: string;
  users: AccessUser[];
  error?: string;
};

type DraftRow = Partial<Pick<AccessUser, "role" | "position" | "department" | "phone" | "first_name" | "last_name">>;

const ROLE_OPTIONS = ["standard_user", "commercial", "manager", "admin"];

export default function AccessPage() {
  const { tr } = useLocale();
  const [actorRole, setActorRole] = useState<string>("standard_user");
  const [users, setUsers] = useState<AccessUser[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftRow>>({});
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const actorIsAdmin = actorRole === "admin";

  useEffect(() => {
    async function loadUsers() {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/settings/users", { cache: "no-store" });
      const json = (await response.json()) as AccessResponse;

      if (!response.ok) {
        setError(json.error ?? "Failed to load access data");
        setLoading(false);
        return;
      }

      setActorRole(json.actorRole);
      setUsers(json.users ?? []);
      setLoading(false);
    }

    void loadUsers();
  }, []);

  function getValue(row: AccessUser, key: keyof DraftRow) {
    const draft = drafts[row.id];
    if (draft && key in draft) {
      return draft[key] ?? "";
    }

    if (key === "role") return row.role;
    if (key === "position") return row.position ?? "";
    if (key === "department") return row.department ?? "";
    if (key === "phone") return row.phone ?? "";
    if (key === "first_name") return row.first_name ?? "";
    if (key === "last_name") return row.last_name ?? "";
    return "";
  }

  function setDraft(userId: string, key: keyof DraftRow, value: string) {
    setDrafts((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] ?? {}),
        [key]: value,
      },
    }));
  }

  async function saveRow(user: AccessUser) {
    const draft = drafts[user.id];
    if (!draft) return;

    const targetIsManagerOrAdmin = user.role === "manager" || user.role === "admin";
    if (!actorIsAdmin && targetIsManagerOrAdmin) {
      setError("Only admin can manage manager/admin accounts.");
      return;
    }

    setSavingUserId(user.id);
    setError(null);
    setSuccess(null);

    const payload: Record<string, unknown> = { user_id: user.id };

    if (draft.first_name !== undefined) payload.first_name = draft.first_name;
    if (draft.last_name !== undefined) payload.last_name = draft.last_name;
    if (draft.phone !== undefined) payload.phone = draft.phone;
    if (draft.position !== undefined) payload.position = draft.position;
    if (draft.department !== undefined) payload.department = draft.department;
    if (actorIsAdmin && draft.role !== undefined) payload.role = draft.role;

    const response = await fetch("/api/settings/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = (await response.json()) as { user?: AccessUser; error?: string };

    if (!response.ok || !json.user) {
      setError(json.error ?? "Failed to update user");
      setSavingUserId(null);
      return;
    }

    setUsers((prev) =>
      prev.map((row) =>
        row.id === user.id
          ? {
              ...row,
              ...json.user,
              email: row.email,
              is_self: row.is_self,
            }
          : row,
      ),
    );

    setDrafts((prev) => {
      const next = { ...prev };
      delete next[user.id];
      return next;
    });

    setSuccess("Access updated.");
    setSavingUserId(null);
  }

  return (
    <div className="stack">
      <section className="page-head">
        <h1>{tr("Access")}</h1>
        <p>{tr("Manage internal user access, roles, and company positions.")}</p>
      </section>

      {loading ? <p className="small">{tr("Loading data...")}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {success ? <p className="success">{success}</p> : null}

      {!loading && users.length === 0 && !error ? (
        <section className="panel">
          <p className="small">{tr("No data found.")}</p>
        </section>
      ) : null}

      {users.length > 0 ? (
        <section className="panel stack">
          {!actorIsAdmin ? (
            <p className="small">{tr("Only admin can manage manager/admin accounts and role changes.")}</p>
          ) : null}

          <div className="table-wrap">
            <table className="company-table">
              <thead>
                <tr>
                  <th>{tr("Name")}</th>
                  <th>{tr("Email")}</th>
                  <th>{tr("Role")}</th>
                  <th>{tr("Position")}</th>
                  <th>{tr("Department")}</th>
                  <th>{tr("Phone")}</th>
                  <th>{tr("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const targetIsManagerOrAdmin = user.role === "manager" || user.role === "admin";
                  const lockedByPolicy = !actorIsAdmin && targetIsManagerOrAdmin;

                  return (
                    <tr key={user.id}>
                      <td>
                        <div className="stack">
                          <input
                            value={String(getValue(user, "first_name"))}
                            onChange={(event) => setDraft(user.id, "first_name", event.target.value)}
                            disabled={lockedByPolicy}
                            placeholder={tr("First name")}
                          />
                          <input
                            value={String(getValue(user, "last_name"))}
                            onChange={(event) => setDraft(user.id, "last_name", event.target.value)}
                            disabled={lockedByPolicy}
                            placeholder={tr("Last name")}
                          />
                        </div>
                      </td>
                      <td>{user.email ?? "-"}</td>
                      <td>
                        <select
                          value={String(getValue(user, "role"))}
                          onChange={(event) => setDraft(user.id, "role", event.target.value)}
                          disabled={!actorIsAdmin}
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          value={String(getValue(user, "position"))}
                          onChange={(event) => setDraft(user.id, "position", event.target.value)}
                          disabled={lockedByPolicy}
                          placeholder={tr("Position")}
                        />
                      </td>
                      <td>
                        <input
                          value={String(getValue(user, "department"))}
                          onChange={(event) => setDraft(user.id, "department", event.target.value)}
                          disabled={lockedByPolicy}
                          placeholder={tr("Department")}
                        />
                      </td>
                      <td>
                        <input
                          value={String(getValue(user, "phone"))}
                          onChange={(event) => setDraft(user.id, "phone", event.target.value)}
                          disabled={lockedByPolicy}
                          placeholder={tr("Phone")}
                        />
                      </td>
                      <td>
                        <button
                          className="btn btn-primary"
                          type="button"
                          disabled={savingUserId === user.id || lockedByPolicy}
                          onClick={() => void saveRow(user)}
                        >
                          {savingUserId === user.id ? tr("Saving...") : tr("Save")}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
