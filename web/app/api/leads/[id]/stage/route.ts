import { getUserRole, requireAuthenticatedUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import {
  isLostStageName,
  isWonStageName,
} from "@/lib/pipeline-stage-labels";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;
  const user = auth.user!;
  const role = await getUserRole(user.id);
  const isAdmin = role === "admin";

  const { id } = await params;
  const body = await request.json();
  if (!body.stage_id) return fail("stage_id is required", 400);
  const stageId = String(body.stage_id);
  const comment = body.comment ? String(body.comment) : "Manual stage update";

  const { data: lead, error: leadError } = await supabaseAdmin
    .from("leads")
    .select("id,owner_id,assigned_to,current_stage_id")
    .eq("id", id)
    .single();

  if (leadError || !lead) return fail("Lead not found", 404);
  if (!isAdmin && lead.owner_id !== user.id && lead.assigned_to !== user.id) {
    return fail("Forbidden", 403);
  }

  const { data: stage, error: stageError } = await supabaseAdmin
    .from("pipeline_stages")
    .select("id,name")
    .eq("id", stageId)
    .single();

  if (stageError || !stage) return fail("Stage not found", 404);

  const status = isWonStageName(stage.name) ? "won" : isLostStageName(stage.name) ? "lost" : "open";

  const { error: updateError } = await supabaseAdmin
    .from("leads")
    .update({
      current_stage_id: stageId,
      status,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) return fail("Failed to update lead stage", 500, updateError.message);

  const { error: historyError } = await supabaseAdmin
    .from("lead_stage_history")
    .insert({
      lead_id: id,
      from_stage_id: lead.current_stage_id,
      to_stage_id: stageId,
      changed_by: user.id,
      comment,
    });

  if (historyError) return fail("Failed to save stage history", 500, historyError.message);

  return ok({ moved: true, stage: stage.name, status });
}
