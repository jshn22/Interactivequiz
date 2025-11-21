// TOPICS list removed — topics are now derived from `TEMPLATES` or default to ['javascript']
let questions = [];
const loadFromOpenTDB = async (desired = 10, category = null, difficulty = null, type = 'multiple', topic = null) => {
  const amount = Math.max(1, Math.min(50, Number(desired) || 10));
  const params = new URLSearchParams({ amount: String(amount), encode: 'url3986' });
  if (category) params.set('category', String(category));
  if (difficulty) params.set('difficulty', String(difficulty));
  if (type) params.set('type', String(type));
  const url = `https://opentdb.com/api.php?${params.toString()}`;
  console.debug('[loadFromOpenTDB] fetching', url);
  try {
    const res = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } });
    console.debug('[loadFromOpenTDB] status', res.status);
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.warn('[loadFromOpenTDB] fetch failed', res.status, txt.substring ? txt.substring(0, 200) : txt);
      return [];
    }
    const payload = await res.json();
    if (!payload || !Array.isArray(payload.results) || payload.results.length === 0) return [];
  const mapped = payload.results.map((it, idx) => {
      const safe = (s) => { try { return decodeURIComponent(String(s)); } catch (e) { return String(s); } };
      const q = safe(it.question || `Question ${idx+1}`);
      const correct = safe(it.correct_answer || '');
      const incorrect = (it.incorrect_answers || []).map(safe);
      const options = shuffle([correct].concat(incorrect));
      const answer = options.indexOf(correct);
  const topic = (it.category || 'OpenTDB').toLowerCase();
      const difficultyVal = it.difficulty || 'medium';
      return { id: idx + 1, q, options, answer: answer >= 0 ? answer : 0, topic, difficulty: difficultyVal };
    }).filter(x => Array.isArray(x.options) && x.options.length >= 2);

    let final = mapped;
    if (topic && String(topic).toLowerCase() === 'javascript') {
      const jsRe = /javascript|\bjs\b|node(?:\.js)?|react|vue|angular|programming|computer/i;
      const filtered = mapped.filter(it => jsRe.test((it.q || '') + ' ' + (it.topic || '')));
      if (filtered && filtered.length) {
        final = filtered;
        console.debug('[loadFromOpenTDB] filtered to JS-related', final.length);
      } else {
        console.debug('[loadFromOpenTDB] no JS-specific items found; using general results');
      }
    }
    console.debug('[loadFromOpenTDB] mapped', mapped.length);
    return final.slice(0, amount);
  } catch (err) {
    console.warn('[loadFromOpenTDB] error', err && err.message);
    return [];
  }
};

const $ = (sel) => document.querySelector(sel);
const $all = (sel) => document.querySelectorAll(sel);

try { console.debug('[script] script.js loaded'); } catch (e) { /* ignore */ }

let shuffledQuestions = [];
let currentIdx = 0;
let score = 0;
let timerInterval = null;
const QUESTION_TIME = 20;
let timeLeft = QUESTION_TIME;
const AUTO_ADVANCE_DELAY = 1400;

const questionEl = $('#question');
const optionsEl = $('#options');
const feedbackEl = $('#feedback');
const nextBtn = $('#nextBtn');
const restartBtn = $('#restartBtn');
const playAgainBtn = $('#playAgain');
const resultEl = $('#result');
const cardEl = $('#card');
const questionCountEl = $('#questionCount');
const progressBarEl = $('#progressBar');
const timerEl = $('#timer');
const topicSelect = $('#topicSelect');
const difficultySelect = $('#difficultySelect');
const apiLimitSelect = $('#apiLimitSelect');
const highscoreList = $('#highscoreList');
const highscoresEl = $('#highscores');
const landingEl = $('#landing');
const quizEl = $('#quiz');
const topicsContainer = $('#topics');
const subtopicsContainer = $('#subtopics');
const mobileMenuBtn = $('#mobileMenuBtn');
const topNav = $('#topNav');

const toastContainer = $('#toastContainer');
const showToast = (msg, type = 'info', timeout = 4200) => {
  try {
    if (!toastContainer) {
      alert(msg);
      return;
    }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.role = 'status';
  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Info';
  const msgSpan = document.createElement('span');
  msgSpan.className = 'msg';
  msgSpan.textContent = String(msg);
  const closeBtn = document.createElement('button');
  closeBtn.className = 'close';
  closeBtn.setAttribute('aria-label', 'Dismiss');
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', () => { t.remove(); });
  t.appendChild(label);
  t.appendChild(msgSpan);
  t.appendChild(closeBtn);
  toastContainer.appendChild(t);

    const id = setTimeout(() => { t.remove(); }, timeout);
    t.addEventListener('mouseover', () => clearTimeout(id));
  } catch (e) {
    try { alert(msg); } catch (_) { /* ignore */ }
  }
};

