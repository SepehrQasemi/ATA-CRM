import { getUserRole, requireAuthenticatedUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase/admin";

type SearchItem = {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
};

type SearchPayload = {
  leads: SearchItem[];
  tasks: SearchItem[];
  companies: SearchItem[];
  contacts: SearchItem[];
  products: SearchItem[];
  categories: SearchItem[];
  colleagues: SearchItem[];
};

const emptyPayload: SearchPayload = {
  leads: [],
  tasks: [],
  companies: [],
  contacts: [],
  products: [],
  categories: [],
  colleagues: [],
};

function formatContactName(contact: {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}): string {
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ").trim();
  return name || contact.email || "-";
}

function formatColleagueName(profile: {
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  id: string;
}): string {
  const full = profile.full_name?.trim();
  if (full) return full;
  const combined = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
  return combined || profile.id.slice(0, 8);
}

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;
  const user = auth.user!;

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const limitRaw = Number(url.searchParams.get("limit") ?? "5");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 8) : 5;

  if (q.length < 1) return ok({ results: emptyPayload });

  const role = await getUserRole(user.id);
  const isAdmin = role === "admin";
  const pattern = `%${q}%`;

  const companiesQuery = supabaseAdmin
    .from("companies")
    .select("id,name,sector,city,country")
    .or(`name.ilike.${pattern},sector.ilike.${pattern},city.ilike.${pattern},country.ilike.${pattern}`)
    .order("name", { ascending: true })
    .limit(limit);

  const contactsQuery = supabaseAdmin
    .from("contacts")
    .select("id,first_name,last_name,email,job_title")
    .or(`first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern},job_title.ilike.${pattern}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  const productsQuery = supabaseAdmin
    .from("products")
    .select("id,name,sku,category,is_active")
    .or(`name.ilike.${pattern},sku.ilike.${pattern},category.ilike.${pattern}`)
    .order("name", { ascending: true })
    .limit(limit);

  const colleaguesQuery = supabaseAdmin
    .from("profiles")
    .select("id,full_name,first_name,last_name,position,department")
    .or(`full_name.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern},position.ilike.${pattern},department.ilike.${pattern}`)
    .order("full_name", { ascending: true })
    .limit(limit);

  const categoriesQuery = supabaseAdmin
    .from("product_categories")
    .select("id,name,description")
    .or(`name.ilike.${pattern},description.ilike.${pattern}`)
    .order("name", { ascending: true })
    .limit(limit);

  const leadsQuery = supabaseAdmin
    .from("leads")
    .select("id,title,source,status,estimated_value")
    .or(`title.ilike.${pattern},source.ilike.${pattern}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  const tasksQuery = supabaseAdmin
    .from("tasks")
    .select("id,title,status,priority,due_date,owner_id,assigned_to")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!isAdmin) {
    tasksQuery.or(`owner_id.eq.${user.id},assigned_to.eq.${user.id}`);
  }
  tasksQuery.ilike("title", pattern);

  const [
    { data: companies, error: companiesError },
    { data: contacts, error: contactsError },
    { data: products, error: productsError },
    { data: categories, error: categoriesError },
    { data: colleagues, error: colleaguesError },
    { data: leads, error: leadsError },
    { data: tasks, error: tasksError },
  ] = await Promise.all([
    companiesQuery,
    contactsQuery,
    productsQuery,
    categoriesQuery,
    colleaguesQuery,
    leadsQuery,
    tasksQuery,
  ]);

  const firstError =
    companiesError ??
    contactsError ??
    productsError ??
    categoriesError ??
    colleaguesError ??
    leadsError ??
    tasksError;

  if (firstError) {
    return fail("Failed to run global search", 500, firstError.message);
  }

  const results: SearchPayload = {
    companies: (companies ?? []).map((company) => ({
      id: company.id,
      label: company.name,
      sublabel: [company.sector, company.city, company.country].filter(Boolean).join(" - ") || undefined,
      href: `/companies/${company.id}`,
    })),
    contacts: (contacts ?? []).map((contact) => ({
      id: contact.id,
      label: formatContactName(contact),
      sublabel: [contact.email, contact.job_title].filter(Boolean).join(" - ") || undefined,
      href: `/contacts/${contact.id}`,
    })),
    products: (products ?? []).map((product) => ({
      id: product.id,
      label: product.name,
      sublabel: [product.sku, product.category, product.is_active ? "Active" : "Inactive"]
        .filter(Boolean)
        .join(" - "),
      href: `/products/${product.id}`,
    })),
    categories: (categories ?? []).map((category) => ({
      id: category.id,
      label: category.name,
      sublabel: category.description ?? undefined,
      href: `/categories/${category.id}`,
    })),
    colleagues: (colleagues ?? []).map((profile) => ({
      id: profile.id,
      label: formatColleagueName(profile),
      sublabel: [profile.position, profile.department].filter(Boolean).join(" - ") || undefined,
      href: `/colleagues/${profile.id}`,
    })),
    leads: (leads ?? []).map((lead) => ({
      id: lead.id,
      label: lead.title,
      sublabel: [lead.source, lead.status, `${Number(lead.estimated_value || 0).toLocaleString()} EUR`]
        .filter(Boolean)
        .join(" - "),
      href: `/leads?q=${encodeURIComponent(lead.title)}`,
    })),
    tasks: (tasks ?? []).map((task) => ({
      id: task.id,
      label: task.title,
      sublabel: [task.status, task.priority, task.due_date ? new Date(task.due_date).toLocaleDateString() : null]
        .filter(Boolean)
        .join(" - "),
      href: `/tasks?q=${encodeURIComponent(task.title)}`,
    })),
  };

  return ok({ results });
}
