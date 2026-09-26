// Classic, well-documented Supabase Edge Function client setup:
// a user-scoped client (forwards the caller's JWT, so RLS applies
// exactly as it would for a direct client call) plus a service-role
// admin client for the privileged writes the architecture calls for
// (practice_items, practice_responses, llm_usage, etc).
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface AuthedContext {
  user: { id: string };
  supabase: SupabaseClient;
  supabaseAdmin: SupabaseClient;
}

export async function getAuthedContext(req: Request): Promise<AuthedContext | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  return { user: { id: user.id }, supabase, supabaseAdmin };
}
