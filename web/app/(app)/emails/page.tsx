"use client";

import { FormEvent, useEffect, useState } from "react";
import { Lead, Contact } from "@/lib/types";

type MetaResponse = {
  templates: Array<{
    id: string;
    name: string;
    event_type: string;
    subject: string;
    is_active: boolean;
  }>;
  error?: string;
};

type LeadsResponse = { leads: Lead[]; error?: string };
type ContactsResponse = { contacts: Contact[]; error?: string };
type LogsResponse = {
  logs: Array<{
    id: string;
    recipient_email: string;
    subject: string;
    status: string;
    provider_message_id: string | null;
    created_at: string;
    sent_at: string | null;
    error_message: string | null;
  }>;
  error?: string;
};

export default function EmailsPage() {
  const [templates, setTemplates] = useState<MetaResponse["templates"]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [logs, setLogs] = useState<LogsResponse["logs"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [runningJob, setRunningJob] = useState(false);
  const [form, setForm] = useState({
    lead_id: "",
    template_id: "",
    recipient_email: "",
    subject: "",
    body: "",
  });
  const [testForm, setTestForm] = useState({
    template_id: "",
    contact_id: "",
    subject: "",
  });

  async function loadData() {
    const [metaRes, leadRes, logsRes, contactsRes] = await Promise.all([
      fetch("/api/meta"),
      fetch("/api/leads"),
      fetch("/api/emails/logs"),
      fetch("/api/contacts"),
    ]);

    const metaJson = (await metaRes.json()) as MetaResponse;
    const leadJson = (await leadRes.json()) as LeadsResponse;
    const logsJson = (await logsRes.json()) as LogsResponse;
    const contactsJson = (await contactsRes.json()) as ContactsResponse;

    if (!metaRes.ok || !leadRes.ok || !logsRes.ok || !contactsRes.ok) {
      setError(
        metaJson.error ??
          leadJson.error ??
          logsJson.error ??
          contactsJson.error ??
          "Failed to load email module",
      );
      return;
    }

    setTemplates(metaJson.templates ?? []);
    setLeads(leadJson.leads ?? []);
    setLogs(logsJson.logs ?? []);
    setContacts(contactsJson.contacts ?? []);

    if (!testForm.template_id && (metaJson.templates?.length ?? 0) > 0) {
      setTestForm((prev) => ({ ...prev, template_id: metaJson.templates[0].id }));
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/emails/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        lead_id: form.lead_id || null,
        template_id: form.template_id || null,
        recipient_email: form.recipient_email || null,
        subject: form.subject || null,
        body: form.body || null,
      }),
    });
    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(json.error ?? "Failed to send email");
      setSending(false);
      return;
    }

    setSuccess(json.sent ? "Email sent successfully" : "Email logged as failed");
    setSending(false);
    setForm({
      lead_id: "",
      template_id: "",
      recipient_email: "",
      subject: "",
      body: "",
    });
    void loadData();
  }

  async function handleSendTest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSendingTest(true);
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/emails/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        template_id: testForm.template_id,
        contact_id: testForm.contact_id,
        subject: testForm.subject || null,
        is_test: true,
      }),
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json.error ?? "Failed to send test email");
      setSendingTest(false);
      return;
    }

    setSuccess(json.sent ? "Test email sent successfully" : "Test email failed");
    setSendingTest(false);
    setTestForm((prev) => ({ ...prev, subject: "" }));
    void loadData();
  }

  async function runFollowupJob(dryRun: boolean) {
    setRunningJob(true);
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/jobs/followup${dryRun ? "?dry_run=true" : ""}`, {
      method: "POST",
    });
    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(json.error ?? "Follow-up job failed");
      setRunningJob(false);
      return;
    }

    if (dryRun) {
      setSuccess(
        `Dry-run done: processed ${json.processed}, eligible ${json.eligible}, duplicates ${json.skippedDuplicate}`,
      );
    } else {
      setSuccess(
        `Follow-up done: processed ${json.processed}, sent ${json.sent}, failed ${json.failed}, duplicates ${json.skippedDuplicate}`,
      );
    }

    setRunningJob(false);
    void loadData();
  }

  return (
    <div className="stack">
      <section className="page-head">
        <h1>Email Automation</h1>
        <p>Manual sends, template tests, and automated 72h follow-up.</p>
      </section>

      {error ? <p className="error">{error}</p> : null}
      {success ? <p className="success">{success}</p> : null}

      <section className="panel stack">
        <div className="inline-actions">
          <h2>Run follow-up 72h</h2>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void runFollowupJob(true)}
            disabled={runningJob}
          >
            {runningJob ? "Running..." : "Dry run"}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void runFollowupJob(false)}
            disabled={runningJob}
          >
            {runningJob ? "Running..." : "Run real send"}
          </button>
        </div>
      </section>

      <section className="panel stack">
        <h2>Send manual email</h2>
        <form className="stack" onSubmit={handleSend}>
          <div className="row">
            <label className="col-4 stack">
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
            <label className="col-4 stack">
              Template
              <select
                value={form.template_id}
                onChange={(e) => setForm((prev) => ({ ...prev, template_id: e.target.value }))}
              >
                <option value="">Auto by event</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.event_type})
                  </option>
                ))}
              </select>
            </label>
            <label className="col-4 stack">
              Recipient email (optional)
              <input
                type="email"
                value={form.recipient_email}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, recipient_email: e.target.value }))
                }
              />
            </label>
            <label className="col-6 stack">
              Subject (optional)
              <input
                value={form.subject}
                onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
              />
            </label>
            <label className="col-6 stack">
              Body (optional)
              <textarea
                value={form.body}
                onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
              />
            </label>
          </div>
          <button className="btn btn-primary" type="submit" disabled={sending}>
            {sending ? "Sending..." : "Send email"}
          </button>
        </form>
      </section>

      <section className="panel stack">
        <h2>Send test email</h2>
        <form className="stack" onSubmit={handleSendTest}>
          <div className="row">
            <label className="col-4 stack">
              Template
              <select
                value={testForm.template_id}
                onChange={(event) =>
                  setTestForm((prev) => ({ ...prev, template_id: event.target.value }))
                }
                required
              >
                <option value="">Select template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.event_type})
                  </option>
                ))}
              </select>
            </label>
            <label className="col-4 stack">
              Contact
              <select
                value={testForm.contact_id}
                onChange={(event) =>
                  setTestForm((prev) => ({ ...prev, contact_id: event.target.value }))
                }
                required
              >
                <option value="">Select contact</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.first_name} {contact.last_name} ({contact.email ?? "no-email"})
                  </option>
                ))}
              </select>
            </label>
            <label className="col-4 stack">
              Subject override (optional)
              <input
                value={testForm.subject}
                onChange={(event) =>
                  setTestForm((prev) => ({ ...prev, subject: event.target.value }))
                }
              />
            </label>
          </div>
          <button className="btn btn-primary" type="submit" disabled={sendingTest}>
            {sendingTest ? "Sending..." : "Send test email"}
          </button>
        </form>
      </section>

      <section className="panel stack">
        <h2>Email logs</h2>
        <table>
          <thead>
            <tr>
              <th>Recipient</th>
              <th>Subject</th>
              <th>Status</th>
              <th>Provider ID</th>
              <th>Created</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{log.recipient_email}</td>
                <td>{log.subject}</td>
                <td>{log.status}</td>
                <td>{log.provider_message_id ?? "-"}</td>
                <td>{new Date(log.created_at).toLocaleString()}</td>
                <td>{log.error_message ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
