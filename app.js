let currentUserId = null;
let myProgressWordIds = new Set(); // word_id -> already in this user's deck
let dueQueue = [];
let dueIndex = 0;

// Learner's calendar day, not UTC (matches the server's userToday()).
let userTimezone = 'Asia/Ho_Chi_Minh';

function todayInTz() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: userTimezone }).format(new Date());
}

function addDays(ymd, n) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const views = {
  topics: document.getElementById('view-topics'),
  'topic-detail': document.getElementById('view-topic-detail'),
  review: document.getElementById('view-review'),
};

function showView(name) {
  Object.entries(views).forEach(([key, el]) => {
    el.hidden = key !== name;
  });
}

document.querySelectorAll('.tab-link').forEach((btn) => {
  btn.addEventListener('click', () => {
    window.location.hash = btn.dataset.view;
  });
});

window.addEventListener('hashchange', renderFromHash);

function renderFromHash() {
  const view = window.location.hash.replace('#', '') || 'topics';
  const resolved = views[view] ? view : 'topics';
  showView(resolved);
  if (resolved === 'review') startReview();
}

document.getElementById('signout-btn').addEventListener('click', signOut);
document.getElementById('back-to-topics').addEventListener('click', () => showView('topics'));

// --- Topics ---

async function loadTopics() {
  const { data: topics, error } = await supabaseClient.from('topics').select('*').order('id');
  if (error) {
    document.getElementById('topics-grid').textContent = 'Không tải được chủ đề.';
    return;
  }

  const grid = document.getElementById('topics-grid');
  grid.innerHTML = '';
  topics.forEach((topic) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'topic-card';
    card.innerHTML = `<h3>${topic.name_vi}</h3><p>${topic.name_en}</p>`;
    card.addEventListener('click', () => openTopic(topic));
    grid.appendChild(card);
  });
}

let currentTopicId = null;

async function openTopic(topic) {
  currentTopicId = topic.id;
  document.getElementById('topic-detail-title').textContent = topic.name_vi;
  showView('topic-detail');

  const list = document.getElementById('word-list');
  list.innerHTML = '<li class="word-loading">Đang tải…</li>';

  const { data: rows, error } = await supabaseClient
    .from('word_topics')
    .select('word_id, word_bank(id, lemma, pos, cefr_level)')
    .eq('topic_id', topic.id);

  if (error || !rows) {
    list.innerHTML = '<li class="word-loading">Không tải được danh sách từ.</li>';
    return;
  }

  list.innerHTML = '';
  rows
    .filter((r) => r.word_bank)
    .sort((a, b) => a.word_bank.lemma.localeCompare(b.word_bank.lemma))
    .forEach((r) => {
      const word = r.word_bank;
      const li = document.createElement('li');
      li.className = 'word-row';
      const added = myProgressWordIds.has(word.id);
      li.innerHTML = `
        <div class="word-row-info">
          <span class="word-row-lemma">${word.lemma}</span>
          <span class="word-row-meta">${word.pos || ''} · ${word.cefr_level}</span>
        </div>
        <button type="button" class="btn btn-sm ${added ? 'btn-ghost' : 'btn-primary'}" ${added ? 'disabled' : ''}>
          ${added ? 'Đã thêm' : 'Thêm'}
        </button>`;
      const addBtn = li.querySelector('button');
      if (!added) {
        addBtn.addEventListener('click', () => addWord(word.id, topic.id, addBtn));
      }
      list.appendChild(li);
    });
}

document.getElementById('generate-practice-btn').addEventListener('click', async () => {
  if (!currentTopicId) return;
  const btn = document.getElementById('generate-practice-btn');
  btn.disabled = true;
  btn.textContent = 'Đang tạo…';

  const { data, error } = await supabaseClient.functions.invoke('generate-practice', {
    body: { topic_id: currentTopicId },
  });

  btn.disabled = false;
  btn.textContent = 'Tạo bài luyện tập';

  if (error || !data?.session_id) {
    alert('Không tạo được bài luyện tập. Hãy thử lại.');
    return;
  }
  sessionStorage.setItem(`practice-${data.session_id}`, JSON.stringify(data));
  window.location.href = `practice.html?session_id=${data.session_id}`;
});

