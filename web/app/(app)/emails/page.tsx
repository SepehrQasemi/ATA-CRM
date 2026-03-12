"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AutocompleteInput } from "@/components/autocomplete-input";
import { PageTip } from "@/components/page-tip";
import { useLocale } from "@/components/locale-provider";
import { startsWithSuggestions } from "@/lib/search-suggestions";
import { Company, Contact, Lead } from "@/lib/types";

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
type CompaniesResponse = { companies: Company[]; error?: string };
type ColleaguesResponse = {
  actorRole?: string;
  colleagues: Array<{
    id: string;
    full_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  }>;
  error?: string;
};
type ProfileMeResponse = {
  profile?: {
    id: string;
    full_name: string | null;
    email: string | null;
    role: string;
  };
  error?: string;
};
type LogsResponse = {
  logs: Array<{
    id: string;
    recipient_email: string;
    subject: string;
    status: string;
    provider_message_id: string | null;
    open_count: number;
    click_count: number;
    opened_at: string | null;
    clicked_at: string | null;
    created_at: string;
    sent_at: string | null;
    error_message: string | null;
  }>;
  error?: string;
};

function extractEmailFromInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const angleMatch = trimmed.match(/<\s*([^<>\s]+@[^<>\s]+)\s*>/i);
  if (angleMatch?.[1]) return angleMatch[1].toLowerCase();

  const plainMatch = trimmed.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (!plainMatch?.[0]) return null;
  return plainMatch[0].toLowerCase();
}