const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

if (mobileMenuBtn && topNav) {
  mobileMenuBtn.addEventListener('click', () => {
    const expanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
    mobileMenuBtn.setAttribute('aria-expanded', String(!expanded));
    topNav.classList.toggle('show');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      topNav.classList.remove('show');
      mobileMenuBtn.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('click', (e) => {
    if (!topNav.classList.contains('show')) return;
    if (topNav.contains(e.target) || mobileMenuBtn.contains(e.target)) return;
    topNav.classList.remove('show');
    mobileMenuBtn.setAttribute('aria-expanded', 'false');
  });
}

const init = () => {
  const topic = topicSelect ? topicSelect.value : 'all';
  const difficulty = difficultySelect ? difficultySelect.value : 'all';
  const pool = questions.filter(q => (topic === 'all' || q.topic === topic) && (difficulty === 'all' || q.difficulty === difficulty));
  shuffledQuestions = shuffle(pool).map(q => {
    const options = shuffle(q.options.slice());
    return { ...q, options, correctText: q.options[q.answer] };
  });
  if (shuffledQuestions.length === 0) {
    shuffledQuestions = shuffle(questions).map(q => ({ ...q, options: shuffle(q.options.slice()), correctText: q.options[q.answer] }));
  }
  currentIdx = 0;
  score = 0;
  updateProgress();
  showQuestion();
};

const showLanding = () => {
  if (landingEl) landingEl.style.display = '';
  if (quizEl) quizEl.hidden = true;
};

const startForTopic = (topic) => {
  console.log('[startForTopic] topic:', topic);
  if (!topicSelect) {
    console.warn('[startForTopic] topicSelect not found');
    showToast('topicSelect element missing; quiz may not start correctly', 'error');
  } else {
    topicSelect.value = topic;
  }
  if (landingEl) landingEl.style.display = 'none';
  if (quizEl) quizEl.hidden = false;
  init();
  if (!shuffledQuestions || shuffledQuestions.length === 0) {
    console.warn('[startForTopic] no questions generated for', topic);
    showToast(`No questions available for ${topic}. Try 'All topics' or import a JSON file.`, 'error');
  }
};

const renderTimer = () => {
  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const ss = String(timeLeft % 60).padStart(2, '0');
  timerEl.textContent = `${mm}:${ss}`;
};

const onTimeUp = () => {
  Array.from(optionsEl.children).forEach(li => li.classList.add('disabled'));
  revealCorrect();
  nextBtn.disabled = false;
};

const showQuestion = () => {
  const qObj = shuffledQuestions[currentIdx];
  questionEl.textContent = qObj.q;
  questionCountEl.textContent = `Question ${currentIdx + 1} of ${shuffledQuestions.length}`;

  cardEl.classList.add('fade-out');
  setTimeout(() => {
    cardEl.classList.remove('fade-out');
    cardEl.classList.add('fade-in');
  }, 10);

  optionsEl.innerHTML = '';
  qObj.options.forEach((opt, i) => {
    const li = document.createElement('li');
    li.className = 'option';
    li.tabIndex = 0;
    li.dataset.index = i;
    li.textContent = opt;
    li.setAttribute('role', 'button');
    li.setAttribute('aria-pressed', 'false');
    li.addEventListener('click', onSelect);
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') onSelect.call(li, e);
    });
    optionsEl.appendChild(li);
  });

  nextBtn.disabled = true;
  updateProgress();
  startTimer();
  setTimeout(() => {
    const first = optionsEl.querySelector('.option');
    if (first) first.focus();
  }, 40);
};

const startTimer = (secs = QUESTION_TIME) => {
  clearInterval(timerInterval);
  timeLeft = secs;
  if (timerEl) timerEl.textContent = `${String(Math.floor(timeLeft/60)).padStart(2,'0')}:${String(timeLeft%60).padStart(2,'0')}`;
  timerInterval = setInterval(() => {
    timeLeft -= 1;
    if (timerEl) timerEl.textContent = `${String(Math.floor(timeLeft/60)).padStart(2,'0')}:${String(timeLeft%60).padStart(2,'0')}`;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      try { onTimeUp(); } catch (e) { /* ignore */ }
    }
  }, 1000);
};

