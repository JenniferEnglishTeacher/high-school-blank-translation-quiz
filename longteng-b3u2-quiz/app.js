(() => {
  'use strict';

  const data = window.QUIZ_DATA;
  const storageKey = 'longteng-b3u2-quiz-v1';
  const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
  const state = { sectionId: null, search: '', responses: saved.responses || {}, reviews: saved.reviews || {}, graded: saved.graded || {} };

  const $ = (selector, root = document) => root.querySelector(selector);
  const els = {
    dashboard: $('#dashboard'), quizView: $('#quizView'), questionList: $('#questionList'),
    sectionNav: $('#sectionNav'), title: $('#sectionTitle'), kicker: $('#sectionKicker'),
    search: $('#searchInput'), progress: $('#progressText'), score: $('#scoreText'), empty: $('#emptyState')
  };

  function save() {
    localStorage.setItem(storageKey, JSON.stringify({ responses: state.responses, reviews: state.reviews, graded: state.graded }));
    updateProgress();
  }

  function sectionItemCount(section) {
    return section.blocks.reduce((sum, block) => sum + (block.type === 'group' ? block.questions.length : 1), 0);
  }

  function allItems() {
    const items = [];
    data.sections.forEach(section => section.blocks.forEach(block => {
      if (block.type === 'group') block.questions.forEach(q => items.push({ section, block, q, key: `${section.id}-g${block.number}-q${q.number}` }));
      else items.push({ section, block, q: block, key: `${section.id}-q${block.number}` });
    }));
    return items;
  }

  function updateProgress() {
    const items = allItems();
    const completed = items.filter(item => hasResponse(state.responses[item.key]) || state.reviews[item.key]).length;
    const graded = Object.values(state.graded);
    const correct = graded.filter(Boolean).length;
    els.progress.textContent = `${completed} / ${items.length} 已作答`;
    els.score.textContent = graded.length ? `自動評分 ${correct} / ${graded.length}` : '尚未評分';
    renderNav();
  }

  function hasResponse(value) {
    return Array.isArray(value) ? value.length > 0 : Boolean(String(value ?? '').trim());
  }

  function parseChoices(text) {
    const allMatches = [...text.matchAll(/\(([A-F])\)\s*/g)];
    const startAt = allMatches.findIndex((match, i) => match[1] === 'A' && allMatches[i + 1]?.[1] === 'B');
    if (startAt < 0) return null;
    const matches = [];
    for (let i = startAt; i < allMatches.length; i++) {
      const expected = String.fromCharCode(65 + matches.length);
      if (allMatches[i][1] !== expected) break;
      matches.push(allMatches[i]);
    }
    if (matches.length < 2) return null;
    const first = matches[0].index;
    const prompt = text.slice(0, first).replace(/^\s*（\s*）\s*/, '').trim();
    const choices = matches.map((match, i) => ({
      letter: match[1],
      text: text.slice(match.index + match[0].length, i + 1 < matches.length ? matches[i + 1].index : text.length).trim().replace(/[　\s]+$/, '')
    }));
    return { prompt, choices };
  }

  function cleanSubNumber(text) {
    return text.replace(/^\s*（\s*）\s*/, '').replace(/^\s*\(\d+\)\s*/, '').trim();
  }

  function renderNav() {
    els.sectionNav.innerHTML = '';
    data.sections.forEach(section => {
      const total = sectionItemCount(section);
      const completed = allItems().filter(i => i.section.id === section.id && (hasResponse(state.responses[i.key]) || state.reviews[i.key])).length;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `section-link${state.sectionId === section.id ? ' active' : ''}`;
      button.innerHTML = `<span>${section.id}</span><span>${escapeHtml(section.title.replace(/^.+?、/, ''))}</span><span class="count">${completed}/${total}</span>`;
      button.addEventListener('click', () => openSection(section.id));
      els.sectionNav.appendChild(button);
    });
  }

  function renderDashboard() {
    state.sectionId = null;
    els.quizView.hidden = true;
    els.dashboard.hidden = false;
    els.empty.hidden = true;
    els.dashboard.innerHTML = '';
    const query = state.search.toLowerCase();
    const sections = data.sections.filter(section => !query || section.title.toLowerCase().includes(query) || JSON.stringify(section.blocks).toLowerCase().includes(query));
    sections.forEach(section => {
      const total = sectionItemCount(section);
      const done = allItems().filter(i => i.section.id === section.id && (hasResponse(state.responses[i.key]) || state.reviews[i.key])).length;
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'unit-card';
      button.innerHTML = `<span class="unit-card__number">SECTION ${String(section.id).padStart(2, '0')}</span><h3>${escapeHtml(section.title)}</h3><div class="unit-card__meta">${total} 個作答項目 · ${done} 已完成</div><div class="meter"><span style="width:${total ? done / total * 100 : 0}%"></span></div>`;
      button.addEventListener('click', () => openSection(section.id));
      els.dashboard.appendChild(button);
    });
    els.empty.hidden = sections.length > 0;
    renderNav();
  }

  function openSection(id) {
    state.sectionId = id;
    const section = data.sections.find(s => s.id === id);
    els.dashboard.hidden = true; els.quizView.hidden = false; els.empty.hidden = true;
    els.title.textContent = section.title;
    els.kicker.textContent = `SECTION ${String(id).padStart(2, '0')} · ${sectionItemCount(section)} ITEMS`;
    els.questionList.innerHTML = '';
    let shown = 0;
    section.blocks.forEach(block => {
      if (block.type === 'group') {
        const wrapper = document.createElement('section');
        wrapper.className = 'group-card';
        wrapper.innerHTML = `<h3 class="group-card__title">題組 ${block.number}</h3><div class="context">${formatText(block.context)}</div>${block.image ? `<img class="source-image" src="${block.image}" alt="題組 ${block.number} 圖片">` : ''}`;
        block.questions.forEach(q => {
          const key = `${section.id}-g${block.number}-q${q.number}`;
          if (matchesSearch(q.prompt, block.context)) { wrapper.appendChild(createQuestion(section, q, key, `${block.number}-${q.number}`)); shown++; }
        });
        if (wrapper.querySelector('.question-card')) els.questionList.appendChild(wrapper);
      } else {
        const key = `${section.id}-q${block.number}`;
        if (matchesSearch(block.prompt, '')) { els.questionList.appendChild(createQuestion(section, block, key, block.number)); shown++; }
      }
    });
    els.empty.hidden = shown > 0;
    if (!shown) els.empty.hidden = false;
    renderNav();
    window.scrollTo({ top: document.querySelector('.shell').offsetTop, behavior: 'smooth' });
  }

  function matchesSearch(prompt, context) {
    const q = state.search.trim().toLowerCase();
    return !q || `${prompt} ${context}`.toLowerCase().includes(q);
  }

  function createQuestion(section, q, key, label) {
    const card = $('#questionTemplate').content.firstElementChild.cloneNode(true);
    card.dataset.key = key;
    $('.number', card).textContent = label;
    const official = String(q.answer ?? '').trim();
    const detectedChoices = parseChoices(q.prompt);
    const useChoiceControls = detectedChoices && (
      [1, 4, 5, 10, 12].includes(section.id) ||
      (section.id === 13 && /^[A-F]+$/.test(official.replace(/\s/g, '')))
    );
    const parsed = useChoiceControls ? detectedChoices : null;
    $('.prompt', card).innerHTML = formatText(cleanSubNumber(parsed ? parsed.prompt : q.prompt));
    if (q.image) $('.prompt', card).insertAdjacentHTML('afterend', `<img class="source-image" src="${q.image}" alt="題目圖片">`);
    const response = $('.response', card);
    const isMulti = parsed && /^[A-F]{2,}$/.test(official.replace(/\s/g, ''));

    if (parsed) {
      const box = document.createElement('div'); box.className = 'choices';
      parsed.choices.forEach(choice => {
        const row = document.createElement('label'); row.className = 'choice';
        const input = document.createElement('input');
        input.type = isMulti ? 'checkbox' : 'radio'; input.name = key; input.value = choice.letter;
        const old = state.responses[key]; input.checked = Array.isArray(old) ? old.includes(choice.letter) : old === choice.letter;
        input.addEventListener('change', () => {
          state.responses[key] = isMulti ? [...box.querySelectorAll('input:checked')].map(i => i.value).sort() : input.value;
          markAnswered(card, key); save();
        });
        row.append(input, document.createTextNode(`${choice.letter}. ${choice.text}`)); box.appendChild(row);
      });
      response.appendChild(box);
    } else {
      const exact = [2, 3].includes(section.id);
      const input = document.createElement(exact ? 'input' : 'textarea');
      if (exact) input.type = 'text';
      input.value = state.responses[key] || '';
      input.placeholder = exact ? '輸入答案' : '在這裡作答…';
      input.addEventListener('input', () => { state.responses[key] = input.value; markAnswered(card, key); save(); });
      response.appendChild(input);
    }

    const answer = $('.answer', card);
    answer.innerHTML = `<strong>參考答案</strong><br>${official ? formatText(official) : '答案資料未提供'}`;
    $('.reveal', card).addEventListener('click', () => { answer.hidden = !answer.hidden; });
    $('.check', card).addEventListener('click', () => checkQuestion(card, section, q, key, parsed, isMulti));
    markAnswered(card, key);
    if (key in state.graded) applyGrade(card, state.graded[key]);
    return card;
  }

  function checkQuestion(card, section, q, key, parsed, isMulti) {
    const official = String(q.answer ?? '').trim();
    const response = state.responses[key];
    const feedback = $('.feedback', card);
    if (!hasResponse(response)) {
      feedback.hidden = false; feedback.className = 'feedback bad'; feedback.textContent = '請先作答。'; return;
    }
    const autoGradable = parsed ? /^[A-F]+$/.test(official.replace(/\s/g, '')) : [2, 3].includes(section.id);
    if (autoGradable) {
      const actual = parsed
        ? (Array.isArray(response) ? response.join('') : String(response)).replace(/\s/g, '').toUpperCase()
        : normalize(response);
      const expected = parsed ? official.replace(/\s/g, '').toUpperCase() : normalize(official);
      const correct = actual === expected;
      state.graded[key] = correct; applyGrade(card, correct);
      feedback.hidden = false; feedback.className = `feedback ${correct ? 'good' : 'bad'}`;
      feedback.textContent = correct ? '答對了！' : '再試一次，或查看參考答案。';
    } else {
      $('.answer', card).hidden = false;
      feedback.hidden = false; feedback.className = 'feedback';
      feedback.innerHTML = '請和參考答案比較，再自行標記：<div class="review-row"><button type="button" data-review="yes">✓ 已掌握</button><button type="button" data-review="no">↻ 再練一次</button></div>';
      feedback.querySelectorAll('[data-review]').forEach(btn => btn.addEventListener('click', () => {
        state.reviews[key] = btn.dataset.review === 'yes';
        card.classList.toggle('correct', state.reviews[key]); save();
      }));
    }
    save();
  }

  function applyGrade(card, correct) {
    card.classList.toggle('correct', Boolean(correct));
    card.classList.toggle('incorrect', !correct);
  }

  function markAnswered(card, key) { card.classList.toggle('answered', hasResponse(state.responses[key]) || state.reviews[key]); }
  function normalize(value) { return String(value ?? '').toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9']/g, ''); }
  function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function formatText(value) { return escapeHtml(value).replace(/\n/g, '<br>'); }

  $('#dashboardBtn').addEventListener('click', renderDashboard);
  $('#backBtn').addEventListener('click', renderDashboard);
  els.search.addEventListener('input', () => { state.search = els.search.value; state.sectionId ? openSection(state.sectionId) : renderDashboard(); });
  $('#revealSectionBtn').addEventListener('click', () => document.querySelectorAll('#questionList .answer').forEach(el => { el.hidden = false; }));
  $('#gradeAllBtn').addEventListener('click', () => {
    if (!state.sectionId) return;
    document.querySelectorAll('#questionList .question-card').forEach(card => $('.check', card).click());
    updateProgress();
  });
  $('#resetBtn').addEventListener('click', () => {
    if (!confirm('確定要清除所有作答紀錄嗎？此動作無法復原。')) return;
    state.responses = {}; state.reviews = {}; state.graded = {}; localStorage.removeItem(storageKey);
    state.sectionId ? openSection(state.sectionId) : renderDashboard(); updateProgress();
  });

  renderDashboard(); updateProgress();
})();
