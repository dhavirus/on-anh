import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

/** Today's date (YYYY-MM-DD) in an IANA timezone. en-CA formats as ISO. */
export function todayIn(tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
}

/** Calendar-day arithmetic on a YYYY-MM-DD string (no DST pitfalls). */
export function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export async function userToday(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data } = await supabase.from("profiles").select("timezone").eq("id", userId).single();
  return todayIn(data?.timezone ?? "Asia/Ho_Chi_Minh");
}
