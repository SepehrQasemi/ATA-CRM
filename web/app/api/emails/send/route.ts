import { requireAuthenticatedUser } from "@/lib/auth";
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

async function resolveRecipient(body: Record<string, unknown>): Promise<Recipient | null> {
  const leadId = body.lead_id ? String(body.lead_id) : null;
  const contactId = body.contact_id ? String(body.contact_id) : null;
  const explicitEmail = body.recipient_email ? String(body.recipient_email) : null;

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

  if (leadId) {
    const { data: lead } = await supabaseAdmin
      .from("leads")
      .select("id,contact_id")
      .eq("id", leadId)
      .single();

    if (!lead) return null;

    if (lead.contact_id) {
      const { data: contact } = await supabaseAdmin
        .from("contacts")
        .select("id,first_name,last_name,email")
        .eq("id", lead.contact_id)
        .single();

      if (contact?.email) {
        return {
          email: contact.email,
          name: `${contact.first_name} ${contact.last_name}`.trim() || "Client",
          contactId: contact.id,
          leadId: lead.id,
        };
      }
    }

    if (!explicitEmail) return null;

    return {
      email: explicitEmail,
      name: "Client",
      contactId: null,
      leadId: lead.id,
    };
  }

  if (!explicitEmail) return null;

  return {
    email: explicitEmail,
    name: "Client",
    contactId: null,
    leadId: null,
  };
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;

  const body = (await request.json()) as Record<string, unknown>;
  const templateId = body.template_id ? String(body.template_id) : null;
  const eventType = body.event_type ? String(body.event_type) : "custom";
  const isTest = body.is_test === true;

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

  const subjectBase = body.subject
    ? String(body.subject)
    : template?.subject ?? "CRM Notification";

  const bodyText = body.body
    ? String(body.body)
    : renderTemplate(template?.body ?? "Hello {{name}}", recipient.name);

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
