// Supabase connection info. The anon key is safe to ship to the browser
// by design (RLS is what actually protects data) — see ARCHITECTURE.md §1.
// Picked by hostname so the same files work locally and on GitHub Pages.
const IS_LOCAL = ['localhost', '127.0.0.1'].includes(window.location.hostname);

if (IS_LOCAL) {
  // Local dev stack (`npx supabase start`); the well-known demo anon key.
  window.SUPABASE_URL = 'http://127.0.0.1:54321';
  window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
} else {
  // Hosted project (dao-english-learning-page). Anon key only, never the service-role key.
  window.SUPABASE_URL = 'https://xzljiqqouehwlstdrdeu.supabase.co';
  window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bGppcXFvdWVod2xzdGRyZGV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNTEyNzQsImV4cCI6MjEwNTcyNzI3NH0.mL03WwN2463oCvyHCFeDKvBxVUp0qvHigNLuOBqW2LE';
}