const onSelect = (e) => {
  const li = e.currentTarget || this;
  if (li.classList.contains('disabled')) return;
  Array.from(optionsEl.children).forEach(x => x.classList.add('disabled'));
  Array.from(optionsEl.children).forEach(x => x.classList.remove('selected'));
  li.classList.add('selected');
  li.setAttribute('aria-pressed', 'true');
  clearInterval(timerInterval);
  const qObj = shuffledQuestions[currentIdx];
  const selectedText = li.textContent;
  const isCorrect = selectedText === qObj.correctText;
  if (isCorrect) {
    feedbackEl.textContent = 'Correct — well done!';
    feedbackEl.classList.remove('wrong');
    feedbackEl.classList.add('correct');
    playSound('success');
    score++;
  } else {
    feedbackEl.textContent = 'Incorrect — the correct answer will be shown.';
    feedbackEl.classList.remove('correct');
    feedbackEl.classList.add('wrong');
    playSound('wrong');
  }
  revealCorrect();
  setTimeout(() => {
    currentIdx++;
    if (currentIdx >= shuffledQuestions.length) {
      showResult();
    } else {
      feedbackEl.textContent = '';
      feedbackEl.classList.remove('correct','wrong');
      showQuestion();
    }
  }, AUTO_ADVANCE_DELAY);
};

const revealCorrect = () => {
  const qObj = shuffledQuestions[currentIdx];
  const correctText = qObj.correctText;

  Array.from(optionsEl.children).forEach(li => {
    const txt = li.textContent;
    if (txt === correctText) {
      li.classList.add('correct');
    } else if (li.classList.contains('selected')) {
      li.classList.add('wrong');
    }
    li.classList.add('disabled');
  });
};

const nextQuestion = () => {
  clearInterval(timerInterval);
  const selected = Array.from(optionsEl.children).find(li => li.classList.contains('selected'));
  const qObj = shuffledQuestions[currentIdx];
  if (selected) {
    const selectedText = selected.textContent;
    const isCorrect = selectedText === qObj.correctText;
    if (isCorrect) score++;
  }

  revealCorrect();

  setTimeout(() => {
    currentIdx++;
    if (currentIdx >= shuffledQuestions.length) {
      showResult();
    } else {
      feedbackEl.textContent = '';
      feedbackEl.classList.remove('correct','wrong');
      showQuestion();
    }
  }, AUTO_ADVANCE_DELAY);
};

const updateProgress = () => {
  const pct = Math.round(((currentIdx) / shuffledQuestions.length) * 100);
  progressBarEl.style.width = `${pct}%`;
};

const showResult = () => {
  cardEl.style.display = 'none';
  resultEl.hidden = false;
  const resultTitle = $('#resultTitle');
  const resultText = $('#resultText');
  resultTitle.textContent = `You scored ${score} / ${shuffledQuestions.length}`;
  resultText.textContent = `Topics covered: ${[...new Set(shuffledQuestions.map(q=>q.topic))].join(', ')}`;
  progressBarEl.style.width = `100%`;
  const defaultName = localStorage.getItem(lastNameKey) || '';
  setTimeout(() => {
    let name = defaultName;
    try {
      const p = prompt('Enter your name to save your score (Cancel to save as Anonymous):', defaultName);
      if (p === null) name = 'Anonymous';
      else name = p.trim() || 'Anonymous';
    } catch (e) {
      name = defaultName || 'Anonymous';
    }
    localStorage.setItem(lastNameKey, name);
    saveHighscore({name, score, total: shuffledQuestions.length, date: Date.now(), topics: [...new Set(shuffledQuestions.map(q=>q.topic))]});
    renderHighscores();
    if (playerNameInput) playerNameInput.value = name;
    if (saveScoreBtn) saveScoreBtn.disabled = true;
  }, 120);
};

const restart = () => {
  resultEl.hidden = true;
  cardEl.style.display = '';
  clearInterval(timerInterval);
  shuffledQuestions = [];
  currentIdx = 0;
  score = 0;
  if (topicSelect) topicSelect.value = 'all';
  if (difficultySelect) difficultySelect.value = 'all';
  populateFilters();
  updateProgress();
  showLanding();
};

nextBtn.addEventListener('click', () => {
  nextBtn.disabled = true;
  nextQuestion();
});
restartBtn.addEventListener('click', restart);
playAgainBtn.addEventListener('click', restart);

window._quiz = { questions, init };

