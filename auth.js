// Shared Supabase client + auth guard, used by every authenticated page.
const supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

/** Redirects to login.html if there is no active session; resolves with the session otherwise. */
async function requireSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
}

async function signOut() {
  await supabaseClient.auth.signOut();
  window.location.href = 'login.html';
}

// Mobile nav toggle (same markup and CSS as the landing page's).
const navToggle = document.getElementById('nav-toggle');
const navLinks = document.getElementById('nav-links');
if (navToggle && navLinks) {
  const setOpen = (open) => {
    navLinks.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
  };
  navToggle.addEventListener('click', () => setOpen(!navLinks.classList.contains('is-open')));
  navLinks.querySelectorAll('.tab-link').forEach((el) => el.addEventListener('click', () => setOpen(false)));
}
