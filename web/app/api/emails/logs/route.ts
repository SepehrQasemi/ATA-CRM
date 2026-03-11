import { getUserRole, requireAuthenticatedUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;
  const user = auth.user!;
  const role = await getUserRole(user.id);
  const isAdmin = role === "admin";

  const query = supabaseAdmin
    .from("email_logs")
    .select(
      "id,lead_id,contact_id,sender_user_id,recipient_email,subject,status,provider_message_id,error_message,open_count,click_count,opened_at,clicked_at,created_at,sent_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (!isAdmin) {
    query.eq("sender_user_id", user.id);
  }

  const { data, error } = await query;
  if (error) return fail("Failed to load email logs", 500, error.message);
  return ok({ logs: data ?? [] });
}