async function addWord(wordId, topicId, btn) {
  btn.disabled = true;
  btn.textContent = 'Đang thêm…';
  const { error } = await supabaseClient.from('user_word_progress').insert({
    user_id: currentUserId,
    word_id: wordId,
    source_topic_id: topicId,
  });
  if (error) {
    btn.disabled = false;
    btn.textContent = 'Thêm';
    return;
  }
  myProgressWordIds.add(wordId);
  btn.textContent = 'Đã thêm';
  btn.classList.remove('btn-primary');
  btn.classList.add('btn-ghost');
  refreshDueBadge();
}

// --- Review (SM-2, ARCHITECTURE.md §6) ---

function applySm2(progress, quality) {
  const next = { ...progress };
  if (quality < 3) {
    next.repetitions = 0;
    next.interval_days = 1;
    next.lapses = progress.lapses + 1;
  } else {
    next.repetitions = progress.repetitions + 1;
    if (next.repetitions === 1) next.interval_days = 1;
    else if (next.repetitions === 2) next.interval_days = 6;
    else next.interval_days = Math.round(progress.interval_days * next_ease(progress, quality));
    next.ease_factor = next_ease(progress, quality);
  }
  next.next_review_date = addDays(todayInTz(), next.interval_days);
  return next;
}

function next_ease(progress, quality) {
  const delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  return Math.max(1.3, progress.ease_factor + delta);
}

async function startReview() {
  const today = todayInTz();
  const { data, error } = await supabaseClient
    .from('user_word_progress')
    .select('id, word_id, ease_factor, interval_days, repetitions, lapses, word_bank(lemma, pos, meaning_vi, example_en, example_vi)')
    .lte('next_review_date', today)
    .order('next_review_date', { ascending: true });

  dueQueue = error ? [] : data;
  dueIndex = 0;
  renderReviewStep();
  defineMissing(dueQueue);
}

// Words without a cached Vietnamese meaning get one from define-words
// (generated once, then shared). Fetched in the background, 10 per call.
function defineMissing(queue) {
  const missing = queue.filter((i) => !i.word_bank.meaning_vi);
  for (let k = 0; k < missing.length; k += 10) {
    const chunk = missing.slice(k, k + 10);
    supabaseClient.functions
      .invoke('define-words', { body: { word_ids: chunk.map((i) => i.word_id) } })
      .then(({ data }) => {
        for (const i of chunk) {
          const w = (data?.words || []).find((x) => x.id === i.word_id);
          if (w?.meaning_vi) Object.assign(i.word_bank, w);
          else i.word_bank.meaningFailed = true;
        }
        if (chunk.includes(dueQueue[dueIndex])) showMeaning(dueQueue[dueIndex]);
      });
  }
}

function showMeaning(item) {
  const wb = item.word_bank;
  document.getElementById('review-definition').textContent = wb.meaning_vi
    || (wb.meaningFailed ? 'Chưa tải được nghĩa của từ này. Bạn vẫn có thể tự chấm điểm.' : 'Đang tải…');
  document.getElementById('review-example').textContent =
    wb.example_en ? `${wb.example_en}\n${wb.example_vi || ''}` : '';
}

function renderReviewStep() {
  const empty = document.getElementById('review-empty');
  const wrap = document.getElementById('review-card-wrap');

  if (dueIndex >= dueQueue.length) {
    empty.hidden = false;
    wrap.hidden = true;
    return;
  }
  empty.hidden = true;
  wrap.hidden = false;

  const item = dueQueue[dueIndex];
  document.getElementById('review-progress').textContent = `${dueIndex + 1} / ${dueQueue.length}`;
  document.getElementById('review-word').textContent = item.word_bank.lemma;
  document.getElementById('review-pos').textContent = item.word_bank.pos || '';
  showMeaning(item);

  const card = document.getElementById('review-card');
  const backFace = document.getElementById('review-back');
  card.classList.remove('is-flipped');
  backFace.setAttribute('aria-hidden', 'true');
  document.getElementById('grade-buttons').hidden = true;
}

