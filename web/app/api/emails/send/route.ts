import { getUserRole, requireAuthenticatedUser } from "@/lib/auth";
import { sendBrevoEmail } from "@/lib/brevo";
import { fail, ok } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase/admin";

function renderTemplate(template: string, name: string) {
  return template.replaceAll("{{name}}", name || "Client");
}

type Recipient = {
  email: string;
  name: string;
  contactId: string | null;
  leadId: string | null;
};

function extractEmailAddress(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const angleMatch = trimmed.match(/<\s*([^<>\s]+@[^<>\s]+)\s*>/i);
  if (angleMatch?.[1]) return angleMatch[1].toLowerCase();

  const plainMatch = trimmed.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (!plainMatch?.[0]) return null;
  return plainMatch[0].toLowerCase();
}

async function resolveRecipient(body: Record<string, unknown>): Promise<Recipient | null> {
  const leadId = body.lead_id ? String(body.lead_id) : null;
  const contactId = body.contact_id ? String(body.contact_id) : null;
  const explicitEmail = extractEmailAddress(
    body.recipient_email ? String(body.recipient_email) : null,
  );

  if (contactId) {
    const { data: contact } = await supabaseAdmin
      .from("contacts")
      .select("id,first_name,last_name,email")
      .eq("id", contactId)
      .single();

    if (!contact?.email) return null;

    return {
      email: contact.email,
      name: `${contact.first_name} ${contact.last_name}`.trim() || "Client",
      contactId: contact.id,
      leadId,
    };
  }

  if (explicitEmail) {
    return {
      email: explicitEmail,
      name: "Client",
      contactId: null,
      leadId,
    };
  }

  if (leadId) {
    const { data: lead } = await supabaseAdmin
      .from("leads")
      .select("id,contact_id")
      .eq("id", leadId)
      .single();

    if (!lead?.contact_id) return null;

    const { data: contact } = await supabaseAdmin
      .from("contacts")
      .select("id,first_name,last_name,email")
      .eq("id", lead.contact_id)
      .single();

    if (!contact?.email) return null;

    return {
      email: contact.email,
      name: `${contact.first_name} ${contact.last_name}`.trim() || "Client",
      contactId: contact.id,
      leadId: lead.id,
    };
  }

  return null;
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;
  const user = auth.user!;
  const role = await getUserRole(user.id);

  const body = (await request.json()) as Record<string, unknown>;
  const templateId = body.template_id ? String(body.template_id) : null;
  const eventType = body.event_type ? String(body.event_type) : "custom";
  const isTest = body.is_test === true;
  const recipientInput = body.recipient_email ? String(body.recipient_email) : "";
  const manualSubject = body.subject ? String(body.subject).trim() : "";
  const manualBody = body.body ? String(body.body).trim() : "";

  if (isTest && role !== "admin") {
    return fail("Only admins can send test emails", 403);
  }

  if (isTest && !body.contact_id) {
    return fail("contact_id is required for test emails", 400);
  }

  if (isTest && !templateId) {
    return fail("template_id is required for test emails", 400);
  }

  if (!isTest) {
    if (!extractEmailAddress(recipientInput)) {
      return fail("Recipient email is required", 400);
    }
    if (!manualSubject) return fail("Subject is required", 400);
    if (!manualBody) return fail("Body is required", 400);
  }

  const recipient = await resolveRecipient(body);
  if (!recipient) {
    return fail("lead_id/contact_id/recipient_email required with resolvable recipient", 400);
  }

  let template:
    | { id: string; name: string; event_type: string; subject: string; body: string }
    | null = null;

  if (templateId) {
    const { data } = await supabaseAdmin
      .from("email_templates")
      .select("id,name,event_type,subject,body")
      .eq("id", templateId)
      .single();
    template = data ?? null;
  } else {
    const { data } = await supabaseAdmin
      .from("email_templates")
      .select("id,name,event_type,subject,body")
      .eq("event_type", eventType)
      .eq("is_active", true)
      .limit(1)
      .single();
    template = data ?? null;
  }

  if (templateId && !template) {
    return fail("Template not found", 404);
  }

  const subjectBase = isTest
    ? manualSubject || template?.subject || "CRM Notification"
    : manualSubject;

  const bodyText = isTest
    ? manualBody || renderTemplate(template?.body ?? "Hello {{name}}", recipient.name)
    : manualBody;

  const subject = isTest ? `[TEST] ${subjectBase}` : subjectBase;

  const sent = await sendBrevoEmail({
    toEmail: recipient.email,
    toName: recipient.name,
    subject,
    text: bodyText,
  });

  const status = sent.ok ? "sent" : "failed";

  const { data: log, error: logError } = await supabaseAdmin
    .from("email_logs")
    .insert({
      lead_id: recipient.leadId,
      contact_id: recipient.contactId,
      template_id: template?.id ?? null,
      sender_user_id: user.id,
      recipient_email: recipient.email,
      subject,
      body: bodyText,
      status,
      provider_message_id: sent.ok ? sent.messageId ?? null : null,
      error_message: sent.ok ? null : sent.error ?? "Unknown email error",
      sent_at: sent.ok ? new Date().toISOString() : null,
    })
    .select(
      "id,recipient_email,subject,status,provider_message_id,error_message,created_at,sent_at",
    )
    .single();

  if (logError) return fail("Email send result logged failed", 500, logError.message);

  return ok({
    sent: sent.ok,
    isTest,
    log,
    provider: sent.payload ?? null,
    error: sent.ok ? null : sent.error,
  });
}
