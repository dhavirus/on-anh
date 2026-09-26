let items = [];
let index = 0;
let correctCount = 0;

document.getElementById('signout-btn').addEventListener('click', signOut);

function currentItem() {
  return items[index];
}

function renderItem() {
  if (index >= items.length) {
    document.getElementById('exercise-wrap').hidden = true;
    const done = document.getElementById('practice-done');
    done.hidden = false;
    done.querySelector('#practice-done-summary').textContent =
      `Bạn đã làm ${items.length} câu, đúng ${correctCount} câu.`;
    return;
  }

  const item = currentItem();
  document.getElementById('exercise-progress').textContent = `${index + 1} / ${items.length}`;
  document.getElementById('exercise-prompt').textContent = item.prompt;
  document.getElementById('exercise-input').value = '';
  document.getElementById('exercise-feedback').hidden = true;
  document.getElementById('exercise-form').hidden = false;
}

document.getElementById('exercise-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const item = currentItem();
  const submitBtn = document.getElementById('exercise-submit');
  const submitted = document.getElementById('exercise-input').value;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Đang chấm…';

  const { data, error } = await supabaseClient.functions.invoke('grade-response', {
    body: { item_id: item.id, submitted_answer: submitted },
  });

  submitBtn.disabled = false;
  submitBtn.textContent = 'Kiểm tra';

  if (error || !data) {
    alert('Không chấm được câu này. Hãy thử lại.');
    return;
  }

  if (data.is_correct) correctCount += 1;

  document.getElementById('exercise-form').hidden = true;
  const feedback = document.getElementById('exercise-feedback');
  feedback.hidden = false;
  const verdict = feedback.querySelector('#feedback-verdict');
  verdict.textContent = data.is_correct ? 'Chính xác!' : `Chưa đúng. Đáp án: ${data.correct_answer}`;
  verdict.className = data.is_correct ? 'feedback-correct' : 'feedback-incorrect';
  feedback.querySelector('#feedback-explanation').textContent = data.explanation_vi || '';
});

document.getElementById('exercise-next').addEventListener('click', () => {
  index += 1;
  renderItem();
});

(async () => {
  const session = await requireSession();
  if (!session) return;

  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('display_name')
    .eq('id', session.user.id)
    .single();
  document.getElementById('user-greeting').textContent = profile ? profile.display_name : '';

  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session_id');
  const stored = sessionId ? sessionStorage.getItem(`practice-${sessionId}`) : null;

  if (!stored) {
    document.getElementById('practice-missing').hidden = false;
    return;
  }

  const parsed = JSON.parse(stored);
  items = parsed.items || [];
  document.getElementById('exercise-wrap').hidden = false;
  renderItem();
})();