document.getElementById('review-card').addEventListener('click', () => {
  const card = document.getElementById('review-card');
  const backFace = document.getElementById('review-back');
  const flipped = card.classList.toggle('is-flipped');
  backFace.setAttribute('aria-hidden', String(!flipped));
  if (flipped) document.getElementById('grade-buttons').hidden = false;
});

document.querySelectorAll('.grade-buttons .btn-grade').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const quality = Number(btn.dataset.quality);
    const item = dueQueue[dueIndex];
    const updated = applySm2(item, quality);
    // The review log feeds retention stats and the streak (DB trigger).
    await supabaseClient.from('word_reviews').insert({ user_id: currentUserId, word_id: item.word_id, quality });
    await supabaseClient
      .from('user_word_progress')
      .update({
        ease_factor: updated.ease_factor,
        interval_days: updated.interval_days,
        repetitions: updated.repetitions,
        lapses: updated.lapses,
        next_review_date: updated.next_review_date,
      })
      .eq('id', item.id);
    dueIndex += 1;
    renderReviewStep();
    refreshDueBadge();
  });
});

async function refreshDueBadge() {
  const today = todayInTz();
  const { count } = await supabaseClient
    .from('user_word_progress')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', currentUserId)
    .lte('next_review_date', today);
  const badge = document.getElementById('due-badge');
  if (count) {
    badge.textContent = String(count);
    badge.hidden = false;
  } else {
    badge.hidden = true;
  }
}

// --- Today: streak + daily plan (ARCHITECTURE.md §5 plan-day, §6 streak) ---

async function loadToday() {
  const today = todayInTz();

  // plan-day is idempotent per day; a failure (e.g. LLM down) just leaves the plan chip out.
  const [{ data: streak }, planRes] = await Promise.all([
    supabaseClient.from('user_streaks').select('current_streak, last_active_date').maybeSingle(),
    supabaseClient.functions.invoke('plan-day'),
  ]);

  const alive = streak && streak.last_active_date >= addDays(today, -1);
  const days = alive ? streak.current_streak : 0;
  document.getElementById('streak-chip').textContent =
    days > 0 ? `🔥 ${days} ngày liên tiếp` : 'Làm một bài để bắt đầu chuỗi ngày học';

  const plan = planRes.data?.plan;
  const planChip = document.getElementById('plan-chip');
  if (plan) {
    let text = `Hôm nay: ${plan.new_word_count} từ mới · ${plan.target_cefr}`;
    if (plan.grammar_focus_unit_id) {
      const { data: unit } = await supabaseClient
        .from('grammar_units').select('title_vi').eq('id', plan.grammar_focus_unit_id).single();
      if (unit) text += ` · Ngữ pháp: ${unit.title_vi}`;
    }
    planChip.textContent = text;
  }
  document.getElementById('today-strip').hidden = false;
}

// --- Init ---

(async () => {
  const session = await requireSession();
  if (!session) return;
  currentUserId = session.user.id;

  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('display_name, timezone')
    .eq('id', currentUserId)
    .single();
  document.getElementById('user-greeting').textContent = profile ? profile.display_name : '';
  if (profile?.timezone) userTimezone = profile.timezone;

  const { data: progress } = await supabaseClient
    .from('user_word_progress')
    .select('word_id')
    .eq('user_id', currentUserId);
  myProgressWordIds = new Set((progress || []).map((p) => p.word_id));

  await loadTopics();
  await refreshDueBadge();
  renderFromHash();
  loadToday();
})();
