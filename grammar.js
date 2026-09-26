let currentUserId = null;
let myMastery = new Map(); // unit_id -> { attempts, correct, rolling_accuracy, unlocked }
let currentUnit = null;
let currentExercises = [];
let exerciseIndex = 0;

const views = {
  units: document.getElementById('view-units'),
  'unit-detail': document.getElementById('view-unit-detail'),
};

function showView(name) {
  Object.entries(views).forEach(([key, el]) => {
    el.hidden = key !== name;
  });
}

document.getElementById('back-to-units').addEventListener('click', () => showView('units'));
document.getElementById('signout-btn').addEventListener('click', signOut);

// --- Units list ---

async function loadUnits() {
  const { data: units, error } = await supabaseClient
    .from('grammar_units')
    .select('*')
    .order('order_index');

  const list = document.getElementById('units-list');
  if (error || !units) {
    list.innerHTML = '<li class="word-loading">Không tải được danh sách bài học.</li>';
    return;
  }

  list.innerHTML = '';
  units.forEach((unit) => {
    const mastery = myMastery.get(unit.id);
    const statusLabel = !mastery
      ? 'Chưa luyện'
      : mastery.unlocked
      ? 'Đã mở khóa'
      : `${mastery.correct}/${mastery.attempts} đúng`;
    const statusClass = !mastery ? 'locked' : mastery.unlocked ? 'unlocked' : 'progress';

    const li = document.createElement('li');
    li.className = 'unit-row';
    li.innerHTML = `
      <button type="button" class="unit-row-btn">
        <span class="unit-title">${unit.order_index}. ${unit.title_vi}</span>
        <span class="unit-row-meta">${unit.title_en} · ${unit.cefr_level}</span>
      </button>
      <span class="unit-status unit-status--${statusClass}"><i class="status-dot" aria-hidden="true"></i>${statusLabel}</span>
    `;
    li.querySelector('.unit-row-btn').addEventListener('click', () => openUnit(unit));
    list.appendChild(li);
  });
}

async function loadMastery() {
  const { data } = await supabaseClient
    .from('unit_mastery')
    .select('unit_id, attempts, correct, rolling_accuracy, unlocked')
    .eq('user_id', currentUserId);
  myMastery = new Map((data || []).map((m) => [m.unit_id, m]));
}

// --- Unit detail + exercises ---

async function openUnit(unit) {
  currentUnit = unit;
  document.getElementById('unit-title').textContent = `${unit.order_index}. ${unit.title_vi}`;
  document.getElementById('unit-meta').textContent = `${unit.title_en} · ${unit.topic_area} · ${unit.cefr_level}`;
  document.getElementById('unit-explanation').innerHTML = marked.parse(unit.explanation_md);
  document.getElementById('unit-done').hidden = true;
  document.getElementById('exercise-wrap').hidden = false;
  showView('unit-detail');

  const { data: exercises } = await supabaseClient
    .from('grammar_exercises')
    .select('*')
    .eq('unit_id', unit.id)
    .order('position');
  currentExercises = exercises || [];
  exerciseIndex = 0;
  renderExercise();
}

function normalize(str) {
  return String(str || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.!?]+$/, '');
}

function renderExercise() {
  if (exerciseIndex >= currentExercises.length) {
    document.getElementById('exercise-wrap').hidden = true;
    const done = document.getElementById('unit-done');
    done.hidden = false;
    const mastery = myMastery.get(currentUnit.id);
    done.querySelector('#unit-done-summary').textContent = mastery
      ? `Bạn đã làm ${mastery.attempts} câu, đúng ${mastery.correct} câu (${Math.round(mastery.rolling_accuracy * 100)}%).${mastery.unlocked ? ' Bài học đã được mở khóa.' : ''}`
      : 'Hoàn thành bài học này.';
    return;
  }

  const ex = currentExercises[exerciseIndex];
  document.getElementById('exercise-progress').textContent = `${exerciseIndex + 1} / ${currentExercises.length}`;
  document.getElementById('exercise-prompt').textContent = ex.prompt;
  document.getElementById('exercise-feedback').hidden = true;

  const inputArea = document.getElementById('exercise-input-area');
  inputArea.innerHTML = '';

  if (ex.exercise_type === 'multiple_choice' && Array.isArray(ex.choices)) {
    ex.choices.forEach((choice, i) => {
      const id = `choice-${i}`;
      const wrap = document.createElement('label');
      wrap.className = 'choice-option';
      wrap.innerHTML = `<input type="radio" name="answer" id="${id}" value="${choice.replace(/"/g, '&quot;')}"> <span>${choice}</span>`;
      inputArea.appendChild(wrap);
    });
  } else {
    const input = document.createElement('input');
    input.type = 'text';
    input.name = 'answer';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.placeholder =
      ex.exercise_type === 'error_spotting' ? 'Gõ từ sai trong câu…' : 'Gõ câu trả lời…';
    inputArea.appendChild(input);
  }

  document.getElementById('exercise-form').hidden = false;
  document.getElementById('exercise-submit').disabled = false;
}

document.getElementById('exercise-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const ex = currentExercises[exerciseIndex];
  const form = e.target;
  const selected = form.querySelector('input[name="answer"]:checked');
  const typed = form.querySelector('input[type="text"]');
  const submitted = selected ? selected.value : typed ? typed.value : '';

  const isCorrect = normalize(submitted) === normalize(ex.correct_answer);

  document.getElementById('exercise-form').hidden = true;
  const feedback = document.getElementById('exercise-feedback');
  feedback.hidden = false;
  feedback.querySelector('#feedback-verdict').textContent = isCorrect
    ? 'Chính xác!'
    : `Chưa đúng. Đáp án: ${ex.correct_answer}`;
  feedback.querySelector('#feedback-verdict').className = isCorrect ? 'feedback-correct' : 'feedback-incorrect';
  feedback.querySelector('#feedback-explanation').textContent = ex.explanation_vi;

  await supabaseClient.from('exercise_attempts').insert({
    user_id: currentUserId,
    exercise_id: ex.id,
    submitted_answer: submitted,
    is_correct: isCorrect,
  });
  await recordAttempt(currentUnit.id, isCorrect);
});

document.getElementById('exercise-next').addEventListener('click', () => {
  exerciseIndex += 1;
  renderExercise();
});

// ARCHITECTURE.md §6 — unit unlocks at >=80% rolling accuracy over >=5 attempts.
async function recordAttempt(unitId, isCorrect) {
  const existing = myMastery.get(unitId) || { attempts: 0, correct: 0 };
  const attempts = existing.attempts + 1;
  const correct = existing.correct + (isCorrect ? 1 : 0);
  const rolling_accuracy = correct / attempts;
  const unlocked = attempts >= 5 && rolling_accuracy >= 0.8;

  const updated = { attempts, correct, rolling_accuracy, unlocked };
  myMastery.set(unitId, updated);

  await supabaseClient.from('unit_mastery').upsert(
    {
      user_id: currentUserId,
      unit_id: unitId,
      ...updated,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,unit_id' }
  );
}

// --- Init ---

(async () => {
  const session = await requireSession();
  if (!session) return;
  currentUserId = session.user.id;

  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('display_name')
    .eq('id', currentUserId)
    .single();
  document.getElementById('user-greeting').textContent = profile ? profile.display_name : '';

  await loadMastery();
  await loadUnits();
})();
