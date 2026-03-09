export type Role = "admin" | "commercial" | "standard_user";

export type Company = {
  id: string;
  name: string;
  sector: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  notes: string | null;
  created_at: string;
};

export type Contact = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company_id: string | null;
  job_title: string | null;
  notes: string | null;
  created_at: string;
};

export type PipelineStage = {
  id: string;
  name: string;
  sort_order: number;
  is_closed: boolean;
};

export type Lead = {
  id: string;
  title: string;
  source: string | null;
  status: "open" | "won" | "lost";
  estimated_value: number;
  company_id: string | null;
  contact_id: string | null;
  assigned_to: string | null;
  current_stage_id: string | null;
  owner_id: string | null;
  notes: string | null;
  last_activity_at: string | null;
  created_at: string;
  updated_at?: string;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  status: "todo" | "in_progress" | "done";
  assigned_to: string | null;
  lead_id: string | null;
  company_id?: string | null;
  contact_id?: string | null;
  owner_id?: string | null;
  created_at: string;
};

export type EmailLog = {
  id: string;
  recipient_email: string;
  subject: string;
  status: "pending" | "sent" | "failed";
  created_at: string;
  sent_at: string | null;
  provider_message_id?: string | null;
  error_message: string | null;
};
