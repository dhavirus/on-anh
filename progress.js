// Progress page (ARCHITECTURE.md M6). Learners see their own data; the
// owner gets a learner picker. RLS (user_id = auth.uid() or is_owner())
// decides what each query can return, so the same code serves both.
let charts = null; // last rendered data, re-drawn on resize

document.getElementById('signout-btn').addEventListener('click', signOut);

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function localDate(ts, tz) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(ts));
}

function addDays(ymd, n) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const ddmm = (ymd) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`;
const pct = (c, n) => (n ? `${Math.round((100 * c) / n)}%` : '–');

// Bar with only its data end rounded (4px), anchored flat on the baseline.
function barPath(x, y, w, h, horizontal) {
  const r = Math.min(4, horizontal ? w : h, (horizontal ? h : w) / 2);
  if (horizontal) {
    return `M${x},${y}h${w - r}a${r},${r} 0 0 1 ${r},${r}v${h - 2 * r}a${r},${r} 0 0 1 ${-r},${r}h${-(w - r)}z`;
  }
  return `M${x},${y + h}v${-(h - r)}a${r},${r} 0 0 1 ${r},${-r}h${w - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${h - r}z`;
}

function renderDaily(el, days) {
  const W = el.clientWidth || 600;
  const H = 180;
  const pad = { l: 28, r: 4, t: 10, b: 22 };
  const max = Math.max(1, ...days.map((d) => d.total));
  const slot = (W - pad.l - pad.r) / days.length;
  const bw = Math.max(2, slot - 2); // 2px surface gap between bars
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / max);

  let s = `<line class="axis" x1="${pad.l}" x2="${W - pad.r}" y1="${y(0)}" y2="${y(0)}"/>`;
  s += `<text class="tick" x="${pad.l - 6}" y="${y(max) + 4}" text-anchor="end">${max}</text>`;
  s += `<text class="tick" x="${pad.l - 6}" y="${y(0)}" text-anchor="end">0</text>`;
  days.forEach((d, i) => {
    const x = pad.l + i * slot;
    const tip = `${ddmm(d.date)}: ${d.total} lượt, đúng ${d.correct} (${pct(d.correct, d.total)})`;
    s += `<g class="hit"><title>${esc(tip)}</title><rect x="${x}" y="${pad.t}" width="${slot}" height="${H - pad.t - pad.b}" fill="transparent"/>`;
    if (d.total) s += `<path class="bar" d="${barPath(x + 1, y(d.total), bw, y(0) - y(d.total), false)}"/>`;
    s += '</g>';
  });
  [0, Math.floor(days.length / 2), days.length - 1].forEach((i) => {
    s += `<text class="tick" x="${pad.l + i * slot + slot / 2}" y="${H - 6}" text-anchor="middle">${ddmm(days[i].date)}</text>`;
  });
  el.innerHTML = `<svg width="${W}" height="${H}" role="img" aria-label="Biểu đồ số lượt luyện tập mỗi ngày">${s}</svg>`;
}

function renderUnits(el, units) {
  if (!units.length) {
    el.innerHTML = '<p class="chart-empty">Chưa làm bài ngữ pháp nào.</p>';
    return;
  }
  const W = el.clientWidth || 600;
  const row = 30;
  const labelW = Math.min(200, W * 0.42);
  const valueW = 44;
  const H = units.length * row;
  const barMax = W - labelW - valueW;
  let s = '';
  units.forEach((u, i) => {
    const y = i * row;
    const w = Math.max(u.accuracy > 0 ? 2 : 0, barMax * u.accuracy);
    const tip = `${u.title}: đúng ${u.correct}/${u.attempts}`;
    s += `<g class="hit"><title>${esc(tip)}</title><rect x="0" y="${y}" width="${W}" height="${row}" fill="transparent"/>`;
    s += `<text class="label" x="${labelW - 8}" y="${y + row / 2 + 4}" text-anchor="end">${esc(u.title)}</text>`;
    if (w) s += `<path class="bar" d="${barPath(labelW, y + 7, w, row - 14, true)}"/>`;
    s += `<text class="value" x="${labelW + w + 6}" y="${y + row / 2 + 4}">${pct(u.correct, u.attempts)}</text></g>`;
  });
  el.innerHTML = `<svg width="${W}" height="${H}" role="img" aria-label="Biểu đồ độ chính xác theo bài ngữ pháp">${s}</svg>`;
}

function renderTable(el, head, rows) {
  el.innerHTML = `<thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>` +
    `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>`;
}

function renderCharts() {
  if (!charts) return;
  renderDaily(document.getElementById('chart-daily'), charts.days);
  renderUnits(document.getElementById('chart-units'), charts.units);
}
window.addEventListener('resize', renderCharts);

async function loadLearner(userId, tz) {
  const today = localDate(Date.now(), tz);
  const since = addDays(today, -29);
  const sinceTs = new Date(Date.now() - 31 * 864e5).toISOString(); // over-fetch, trimmed by local date below

  const [words, streak, responses, attempts, reviews, mastery, insights] = await Promise.all([
    supabaseClient.from('user_word_progress').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabaseClient.from('user_streaks').select('current_streak, last_active_date').eq('user_id', userId).maybeSingle(),
    supabaseClient.from('practice_responses').select('is_correct, responded_at').eq('user_id', userId).gte('responded_at', sinceTs),
    supabaseClient.from('exercise_attempts').select('is_correct, attempted_at').eq('user_id', userId).gte('attempted_at', sinceTs),
    supabaseClient.from('word_reviews').select('quality, reviewed_at').eq('user_id', userId).gte('reviewed_at', sinceTs),
    supabaseClient.from('unit_mastery').select('attempts, correct, grammar_units(title_vi, order_index)').eq('user_id', userId).gt('attempts', 0),
    supabaseClient.from('progress_insights').select('period_start, period_end, summary_vi').eq('user_id', userId).order('period_start', { ascending: false }).limit(8),
  ]);

  const byDay = new Map();
  for (let i = 0; i < 30; i++) byDay.set(addDays(since, i), { total: 0, correct: 0 });
  const events = [
    ...(responses.data || []).map((r) => [r.responded_at, r.is_correct]),
    ...(attempts.data || []).map((a) => [a.attempted_at, a.is_correct]),
    ...(reviews.data || []).map((r) => [r.reviewed_at, r.quality >= 3]),
  ];
  for (const [ts, ok] of events) {
    const d = byDay.get(localDate(ts, tz));
    if (d) { d.total++; if (ok) d.correct++; }
  }
  const days = [...byDay].map(([date, v]) => ({ date, ...v }));
  const week = days.slice(-7).reduce((a, d) => ({ total: a.total + d.total, correct: a.correct + d.correct }), { total: 0, correct: 0 });

  const s = streak.data;
  const alive = s && s.last_active_date >= addDays(today, -1);
  document.getElementById('stat-words').textContent = words.count ?? 0;
  document.getElementById('stat-streak').textContent = alive ? s.current_streak : 0;
  document.getElementById('stat-accuracy').textContent = pct(week.correct, week.total);

  const units = (mastery.data || [])
    .filter((m) => m.grammar_units)
    .sort((a, b) => a.grammar_units.order_index - b.grammar_units.order_index)
    .map((m) => ({ title: m.grammar_units.title_vi, attempts: m.attempts, correct: m.correct, accuracy: m.correct / m.attempts }));

  charts = { days, units };
  renderCharts();
  renderTable(document.getElementById('table-daily'), ['Ngày', 'Số lượt', 'Đúng'],
    days.map((d) => [ddmm(d.date), d.total, d.correct]));
  renderTable(document.getElementById('table-units'), ['Bài', 'Số lần làm', 'Đúng', 'Tỉ lệ'],
    units.map((u) => [u.title, u.attempts, u.correct, pct(u.correct, u.attempts)]));

  const list = document.getElementById('insights-list');
  list.innerHTML = '';
  if (!insights.data?.length) {
    list.innerHTML = '<li class="chart-empty">Chưa có nhận xét. Nhận xét được tạo mỗi sáng thứ Hai.</li>';
  }
  for (const i of insights.data || []) {
    const li = document.createElement('li');
    li.className = 'insight';
    const h = document.createElement('p');
    h.className = 'insight-period';
    h.textContent = `${ddmm(i.period_start)} – ${ddmm(i.period_end)}`;
    const p = document.createElement('p');
    p.textContent = i.summary_vi;
    li.append(h, p);
    list.appendChild(li);
  }
}

(async () => {
  const session = await requireSession();
  if (!session) return;
  const me = session.user.id;

  const { data: profile } = await supabaseClient
    .from('profiles').select('display_name, role, timezone').eq('id', me).single();
  document.getElementById('user-greeting').textContent = profile?.display_name || '';

  if (profile?.role === 'owner') {
    const { data: people } = await supabaseClient.from('profiles').select('id, display_name, timezone').order('display_name');
    const select = document.getElementById('learner-select');
    for (const p of people || []) {
      const opt = new Option(p.display_name, p.id, false, p.id === me);
      opt.dataset.tz = p.timezone;
      select.add(opt);
    }
    select.addEventListener('change', () => loadLearner(select.value, select.selectedOptions[0].dataset.tz));
    document.getElementById('learner-picker').hidden = false;
  }

  loadLearner(me, profile?.timezone || 'Asia/Ho_Chi_Minh');
})();