const HIGHSCORE_KEY = 'js_quiz_highscores_v1';
const maxScores = 5;
const readHighscores = () => {
  try {
    const raw = localStorage.getItem(HIGHSCORE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const saveHighscore = (entry) => {
  const list = readHighscores();
  if (!entry.name) entry.name = 'Anonymous';
  list.push(entry);
  list.sort((a,b) => b.score - a.score || b.date - a.date);
  const trimmed = list.slice(0, maxScores);
  localStorage.setItem(HIGHSCORE_KEY, JSON.stringify(trimmed));
};

const renderHighscores = () => {
  if (!highscoreList) return;
  const list = readHighscores();
  highscoreList.innerHTML = '';
  if (list.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No scores yet. Play to set a high score!';
    highscoreList.appendChild(li);
    return;
  }
  list.forEach(item => {
    const li = document.createElement('li');
    const d = new Date(item.date);
    li.textContent = `${item.name || 'Anonymous'} — ${item.score} / ${item.total} — ${d.toLocaleString()}`;
    highscoreList.appendChild(li);
  });
};

let audioCtx = null;
const ensureAudio = () => { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); };
const playTone = (freq, duration = 0.12, type = 'sine') => {
  try {
    ensureAudio();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq;
    o.connect(g); g.connect(audioCtx.destination);
    g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + 0.01);
    o.start();
    setTimeout(() => { g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.01); o.stop(); }, duration*1000);
  } catch (e) { /* audio blocked or unsupported */ }
};
const playSound = (name) => {
  if (name === 'success') playTone(880, 0.12, 'sine');
  if (name === 'wrong') playTone(220, 0.35, 'sawtooth');
};

const playerNameInput = $('#playerName');
const saveScoreBtn = $('#saveScore');

const lastNameKey = 'js_quiz_last_name';

const wireSave = () => {
  if (!saveScoreBtn || !playerNameInput) return;
  const last = localStorage.getItem(lastNameKey);
  if (last) playerNameInput.value = last;

  saveScoreBtn.addEventListener('click', () => {
    const name = (playerNameInput.value || 'Anonymous').trim();
    localStorage.setItem(lastNameKey, name);
    saveHighscore({ name, score, total: shuffledQuestions.length, date: Date.now() });
    renderHighscores();
    saveScoreBtn.disabled = true;
  });
};
const handleKeyNav = (e) => {
  const active = document.activeElement;
  if (!active || !active.classList) return;
  if (!active.classList.contains('option')) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
    e.preventDefault();
    const next = active.nextElementSibling || optionsEl.firstElementChild;
    if (next) next.focus();
  } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
    e.preventDefault();
    const prev = active.previousElementSibling || optionsEl.lastElementChild;
    if (prev) prev.focus();
  }
};


renderHighscores();
showLanding();

const ensureBlobs = () => {
  const heroBg = document.querySelector('.hero-bg');
  if (!heroBg) return;
  if (!heroBg.querySelector('.blob-1')) {
    ['blob-1','blob-2','blob-3'].forEach(c => {
      const d = document.createElement('div');
      d.className = `blob ${c}`;
      heroBg.appendChild(d);
    });
  }
};
ensureBlobs();

const highscorePreviewEl = $('#highscorePreview');
const populateHighscorePreview = () => {
  if (!highscorePreviewEl) return;
  const list = readHighscores();
  while (highscorePreviewEl.firstChild) highscorePreviewEl.removeChild(highscorePreviewEl.firstChild);
  if (list.length === 0) {
    const li = document.createElement('li');
    li.className = 'muted';
    li.textContent = 'No scores yet — play to appear here.';
    highscorePreviewEl.appendChild(li);
    return;
  }
  list.slice(0,3).forEach(item => {
    const li = document.createElement('li');
    li.textContent = `${item.name || 'Anonymous'} — ${item.score}/${item.total}`;
    highscorePreviewEl.appendChild(li);
  });
};
populateHighscorePreview();

const quickStartBtn = $('#quickStart');
if (quickStartBtn) {
  try {
    console.debug('[script] registering quickStart handler');
    const handleQuickStart = async () => {
      showToast('Quick start: attempting to load real questions...', 'info', 2000);
      try {
        const desired = Number((apiLimitSelect && apiLimitSelect.value) || 10);
  let loaded = await loadFromOpenTDB(50, 18, null, 'multiple', 'javascript');
        if (!loaded || loaded.length === 0) {
          const runtimeKey = getRuntimeApiKey() || EMBEDDED_API_KEY || '';
          if (runtimeKey) loaded = await loadFromQuizApi(runtimeKey, Math.min(30, desired));
        }
        if (loaded && loaded.length) {
          questions = loaded;
          populateFilters();
          showToast(`Loaded ${loaded.length} questions from remote API.`, 'success');
          startForTopic('javascript');
          return;
        }
        showToast('No questions returned from remote APIs; starting with local pool.', 'info');
        startForTopic('javascript');
      } catch (err) {
        console.warn('[quickStart] load failed', err && err.message);
        showToast('Failed to load remote questions; starting with local pool.', 'error');
        startForTopic('javascript');
      }
    };
    try { window.handleQuickStart = handleQuickStart; } catch (e) { /* ignore in constrained env */ }
    quickStartBtn.addEventListener('click', handleQuickStart);
  } catch (e) {
    console.error('[script] failed to register quickStart handler', e && e.message);
  }
}