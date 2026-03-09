"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { Company, Contact, Lead, Task } from "@/lib/types";

type TasksResponse = { tasks: Task[]; error?: string };
type LeadsResponse = { leads: Lead[]; error?: string };
type CompaniesResponse = { companies: Company[]; error?: string };
type ContactsResponse = { contacts: Contact[]; error?: string };
type MetaResponse = {
  profiles: Array<{ id: string; full_name: string | null; role: string }>;
  error?: string;
};

type TaskFilters = {
  q: string;
  status: string;
  priority: string;
  overdue: string;
  from: string;
  to: string;
};

const initialFilters: TaskFilters = {
  q: "",
  status: "",
  priority: "",
  overdue: "",
  from: "",
  to: "",
};

type TaskForm = {
  title: string;
  description: string;
  due_date: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: "todo" | "in_progress" | "done";
  assigned_to: string;
  lead_id: string;
  company_id: string;
  contact_id: string;
};

const initialForm: TaskForm = {
  title: "",
  description: "",
  due_date: "",
  priority: "normal",
  status: "todo",
  assigned_to: "",
  lead_id: "",
  company_id: "",
  contact_id: "",
};

type DeadlineAlert = {
  task: Task;
  kind: "overdue" | "due_soon";
};

function getTaskDueDate(task: Task): Date | null {
  if (!task.due_date) return null;
  const due = new Date(task.due_date);
  if (Number.isNaN(due.getTime())) return null;
  return due;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [profiles, setProfiles] = useState<MetaResponse["profiles"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filters, setFilters] = useState<TaskFilters>(initialFilters);
  const [form, setForm] = useState<TaskForm>(initialForm);
  const [calendarMonth, setCalendarMonth] = useState<Date>(startOfMonth(new Date()));

  async function loadData(activeFilters = filters) {
    const params = new URLSearchParams();
    if (activeFilters.q.trim()) params.set("q", activeFilters.q.trim());
    if (activeFilters.status) params.set("status", activeFilters.status);
    if (activeFilters.priority) params.set("priority", activeFilters.priority);
    if (activeFilters.overdue) params.set("overdue", activeFilters.overdue);
    if (activeFilters.from) params.set("from", activeFilters.from);
    if (activeFilters.to) params.set("to", activeFilters.to);

    const taskUrl = `/api/tasks${params.toString() ? `?${params.toString()}` : ""}`;

    const [taskRes, leadRes, companyRes, contactRes, metaRes] = await Promise.all([
      fetch(taskUrl),
      fetch("/api/leads"),
      fetch("/api/companies"),
      fetch("/api/contacts"),
      fetch("/api/meta"),
    ]);

    const taskJson = (await taskRes.json()) as TasksResponse;
    const leadJson = (await leadRes.json()) as LeadsResponse;
    const companyJson = (await companyRes.json()) as CompaniesResponse;
    const contactJson = (await contactRes.json()) as ContactsResponse;
    const metaJson = (await metaRes.json()) as MetaResponse;

    if (!taskRes.ok) {
      setError(taskJson.error ?? "Failed to load tasks");
      return;
    }

    if (!leadRes.ok || !companyRes.ok || !contactRes.ok || !metaRes.ok) {
      setError(
        leadJson.error ??
          companyJson.error ??
          contactJson.error ??
          metaJson.error ??
          "Failed to load metadata",
      );
      return;
    }

    setTasks(taskJson.tasks ?? []);
    setLeads(leadJson.leads ?? []);
    setCompanies(companyJson.companies ?? []);
    setContacts(contactJson.contacts ?? []);
    setProfiles(metaJson.profiles ?? []);
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm(initialForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const endpoint = editingId ? `/api/tasks/${editingId}` : "/api/tasks";
    const method = editingId ? "PATCH" : "POST";

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        lead_id: form.lead_id || null,
        company_id: form.company_id || null,
        contact_id: form.contact_id || null,
        assigned_to: form.assigned_to || null,
      }),
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json.error ?? "Failed to save task");
      setSaving(false);
      return;
    }

    setSaving(false);
    resetForm();
    void loadData();
  }

  function startEdit(task: Task) {
    setEditingId(task.id);
    setForm({
      title: task.title,
      description: task.description ?? "",
      due_date: task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : "",
      priority: task.priority,
      status: task.status,
      assigned_to: task.assigned_to ?? "",
      lead_id: task.lead_id ?? "",
      company_id: task.company_id ?? "",
      contact_id: task.contact_id ?? "",
    });
  }

  async function updateStatus(taskId: string, status: "todo" | "in_progress" | "done") {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json.error ?? "Failed to update task");
      return;
    }

    void loadData();
  }

  async function deleteTask(taskId: string) {
    const response = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json.error ?? "Failed to delete task");
      return;
    }
    void loadData();
  }

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    void loadData(filters);
  }

  const nowMs = Date.now();
  const dueSoonCutoff = Date.now() + 24 * 60 * 60 * 1000;

  const overdueCount = useMemo(() => {
    return tasks.filter((task) => {
      const due = getTaskDueDate(task);
      if (!due || task.status === "done") return false;
      return due.getTime() < nowMs;
    }).length;
  }, [tasks, nowMs]);

  const dueSoonCount = useMemo(() => {
    return tasks.filter((task) => {
      const due = getTaskDueDate(task);
      if (!due || task.status === "done") return false;
      const dueMs = due.getTime();
      return dueMs >= nowMs && dueMs <= dueSoonCutoff;
    }).length;
  }, [tasks, nowMs, dueSoonCutoff]);

  const deadlineAlerts = useMemo<DeadlineAlert[]>(() => {
    return tasks
      .filter((task) => task.status !== "done")
      .map((task) => {
        const due = getTaskDueDate(task);
        if (!due) return null;
        const dueMs = due.getTime();
        if (dueMs < nowMs) return { task, kind: "overdue" as const };
        if (dueMs <= dueSoonCutoff) return { task, kind: "due_soon" as const };
        return null;
      })
      .filter((item): item is DeadlineAlert => item !== null)
      .sort((a, b) => {
        const aDue = getTaskDueDate(a.task)?.getTime() ?? 0;
        const bDue = getTaskDueDate(b.task)?.getTime() ?? 0;
        return aDue - bDue;
      })
      .slice(0, 20);
  }, [tasks, nowMs, dueSoonCutoff]);

  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(monthStart);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays: Date[] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    calendarDays.push(cursor);
    cursor = addDays(cursor, 1);
  }

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((task) => {
      const due = getTaskDueDate(task);
      if (!due) return;
      const key = format(due, "yyyy-MM-dd");
      const bucket = map.get(key) ?? [];
      bucket.push(task);
      map.set(key, bucket);
    });
    return map;
  }, [tasks]);

  return (
    <div className="stack">
      <section className="page-head">
        <h1>Tasks & Calendar</h1>
        <p>Plan calls, meetings, and follow-up reminders with deadline notifications.</p>
      </section>

      <section className="card-grid">
        <article className="card">
          <p className="muted">Total tasks</p>
          <p className="kpi">{tasks.length}</p>
        </article>
        <article className="card">
          <p className="muted">Overdue</p>
          <p className="kpi">{overdueCount}</p>
        </article>
        <article className="card">
          <p className="muted">Due in 24h</p>
          <p className="kpi">{dueSoonCount}</p>
        </article>
      </section>

      {error ? <p className="error">{error}</p> : null}

      <section className="panel stack">
        <h2>Deadline notifications</h2>
        <table>
          <thead>
            <tr>
              <th>Alert</th>
              <th>Task</th>
              <th>Priority</th>
              <th>Due date</th>
            </tr>
          </thead>
          <tbody>
            {deadlineAlerts.length === 0 ? (
              <tr>
                <td colSpan={4}>No urgent deadline alerts</td>
              </tr>
            ) : (
              deadlineAlerts.map(({ task, kind }) => (
                <tr key={task.id}>
                  <td>{kind === "overdue" ? "Overdue" : "Due soon"}</td>
                  <td>{task.title}</td>
                  <td>{task.priority}</td>
                  <td>{task.due_date ? new Date(task.due_date).toLocaleString() : "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="panel stack">
        <h2>Task filters</h2>
        <form className="row" onSubmit={handleFilterSubmit}>
          <label className="col-3 stack">
            Search
            <input
              value={filters.q}
              onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
              placeholder="Task title"
            />
          </label>
          <label className="col-2 stack">
            Status
            <select
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
            >
              <option value="">All</option>
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>
          </label>
          <label className="col-2 stack">
            Priority
            <select
              value={filters.priority}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, priority: event.target.value }))
              }
            >
              <option value="">All</option>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <label className="col-2 stack">
            Overdue only
            <select
              value={filters.overdue}
              onChange={(event) => setFilters((prev) => ({ ...prev, overdue: event.target.value }))}
            >
              <option value="">No</option>
              <option value="true">Yes</option>
            </select>
          </label>
          <label className="col-2 stack">
            Due from
            <input
              type="datetime-local"
              value={filters.from}
              onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
            />
          </label>
          <label className="col-2 stack">
            Due to
            <input
              type="datetime-local"
              value={filters.to}
              onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
            />
          </label>
          <div className="col-1 stack action-end">
            <button className="btn btn-secondary" type="submit">
              Apply
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setFilters(initialFilters);
                void loadData(initialFilters);
              }}
            >
              Clear
            </button>
          </div>
        </form>
      </section>

      <section className="panel stack">
        <h2>{editingId ? "Edit task" : "New task"}</h2>
        <form className="stack" onSubmit={handleSubmit}>
          <div className="row">
            <label className="col-3 stack">
              Title
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
            </label>
            <label className="col-3 stack">
              Due date
              <input
                type="datetime-local"
                value={form.due_date}
                onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))}
              />
            </label>
            <label className="col-2 stack">
              Priority
              <select
                value={form.priority}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    priority: e.target.value as "low" | "normal" | "high" | "urgent",
                  }))
                }
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
            <label className="col-2 stack">
              Status
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    status: e.target.value as "todo" | "in_progress" | "done",
                  }))
                }
              >
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="done">Done</option>
              </select>
            </label>
            <label className="col-2 stack">
              Assigned to
              <select
                value={form.assigned_to}
                onChange={(e) => setForm((prev) => ({ ...prev, assigned_to: e.target.value }))}
              >
                <option value="">Auto assign</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.full_name ?? profile.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-3 stack">
              Lead
              <select
                value={form.lead_id}
                onChange={(e) => setForm((prev) => ({ ...prev, lead_id: e.target.value }))}
              >
                <option value="">No lead</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-3 stack">
              Company
              <select
                value={form.company_id}
                onChange={(e) => setForm((prev) => ({ ...prev, company_id: e.target.value }))}
              >
                <option value="">No company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-3 stack">
              Contact
              <select
                value={form.contact_id}
                onChange={(e) => setForm((prev) => ({ ...prev, contact_id: e.target.value }))}
              >
                <option value="">No contact</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.first_name} {contact.last_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-3 stack">
              Description
              <input
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </label>
          </div>
          <div className="inline-actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update task" : "Create task"}
            </button>
            {editingId ? (
              <button className="btn btn-secondary" type="button" onClick={resetForm}>
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="panel stack">
        <div className="inline-actions">
          <h2>Calendar view</h2>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => setCalendarMonth((prev) => startOfMonth(subMonths(prev, 1)))}
          >
            Prev month
          </button>
          <strong>{format(calendarMonth, "MMMM yyyy")}</strong>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => setCalendarMonth((prev) => startOfMonth(addMonths(prev, 1)))}
          >
            Next month
          </button>
        </div>

        <div className="calendar-grid calendar-weekdays">
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
          <div>Sun</div>
        </div>

        <div className="calendar-grid">
          {calendarDays.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayTasks = tasksByDay.get(key) ?? [];
            const inMonth = isSameMonth(day, calendarMonth);
            const today = isSameDay(day, new Date());

            return (
              <article
                key={key}
                className={`calendar-cell ${inMonth ? "" : "is-outside"} ${today ? "is-today" : ""}`}
              >
                <header>
                  <strong>{format(day, "d")}</strong>
                  {dayTasks.length > 0 ? <span className="small">{dayTasks.length} task(s)</span> : null}
                </header>
                <div className="calendar-task-list">
                  {dayTasks.slice(0, 3).map((task) => (
                    <div key={task.id} className={`calendar-task task-${task.status}`}>
                      {task.title}
                    </div>
                  ))}
                  {dayTasks.length > 3 ? (
                    <div className="small">+{dayTasks.length - 3} more</div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel stack">
        <h2>Task list</h2>
        <table>
          <thead>
            <tr>
              <th>Task</th>
              <th>Due</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Lead</th>
              <th>Assigned to</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td>{task.title}</td>
                <td>{task.due_date ? format(new Date(task.due_date), "yyyy-MM-dd HH:mm") : "-"}</td>
                <td>{task.priority}</td>
                <td>
                  <select
                    value={task.status}
                    onChange={(event) =>
                      void updateStatus(
                        task.id,
                        event.target.value as "todo" | "in_progress" | "done",
                      )
                    }
                  >
                    <option value="todo">To do</option>
                    <option value="in_progress">In progress</option>
                    <option value="done">Done</option>
                  </select>
                </td>
                <td>{leads.find((lead) => lead.id === task.lead_id)?.title ?? "-"}</td>
                <td>{profiles.find((profile) => profile.id === task.assigned_to)?.full_name ?? "-"}</td>
                <td>
                  <div className="inline-actions">
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => startEdit(task)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger"
                      type="button"
                      onClick={() => void deleteTask(task.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
