const STORAGE_KEY = 'junior2000-food-vocab-v1';
const icons = ['🍞', '🐟', '🥬', '🍉', '🍰', '🧋', '🧂', '🍳', '😋', '☕', '🥣', '🍴'];
const pluralAnswers = new Map(Object.entries({
  meal: 'meals', snack: 'snacks', bun: 'buns', sandwich: 'sandwiches',
  'hot dog': 'hot dogs', noodle: 'noodles', egg: 'eggs', dumpling: 'dumplings',
  nut: 'nuts', 'chicken nugget': 'chicken nuggets', steak: 'steaks',
  sausage: 'sausages', crab: 'crabs', clam: 'clams', bean: 'beans', carrot: 'carrots',
  potato: 'potatoes', pumpkin: 'pumpkins', tomato: 'tomatoes', mushroom: 'mushrooms',
  guava: 'guavas', lemon: 'lemons', peach: 'peaches', pineapple: 'pineapples',
  strawberry: 'strawberries', tangerine: 'tangerines', banana: 'bananas',
  cookie: 'cookies', doughnut: 'doughnuts', pie: 'pies', 'egg tart': 'egg tarts',
  crepe: 'crepes', plate: 'plates', bowl: 'bowls'
}));
const specialAnswers = new Map(Object.entries({
  bake: 'bakes', boil: 'boils', hunger: 'hungry', 'soda (cola)': 'soda',
  'a herd of elephant': 'a herd of', 'a flock of birds': 'a flock of',
  'a school of fish': 'a school of', 'a dozen eggs': 'a dozen'
}));

const els = Object.fromEntries([
  'home', 'quiz', 'category-grid', 'total-count', 'done-count', 'accuracy', 'reset-all',
  'back-home', 'shuffle', 'quiz-kicker', 'quiz-title', 'question-number', 'progress-bar',
  'score-label', 'word', 'pos', 'meaning', 'definition', 'question', 'answer-line',
  'answer-form', 'answer-input', 'feedback', 'question-zh', 'answer-zh', 'speak-word',
  'previous', 'reveal', 'next'
].map(id => [id, document.getElementById(id)]));

let categories = [];
let activeCategory = null;
let order = [];
let position = 0;
let progress = loadProgress();

function normalize(value) {
  return value.toLowerCase().trim().replace(/[.?!,]/g, '').replace(/\s+/g, ' ');
}

function answerFor(item) {
  if (specialAnswers.has(item.word)) return specialAnswers.get(item.word);
  if (pluralAnswers.has(item.word)) return pluralAnswers.get(item.word);
  return item.word;
}

function acceptedAnswers(item) {
  const values = [answerFor(item)];
  if (item.word === 'soda (cola)') values.push('cola');
  if (item.word === 'shrimp') values.push('shrimps');
  return values.map(normalize);
}

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  updateStats();
}

function itemKey(category, item) {
  return `${category.id}:${item.word}:${item.answerTemplate}`;
}

function updateStats() {
  const allItems = categories.flatMap(category => category.items.map(item => ({ category, item })));
  const completed = allItems.filter(({ category, item }) => progress[itemKey(category, item)]?.completed);
  const correct = completed.filter(({ category, item }) => progress[itemKey(category, item)]?.correct).length;
  els['total-count'].textContent = allItems.length || 195;
  els['done-count'].textContent = completed.length;
  els.accuracy.textContent = completed.length ? `${Math.round(correct / completed.length * 100)}%` : '—';
  if (categories.length) renderCategories();
}

function renderCategories() {
  els['category-grid'].innerHTML = '';
  categories.forEach((category, index) => {
    const completed = category.items.filter(item => progress[itemKey(category, item)]?.completed).length;
    const percent = Math.round(completed / category.items.length * 100);
    const [en, ...zhParts] = category.title.split(' ');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'category-card';
    button.dataset.icon = icons[index];
    button.innerHTML = `
      <div class="category-card__top"><span aria-hidden="true">${icons[index]}</span><span class="category-card__count">${completed}/${category.items.length}</span></div>
      <h3>${category.title}</h3>
      <p>${completed ? `已完成 ${percent}%` : '尚未開始'}</p>
      <div class="category-card__progress"><span style="width:${percent}%"></span></div>`;
    button.addEventListener('click', () => startCategory(index));
    els['category-grid'].appendChild(button);
  });
}

function startCategory(index) {
  activeCategory = categories[index];
  order = activeCategory.items.map((_, itemIndex) => itemIndex);
  const firstUnfinished = order.findIndex(itemIndex => !progress[itemKey(activeCategory, activeCategory.items[itemIndex])]?.completed);
  position = firstUnfinished >= 0 ? firstUnfinished : 0;
  els.home.classList.remove('screen--active');
  els.quiz.classList.add('screen--active');
  renderQuestion();
  window.scrollTo({ top: document.querySelector('main').offsetTop, behavior: 'smooth' });
}

