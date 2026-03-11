export type Role = "admin" | "manager" | "commercial" | "standard_user";

export type Company = {
  id: string;
  name: string;
  company_role: "supplier" | "customer" | "both";
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
  is_company_agent: boolean;
  agent_rank: number | null;
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
  sender_user_id?: string | null;
  recipient_email: string;
  subject: string;
  status: "pending" | "sent" | "failed";
  open_count: number;
  click_count: number;
  opened_at: string | null;
  clicked_at: string | null;
  created_at: string;
  sent_at: string | null;
  provider_message_id?: string | null;
  error_message: string | null;
};

export type Product = {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  unit: string;
  default_purchase_price: number;
  default_sale_price: number;
  is_active: boolean;
  notes: string | null;
  owner_id: string | null;
  created_at: string;
};

export type ProductCategory = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  product_count?: number;
};

export type ProductCompanyLink = {
  id: string;
  product_id: string;
  company_id: string;
  relation_type: "traded" | "potential";
  product_model: string;
  last_price: number | null;
  notes: string | null;
  owner_id: string | null;
  created_at: string;
};
