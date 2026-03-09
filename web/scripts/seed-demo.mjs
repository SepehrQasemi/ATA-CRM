import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFromFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const sep = line.indexOf("=");
    if (sep <= 0) continue;
    const key = line.slice(0, sep).trim();
    const value = line.slice(sep + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const envFile = path.resolve(process.cwd(), ".env.local");
loadEnvFromFile(envFile);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  console.error("Create web/.env.local first, then rerun npm run seed:demo.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function ensureCompany(payload) {
  const { data: existing, error: findError } = await supabase
    .from("companies")
    .select("id")
    .eq("name", payload.name)
    .limit(1);
  if (findError) throw new Error(`Company lookup failed: ${findError.message}`);

  if (existing && existing.length > 0) {
    const { error: updateError } = await supabase
      .from("companies")
      .update(payload)
      .eq("id", existing[0].id);
    if (updateError) throw new Error(`Company update failed: ${updateError.message}`);
    return existing[0].id;
  }

  const { data, error } = await supabase
    .from("companies")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(`Company insert failed: ${error.message}`);
  return data.id;
}

async function ensureContact(payload) {
  const { data: existing, error: findError } = await supabase
    .from("contacts")
    .select("id")
    .eq("email", payload.email)
    .limit(1);
  if (findError) throw new Error(`Contact lookup failed: ${findError.message}`);

  if (existing && existing.length > 0) {
    const { error: updateError } = await supabase
      .from("contacts")
      .update(payload)
      .eq("id", existing[0].id);
    if (updateError) throw new Error(`Contact update failed: ${updateError.message}`);
    return existing[0].id;
  }

  const { data, error } = await supabase
    .from("contacts")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(`Contact insert failed: ${error.message}`);
  return data.id;
}

async function ensureLead(payload) {
  const { data: existing, error: findError } = await supabase
    .from("leads")
    .select("id")
    .eq("title", payload.title)
    .limit(1);
  if (findError) throw new Error(`Lead lookup failed: ${findError.message}`);

  if (existing && existing.length > 0) {
    const { error: updateError } = await supabase
      .from("leads")
      .update(payload)
      .eq("id", existing[0].id);
    if (updateError) throw new Error(`Lead update failed: ${updateError.message}`);
    return existing[0].id;
  }

  const { data, error } = await supabase
    .from("leads")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(`Lead insert failed: ${error.message}`);
  return data.id;
}

async function ensureTask(payload) {
  const { data: existing, error: findError } = await supabase
    .from("tasks")
    .select("id")
    .eq("title", payload.title)
    .limit(1);
  if (findError) throw new Error(`Task lookup failed: ${findError.message}`);

  if (existing && existing.length > 0) {
    const { error: updateError } = await supabase
      .from("tasks")
      .update(payload)
      .eq("id", existing[0].id);
    if (updateError) throw new Error(`Task update failed: ${updateError.message}`);
    return existing[0].id;
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(`Task insert failed: ${error.message}`);
  return data.id;
}

async function main() {
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id,role")
    .in("role", ["admin", "commercial"])
    .limit(5);

  if (profilesError) throw new Error(`Failed to load profiles: ${profilesError.message}`);
  if (!profiles || profiles.length === 0) {
    throw new Error("No admin/commercial profile found. Create at least one user first.");
  }

  const ownerId = profiles[0].id;

  const { data: stages, error: stagesError } = await supabase
    .from("pipeline_stages")
    .select("id,name");
  if (stagesError) throw new Error(`Failed to load stages: ${stagesError.message}`);

  const stageAliases = {
    "New Lead": ["New Lead", "Nouveau lead"],
    Qualification: ["Qualification"],
    "Sample Sent": ["Sample Sent", "Echantillon envoye"],
    "Quote Sent": ["Quote Sent", "Devis envoye"],
    Negotiation: ["Negotiation", "Negociation"],
    Won: ["Won", "Gagne"],
    Lost: ["Lost", "Perdu"],
  };

  const stageByName = new Map((stages ?? []).map((stage) => [stage.name, stage.id]));
  function getStageId(canonicalName) {
    const aliases = stageAliases[canonicalName] ?? [canonicalName];
    for (const alias of aliases) {
      const stageId = stageByName.get(alias);
      if (stageId) return stageId;
    }
    return null;
  }

  const requiredStages = ["Qualification", "Quote Sent", "Negotiation", "Won", "Lost"];
  for (const stageName of requiredStages) {
    if (!getStageId(stageName)) {
      throw new Error(`Missing pipeline stage: ${stageName}`);
    }
  }

  const companyA = await ensureCompany({
    name: "Demo BioTrade SAS",
    sector: "Food Ingredients",
    city: "Lyon",
    country: "France",
    website: "https://example.com/biotrade",
    notes: "[DEMO] Importer of cocoa and milk powder",
    owner_id: ownerId,
  });

  const companyB = await ensureCompany({
    name: "Demo AgroNord SARL",
    sector: "Food Ingredients",
    city: "Lille",
    country: "France",
    website: "https://example.com/agronord",
    notes: "[DEMO] B2B distribution of raw food ingredients",
    owner_id: ownerId,
  });

  const companyC = await ensureCompany({
    name: "Demo SpiceHub Europe",
    sector: "Food Ingredients",
    city: "Marseille",
    country: "France",
    website: "https://example.com/spicehub",
    notes: "[DEMO] Spice blends for the food industry",
    owner_id: ownerId,
  });

  const contactA = await ensureContact({
    first_name: "Amine",
    last_name: "Belaid",
    email: "demo.amine@crm-food-trading.local",
    phone: "+33 6 11 22 33 44",
    job_title: "Senior Buyer",
    notes: "[DEMO] Priority contact",
    company_id: companyA,
    owner_id: ownerId,
  });

  const contactB = await ensureContact({
    first_name: "Sophie",
    last_name: "Martin",
    email: "demo.sophie@crm-food-trading.local",
    phone: "+33 6 22 33 44 55",
    job_title: "Category Manager",
    notes: "[DEMO] Decision maker",
    company_id: companyB,
    owner_id: ownerId,
  });

  const contactC = await ensureContact({
    first_name: "Karim",
    last_name: "Nouri",
    email: "demo.karim@crm-food-trading.local",
    phone: "+33 6 33 44 55 66",
    job_title: "Purchasing Director",
    notes: "[DEMO] Strong conversion potential",
    company_id: companyC,
    owner_id: ownerId,
  });

  const leadA = await ensureLead({
    title: "[DEMO] Import cacao premium Q2",
    source: "LinkedIn",
    status: "open",
    estimated_value: 42000,
    company_id: companyA,
    contact_id: contactA,
    assigned_to: ownerId,
    current_stage_id: getStageId("Qualification"),
    last_activity_at: new Date().toISOString(),
    owner_id: ownerId,
    notes: "[DEMO] Qualification in progress",
  });

  const leadB = await ensureLead({
    title: "[DEMO] Instant milk powder - tender request",
    source: "Referral",
    status: "open",
    estimated_value: 67000,
    company_id: companyB,
    contact_id: contactB,
    assigned_to: ownerId,
    current_stage_id: getStageId("Quote Sent"),
    last_activity_at: new Date(Date.now() - 80 * 60 * 60 * 1000).toISOString(),
    owner_id: ownerId,
    notes: "[DEMO] Ready for 72h follow-up scenario",
  });

  const leadC = await ensureLead({
    title: "[DEMO] Spice mix for industrial sauces",
    source: "SIAL Expo",
    status: "won",
    estimated_value: 53000,
    company_id: companyC,
    contact_id: contactC,
    assigned_to: ownerId,
    current_stage_id: getStageId("Won"),
    last_activity_at: new Date().toISOString(),
    owner_id: ownerId,
    notes: "[DEMO] Contract signed",
  });

  await ensureLead({
    title: "[DEMO] Natural preservation additive",
    source: "Website",
    status: "lost",
    estimated_value: 19000,
    company_id: companyA,
    contact_id: contactA,
    assigned_to: ownerId,
    current_stage_id: getStageId("Lost"),
    last_activity_at: new Date().toISOString(),
    owner_id: ownerId,
    notes: "[DEMO] Opportunity lost on pricing",
  });

  await ensureTask({
    title: "[DEMO] Follow up on premium cocoa quote",
    description: "Call client to confirm payment terms",
    due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    priority: "high",
    status: "todo",
    assigned_to: ownerId,
    owner_id: ownerId,
    lead_id: leadA,
    company_id: companyA,
    contact_id: contactA,
  });

  await ensureTask({
    title: "[DEMO] Verify milk powder logistics",
    description: "Confirm transport lead time and Incoterms",
    due_date: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    priority: "urgent",
    status: "in_progress",
    assigned_to: ownerId,
    owner_id: ownerId,
    lead_id: leadB,
    company_id: companyB,
    contact_id: contactB,
  });

  await ensureTask({
    title: "[DEMO] Prepare SpiceHub customer onboarding",
    description: "Commercial documents checklist",
    due_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    priority: "normal",
    status: "todo",
    assigned_to: ownerId,
    owner_id: ownerId,
    lead_id: leadC,
    company_id: companyC,
    contact_id: contactC,
  });

  console.log("Demo seed completed successfully.");
  console.log("Companies: 3 | Contacts: 3 | Leads: 4 | Tasks: 3");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
