// Supabase connection info. The anon key is safe to ship to the browser
// by design (RLS is what actually protects data) — see ARCHITECTURE.md §1.
// These are the LOCAL DEV stack's values. Swap both before deploying:
// run `supabase status` (or check your project's API settings) for the
// real URL and anon key, and replace them here.
window.SUPABASE_URL = 'http://127.0.0.1:54321';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