function normalizeWebsiteDomain(website: string | null): string | null {
  if (!website) return null;
  const trimmed = website.trim();
  if (!trimmed) return null;

  try {
    const value = trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;
    const host = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}

export default function EmailsPage() {
  const { tr } = useLocale();
  const [templates, setTemplates] = useState<MetaResponse["templates"]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [colleagues, setColleagues] = useState<ColleaguesResponse["colleagues"]>([]);
  const [logs, setLogs] = useState<LogsResponse["logs"]>([]);
  const [currentRole, setCurrentRole] = useState("standard_user");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [runningFollowupJob, setRunningFollowupJob] = useState(false);
  const [runningTaskReminders, setRunningTaskReminders] = useState(false);
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

  const isAdmin = currentRole === "admin";

  async function loadData() {
    const [metaRes, leadRes, logsRes, contactsRes, companiesRes, colleaguesRes, profileRes] =
      await Promise.all([
        fetch("/api/meta"),
        fetch("/api/leads"),
        fetch("/api/emails/logs"),
        fetch("/api/contacts"),
        fetch("/api/companies"),
        fetch("/api/colleagues"),
        fetch("/api/profile/me"),
      ]);

    const metaJson = (await metaRes.json()) as MetaResponse;
    const leadJson = (await leadRes.json()) as LeadsResponse;
    const logsJson = (await logsRes.json()) as LogsResponse;
    const contactsJson = (await contactsRes.json()) as ContactsResponse;
    const companiesJson = (await companiesRes.json()) as CompaniesResponse;
    const colleaguesJson = (await colleaguesRes.json()) as ColleaguesResponse;
    const profileJson = (await profileRes.json()) as ProfileMeResponse;

    if (
      !metaRes.ok ||
      !leadRes.ok ||
      !logsRes.ok ||
      !contactsRes.ok ||
      !companiesRes.ok ||
      !colleaguesRes.ok ||
      !profileRes.ok
    ) {
      setError(
        metaJson.error ??
          leadJson.error ??
          logsJson.error ??
          contactsJson.error ??
          companiesJson.error ??
          colleaguesJson.error ??
          profileJson.error ??
          tr("Failed to load email module"),
      );
      return;
    }

    setTemplates(metaJson.templates ?? []);
    setLeads(leadJson.leads ?? []);
    setLogs(logsJson.logs ?? []);
    setContacts(contactsJson.contacts ?? []);
    setCompanies(companiesJson.companies ?? []);
    setColleagues(colleaguesJson.colleagues ?? []);
    setCurrentRole(profileJson.profile?.role ?? colleaguesJson.actorRole ?? "standard_user");

    if (!testForm.template_id && (metaJson.templates?.length ?? 0) > 0) {
      setTestForm((prev) => ({ ...prev, template_id: metaJson.templates[0].id }));
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recipientCandidates = useMemo(() => {
    const entries: string[] = [];

    contacts.forEach((contact) => {
      if (!contact.email) return;
      const fullName = `${contact.first_name} ${contact.last_name}`.trim();
      entries.push(`${fullName} <${contact.email}>`);
    });

    colleagues.forEach((colleague) => {
      if (!colleague.email) return;
      const fullName =
        colleague.full_name ||
        `${colleague.first_name ?? ""} ${colleague.last_name ?? ""}`.trim() ||
        tr("Colleague");
      entries.push(`${fullName} <${colleague.email}>`);
    });

    companies.forEach((company) => {
      const domain = normalizeWebsiteDomain(company.website);
      if (!domain) return;
      entries.push(`${company.name} <info@${domain}>`);
      entries.push(`${company.name} <sales@${domain}>`);
    });

    return [...new Set(entries)];
  }, [companies, colleagues, contacts, tr]);

  const recipientSuggestions = useMemo(
    () => startsWithSuggestions(recipientCandidates, form.recipient_email, 5),
    [form.recipient_email, recipientCandidates],
  );

  const emailStats = useMemo(() => {
    const sentLogs = logs.filter((log) => log.status === "sent");
    const sent = sentLogs.length;
    const opened = sentLogs.filter((log) => Number(log.open_count || 0) > 0).length;
    const clicked = sentLogs.filter((log) => Number(log.click_count || 0) > 0).length;
    const openRate = sent === 0 ? 0 : Number(((opened / sent) * 100).toFixed(2));
    const clickRate = sent === 0 ? 0 : Number(((clicked / sent) * 100).toFixed(2));

    return { sent, opened, clicked, openRate, clickRate };
  }, [logs]);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError(null);
    setSuccess(null);

    const recipient = extractEmailFromInput(form.recipient_email);
    if (!recipient) {
      setError(tr("Recipient is required."));
      setSending(false);
      return;
    }

    if (!form.subject.trim()) {
      setError(tr("Subject is required."));
      setSending(false);
      return;
    }

    if (!form.body.trim()) {
      setError(tr("Body is required."));
      setSending(false);
      return;
    }

    const response = await fetch("/api/emails/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lead_id: form.lead_id || null,
        template_id: form.template_id || null,
        recipient_email: recipient,
        subject: form.subject.trim(),
        body: form.body.trim(),
      }),
    });
    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(json.error ?? tr("Failed to send email"));
      setSending(false);
      return;
    }

    setSuccess(json.sent ? tr("Email sent successfully") : tr("Email logged as failed"));
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
      setError(json.error ?? tr("Failed to send test email"));
      setSendingTest(false);
      return;
    }

    setSuccess(json.sent ? tr("Test email sent successfully") : tr("Test email failed"));
    setSendingTest(false);
    setTestForm((prev) => ({ ...prev, subject: "" }));
    void loadData();
  }

  async function runFollowupJob(dryRun: boolean) {
    setRunningFollowupJob(true);
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/jobs/followup${dryRun ? "?dry_run=true" : ""}`, {
      method: "POST",
    });
    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(json.error ?? tr("Follow-up job failed"));
      setRunningFollowupJob(false);
      return;
    }

    if (dryRun) {
      setSuccess(
        tr("Follow-up dry-run: processed {processed}, eligible {eligible}, duplicates {duplicates}", {
          processed: Number(json.processed ?? 0),
          eligible: Number(json.eligible ?? 0),
          duplicates: Number(json.skippedDuplicate ?? 0),
        }),
      );
    } else {
      setSuccess(
        tr(
          "Follow-up run: processed {processed}, sent {sent}, failed {failed}, duplicates {duplicates}",
          {
            processed: Number(json.processed ?? 0),
            sent: Number(json.sent ?? 0),
            failed: Number(json.failed ?? 0),
            duplicates: Number(json.skippedDuplicate ?? 0),
          },
        ),
      );
    }

    setRunningFollowupJob(false);
    void loadData();
  }

  async function runTaskReminderJob(dryRun: boolean) {
    setRunningTaskReminders(true);
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/jobs/task-reminders${dryRun ? "?dry_run=true" : ""}`, {
      method: "POST",
    });
    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(json.error ?? tr("Task reminder job failed"));
      setRunningTaskReminders(false);
      return;
    }

    if (dryRun) {
      setSuccess(
        tr("Task reminder dry-run: processed {processed}, eligible {eligible}, duplicates {duplicates}", {
          processed: Number(json.processed ?? 0),
          eligible: Number(json.eligible ?? 0),
          duplicates: Number(json.skippedDuplicate ?? 0),
        }),
      );
    } else {
      setSuccess(
        tr(
          "Task reminders: processed {processed}, sent {sent}, failed {failed}, duplicates {duplicates}",
          {
            processed: Number(json.processed ?? 0),
            sent: Number(json.sent ?? 0),
            failed: Number(json.failed ?? 0),
            duplicates: Number(json.skippedDuplicate ?? 0),
          },
        ),
      );
    }

    setRunningTaskReminders(false);
    void loadData();
  }

  return (
    <div className="stack">
      <PageTip
        id="tip-emails-jobs"
        title={tr("Quick onboarding")}
        detail={tr("Start with dry-run jobs, then run real sends and verify open/click analytics in logs.")}
      />
      <section className="page-head">
        <h1>{tr("Email Automation")}</h1>
        <p>{tr("Manual sends, template tests, follow-up automation, and email performance analytics.")}</p>
      </section>

      {error ? <p className="error">{error}</p> : null}
      {success ? <p className="success">{success}</p> : null}

      {isAdmin ? (
        <>
          <section className="panel stack">
            <div className="inline-actions">
              <h2>{tr("Run follow-up 72h")}</h2>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => void runFollowupJob(true)}
                disabled={runningFollowupJob}
              >
                {runningFollowupJob ? tr("Running...") : tr("Dry run follow-up")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void runFollowupJob(false)}
                disabled={runningFollowupJob}
              >
                {runningFollowupJob ? tr("Running...") : tr("Run real send")}
              </button>
            </div>
          </section>

          <section className="panel stack">
            <div className="inline-actions">
              <h2>{tr("Run task deadline reminders")}</h2>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => void runTaskReminderJob(true)}
                disabled={runningTaskReminders}
              >
                {runningTaskReminders ? tr("Running...") : tr("Dry run reminders")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void runTaskReminderJob(false)}
                disabled={runningTaskReminders}
              >
                {runningTaskReminders ? tr("Running...") : tr("Run reminder sends")}
              </button>
            </div>
          </section>
        </>
      ) : (
        <section className="panel stack">
          <h2>{tr("Admin-only automation controls.")}</h2>
          <p className="small">{tr("Manual send and personal analytics are available for your role.")}</p>
        </section>
      )}

      <section className="panel stack">
        <h2>{tr("Send manual email")}</h2>
        <p className="small">{tr("Recipient suggestions include contacts, colleagues, and company domains.")}</p>
        <p className="small">{tr("Template fills the default subject and body. You can still edit both before sending.")}</p>
        <form className="stack" onSubmit={handleSend}>
          <div className="row">
            <label className="col-6 stack">
              {tr("Lead")}
              <select
                value={form.lead_id}
                onChange={(e) => setForm((prev) => ({ ...prev, lead_id: e.target.value }))}
              >
                <option value="">{tr("No lead")}</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-6 stack">
              {tr("Template")}
              <select
                value={form.template_id}
                onChange={(e) => setForm((prev) => ({ ...prev, template_id: e.target.value }))}
              >
                <option value="">{tr("Auto by event")}</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.event_type})
                  </option>
                ))}
              </select>
            </label>
            <label className="col-12 stack">
              {tr("Recipient")}
              <AutocompleteInput
                value={form.recipient_email}
                onChange={(nextValue) =>
                  setForm((prev) => ({ ...prev, recipient_email: nextValue }))
                }
                suggestions={recipientSuggestions}
                placeholder={tr("Recipient name or email")}
                listId="manual-email-recipient-suggestions"
              />
            </label>
            <label className="col-12 stack">
              {tr("Subject")}
              <input
                value={form.subject}
                onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
              />
            </label>
            <label className="col-12 stack">
              {tr("Body")}
              <textarea
                className="email-compose-body"
                value={form.body}
                onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
              />
            </label>
          </div>
          <button className="btn btn-primary" type="submit" disabled={sending}>
            {sending ? tr("Sending...") : tr("Send email")}
          </button>
        </form>
      </section>

      {isAdmin ? (
        <section className="panel stack">
          <h2>{tr("Send test email")}</h2>
          <p className="small">{tr("Templates are reusable messages for recurring events (welcome, follow-up).")}</p>
          <form className="stack" onSubmit={handleSendTest}>
            <div className="row">
              <label className="col-4 stack">
                {tr("Template")}
                <select
                  value={testForm.template_id}
                  onChange={(event) =>
                    setTestForm((prev) => ({ ...prev, template_id: event.target.value }))
                  }
                  required
                >
                  <option value="">{tr("Select template")}</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({template.event_type})
                    </option>
                  ))}
                </select>
              </label>
              <label className="col-4 stack">
                {tr("Contact")}
                <select
                  value={testForm.contact_id}
                  onChange={(event) =>
                    setTestForm((prev) => ({ ...prev, contact_id: event.target.value }))
                  }
                  required
                >
                  <option value="">{tr("Select contact")}</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name} ({contact.email ?? tr("No email")})
                    </option>
                  ))}
                </select>
              </label>
              <label className="col-4 stack">
                {tr("Subject override (optional)")}
                <input
                  value={testForm.subject}
                  onChange={(event) =>
                    setTestForm((prev) => ({ ...prev, subject: event.target.value }))
                  }
                />
              </label>
            </div>
            <button className="btn btn-primary" type="submit" disabled={sendingTest}>
              {sendingTest ? tr("Sending...") : tr("Send test email")}
            </button>
          </form>
        </section>
      ) : null}

      <section className="panel stack">
        <h2>{isAdmin ? tr("Email analytics") : tr("My email analytics")}</h2>
        <div className="card-grid">
          <article className="card">
            <p className="muted">{tr("Sent emails")}</p>
            <p className="kpi">{emailStats.sent}</p>
          </article>
          <article className="card">
            <p className="muted">{tr("Opened emails")}</p>
            <p className="kpi">{emailStats.opened}</p>
          </article>
          <article className="card">
            <p className="muted">{tr("Open rate")}</p>
            <p className="kpi">{emailStats.openRate}%</p>
          </article>
          <article className="card">
            <p className="muted">{tr("Click rate")}</p>
            <p className="kpi">{emailStats.clickRate}%</p>
          </article>
        </div>
      </section>

      <section className="panel stack">
        <h2>{isAdmin ? tr("Email logs") : tr("My email logs")}</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{tr("Recipient")}</th>
                <th>{tr("Subject")}</th>
                <th>{tr("Status")}</th>
                <th>{tr("Provider ID")}</th>
                <th>{tr("Opens")}</th>
                <th>{tr("Clicks")}</th>
                <th>{tr("Opened at")}</th>
                <th>{tr("Clicked at")}</th>
                <th>{tr("Created")}</th>
                <th>{tr("Error")}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.recipient_email}</td>
                  <td>{log.subject}</td>
                  <td>{tr(log.status)}</td>
                  <td>{log.provider_message_id ?? "-"}</td>
                  <td>{log.open_count ?? 0}</td>
                  <td>{log.click_count ?? 0}</td>
                  <td>{log.opened_at ? new Date(log.opened_at).toLocaleString() : "-"}</td>
                  <td>{log.clicked_at ? new Date(log.clicked_at).toLocaleString() : "-"}</td>
                  <td>{new Date(log.created_at).toLocaleString()}</td>
                  <td>{log.error_message ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