function currentItem() { return activeCategory.items[order[position]]; }

function renderAnswerLine(template, visibleAnswer = null) {
  const value = visibleAnswer || '__________';
  const html = `<span class="blank">${value}</span>`;
  els['answer-line'].innerHTML = template.replace('____________', html);
}

function renderQuestion() {
  const item = currentItem();
  const record = progress[itemKey(activeCategory, item)];
  els['quiz-kicker'].textContent = activeCategory.title;
  els['quiz-title'].textContent = '例句填空';
  els['question-number'].textContent = `${position + 1} / ${order.length}`;
  els['progress-bar'].style.width = `${(position + 1) / order.length * 100}%`;
  const correct = activeCategory.items.filter(entry => progress[itemKey(activeCategory, entry)]?.correct).length;
  els['score-label'].textContent = `答對 ${correct} 題`;
  els.word.textContent = item.word;
  els.pos.textContent = item.pos;
  els.meaning.textContent = item.chinese;
  els.definition.textContent = item.definition;
  els.question.textContent = item.question;
  els['question-zh'].textContent = item.questionZh;
  els['answer-zh'].textContent = item.answerZh;
  els['answer-input'].value = '';
  els['answer-input'].className = '';
  els.feedback.className = 'feedback';
  els.feedback.textContent = record?.completed
    ? (record.correct ? '✓ 這題曾經答對' : '這題可以再挑戰一次')
    : '';
  renderAnswerLine(item.answerTemplate);
  els.previous.disabled = position === 0;
  els.next.textContent = position === order.length - 1 ? '完成本主題' : '下一題';
  setTimeout(() => els['answer-input'].focus(), 80);
}

function checkAnswer(event) {
  event.preventDefault();
  const item = currentItem();
  const value = els['answer-input'].value;
  if (!value.trim()) {
    els.feedback.className = 'feedback feedback--wrong';
    els.feedback.textContent = '請先輸入答案。';
    return;
  }
  const isCorrect = acceptedAnswers(item).includes(normalize(value));
  const key = itemKey(activeCategory, item);
  progress[key] = { completed: true, correct: Boolean(progress[key]?.correct || isCorrect) };
  saveProgress();
  if (isCorrect) {
    els.feedback.className = 'feedback feedback--correct';
    els.feedback.textContent = '✓ 答對了！';
    renderAnswerLine(item.answerTemplate, answerFor(item));
  } else {
    els.feedback.className = 'feedback feedback--wrong';
    els.feedback.textContent = '再試一次，注意單複數或動詞變化。';
  }
  const correct = activeCategory.items.filter(entry => progress[itemKey(activeCategory, entry)]?.correct).length;
  els['score-label'].textContent = `答對 ${correct} 題`;
}

function goHome() {
  els.quiz.classList.remove('screen--active');
  els.home.classList.add('screen--active');
  updateStats();
  window.scrollTo({ top: document.querySelector('main').offsetTop, behavior: 'smooth' });
}

els['answer-form'].addEventListener('submit', checkAnswer);
els['back-home'].addEventListener('click', goHome);
els.previous.addEventListener('click', () => { if (position > 0) { position--; renderQuestion(); } });
els.next.addEventListener('click', () => { if (position < order.length - 1) { position++; renderQuestion(); } else goHome(); });
els.reveal.addEventListener('click', () => {
  const item = currentItem();
  renderAnswerLine(item.answerTemplate, answerFor(item));
  els.feedback.className = 'feedback';
  els.feedback.textContent = `答案：${answerFor(item)}`;
  progress[itemKey(activeCategory, item)] = { completed: true, correct: Boolean(progress[itemKey(activeCategory, item)]?.correct) };
  saveProgress();
});
els.shuffle.addEventListener('click', () => {
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  position = 0;
  renderQuestion();
});
els['speak-word'].addEventListener('click', () => {
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(answerFor(currentItem()));
  utterance.lang = 'en-US';
  utterance.rate = .82;
  speechSynthesis.speak(utterance);
});
els['reset-all'].addEventListener('click', () => {
  if (confirm('確定要清除全部學習進度嗎？')) {
    progress = {};
    saveProgress();
  }
});

fetch('vocab.json')
  .then(response => {
    if (!response.ok) throw new Error('Vocabulary data could not be loaded.');
    return response.json();
  })
  .then(data => {
    categories = data;
    renderCategories();
    updateStats();
  })
  .catch(() => {
    els['category-grid'].innerHTML = '<p>資料載入失敗，請重新整理頁面。</p>';
  });
