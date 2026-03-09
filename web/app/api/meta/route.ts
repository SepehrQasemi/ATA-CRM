import { requireAuthenticatedUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { normalizeStageRows } from "@/lib/pipeline-stage-labels";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;

  const [profilesRes, stagesRes, templatesRes] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id,full_name,role")
      .order("full_name", { ascending: true }),
    supabaseAdmin
      .from("pipeline_stages")
      .select("id,name,sort_order,is_closed")
      .order("sort_order", { ascending: true }),
    supabaseAdmin
      .from("email_templates")
      .select("id,name,event_type,subject,is_active")
      .order("created_at", { ascending: true }),
  ]);

  if (profilesRes.error) return fail("Failed to load profiles", 500, profilesRes.error.message);
  if (stagesRes.error) return fail("Failed to load pipeline stages", 500, stagesRes.error.message);
  if (templatesRes.error) return fail("Failed to load email templates", 500, templatesRes.error.message);

  return ok({
    profiles: profilesRes.data ?? [],
    stages: stagesRes.data ? normalizeStageRows(stagesRes.data) : [],
    templates: templatesRes.data ?? [],
  });
}
