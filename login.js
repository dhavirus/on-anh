(async () => {
  // Already signed in? skip straight to the app.
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    window.location.href = 'app.html';
    return;
  }

  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('auth-error');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang đăng nhập…';

    const email = form.email.value.trim();
    const password = form.password.value;

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
      errorEl.textContent = 'Email hoặc mật khẩu không đúng.';
      errorEl.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Đăng nhập';
      return;
    }

    window.location.href = 'app.html';
  });
})();
