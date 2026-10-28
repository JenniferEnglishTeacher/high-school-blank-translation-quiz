(() => {
  'use strict';
  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbxrcKXVicBJIz9GXlux3_IjJosAH6C46hRNFP1rvUcAGjOljsjJWpIHTaa05quQEzbF/exec';
  const VERSION = '2026-10-27-1';
  const PROFILE_KEY = 'jenniferQuizStudentProfileV1';
  const QUEUE_KEY = 'jenniferQuizResultQueueV1';
  const startedAt = Date.now();
  let metadataPromise, lastFingerprint = '', checkTimer = 0;
  const clean = value => String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  const visible = element => !!element && !element.hidden && !element.classList.contains('hidden') && getComputedStyle(element).display !== 'none';
  const numberAfter = (text, labels) => {
    for (const label of labels) {
      const match = text.match(new RegExp(label + '[：:\\s]*([0-9]+)', 'i'));
      if (match) return Number(match[1]);
    }
    return null;
  };

  function getProfile() {
    try {
      const profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
      return { studentName: clean(profile.studentName) };
    } catch (_) { return { studentName: '' }; }
  }
  function saveProfile(profile) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    document.dispatchEvent(new CustomEvent('quiz-profile-updated', { detail: profile }));
  }
  function requestProfile() {
    const current = getProfile();
    const studentName = clean(prompt('請輸入學生姓名（成績紀錄用）：', current.studentName) || '');
    if (!studentName) return null;
    const profile = { studentName };
    saveProfile(profile);
    return profile;
  }
  function setupDashboardProfile() {
    const form = document.querySelector('#quiz-result-profile');
    if (!form) return;
    const name = form.querySelector('#profile-student-name');
    const status = form.querySelector('#profile-status');
    const load = () => {
      const profile = getProfile();
      name.value = profile.studentName;
      status.textContent = profile.studentName ? `已設定：${profile.studentName}` : '尚未設定學生資料';
      status.className = profile.studentName ? 'profile-status saved' : 'profile-status';
    };
    form.addEventListener('submit', event => {
      event.preventDefault();
      const studentName = clean(name.value);
      if (!studentName) { status.textContent = '請先輸入學生姓名。'; status.className = 'profile-status error'; name.focus(); return; }
      saveProfile({ studentName }); load(); flushQueue();
    });
    load();
  }
  async function getMetadata() {
    if (metadataPromise) return metadataPromise;
    metadataPromise = (async () => {
      const fallback = { area: '', publisher: '', bookUnit: '', quizType: '', quizTitle: clean(document.querySelector('h1')?.textContent || document.title) };
      try {
        const response = await fetch('/high-school-blank-translation-quiz/dashboard.html', { cache: 'no-store' });
        if (!response.ok) return fallback;
        const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
        const currentPath = location.pathname.replace(/\/$/, '/index.html');
        const link = [...doc.querySelectorAll('a.quiz[href]')].find(anchor => new URL(anchor.getAttribute('href'), response.url).pathname.replace(/\/$/, '/index.html') === currentPath);
        if (!link) return fallback;
        const zone = link.closest('.zone'), publisher = link.closest('details.publisher'), unit = link.closest('.unit');
        return {
          area: clean(zone?.querySelector('.zone-title')?.textContent),
          publisher: clean(publisher?.querySelector('summary span')?.textContent),
          bookUnit: clean(unit?.querySelector('h3')?.textContent || publisher?.querySelector('summary span')?.textContent),
          quizType: clean(link.querySelector('b')?.textContent),
          quizTitle: clean(document.querySelector('h1')?.textContent || link.querySelector('b')?.textContent || document.title)
        };
      } catch (_) { return fallback; }
    })();
    return metadataPromise;
  }
  function resultRoot() {
    for (const selector of ['#result', '#resultScreen', '#results', '#result-screen', '#scoreScreen', '.result-screen', '.results-screen']) {
      const element = document.querySelector(selector); if (visible(element)) return element;
    }
    return null;
  }
  function parseResult(root) {
    const text = clean(root.innerText);
    if (!text || !/(作答結果|測驗結果|練習結果|完成|成績|錯題)/.test(text)) return null;
    const attempted = numberAfter(text, ['已作答', '實際作答', '完成題數']);
    let total = attempted ?? numberAfter(text, ['本輪題數', '選擇題數', '本輪完成', '共']);
    let wrong = numberAfter(text, ['曾答錯題數', '曾答錯', '錯題數', '答錯']);
    let correct = numberAfter(text, ['完成答對', '答對題數', '正確題數', '答對']);
    if (total == null) {
      const fraction = text.match(/(?:成績|答對|正確)[^0-9]{0,12}([0-9]+)\s*\/\s*([0-9]+)/);
      if (fraction) { correct = Number(fraction[1]); total = Number(fraction[2]); }
    }
    if (total == null) { const match = text.match(/(?:本輪完成|完成|共)\s*([0-9]+)\s*題/); if (match) total = Number(match[1]); }
    if (!Number.isFinite(total) || total <= 0) return null;
    if (!Number.isFinite(wrong)) wrong = Number.isFinite(correct) ? Math.max(0, total - correct) : 0;
    correct = Math.max(0, total - wrong);
    const wrongBox = root.querySelector('#wrongList, .wrong-list, .wrongList') || root;
    const numbers = [...new Set([...wrongBox.innerText.matchAll(/第\s*([0-9]+)\s*題/g)].map(match => match[1]))];
    return { total, correct, wrong, mistakeQuestionNumbers: numbers.join(', ') };
  }
  function enqueue(payload) {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    queue.push(payload); localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-100)));
  }
  async function flushQueue() {
    if (!ENDPOINT.startsWith('https://script.google.com/macros/s/')) return;
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    if (!queue.length) return;
    const remaining = [];
    for (const payload of queue) {
      try {
        await fetch(ENDPOINT, { method: 'POST', mode: 'no-cors', cache: 'no-store', keepalive: true, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
      } catch (_) { remaining.push(payload); }
    }
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  }
  async function record(score) {
    const profile = getProfile(), resolvedProfile = profile.studentName ? profile : requestProfile();
    if (!resolvedProfile) return false;
    const metadata = await getMetadata();
    const total = Number(score.total ?? score.totalQuestions), wrong = Number(score.wrong ?? score.wrongAnswers ?? 0);
    const correct = Number(score.correct ?? score.correctAnswers ?? Math.max(0, total - wrong));
    if (!Number.isFinite(total) || total <= 0) return false;
    const fingerprint = [location.pathname, total, wrong, score.mistakeQuestionNumbers || ''].join('|');
    if (fingerprint === lastFingerprint) return false;
    lastFingerprint = fingerprint;
    const payload = {
      kind: 'quiz-result', attemptId: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      timeDate: new Date().toISOString(), studentName: resolvedProfile.studentName,
      ...metadata, pagePath: location.pathname, totalQuestions: total, correctAnswers: correct, wrongAnswers: wrong,
      scorePercentage: Math.round(correct / total * 10000) / 100, mistakeQuestionNumbers: clean(score.mistakeQuestionNumbers),
      durationSeconds: Math.max(0, Math.round((Date.now() - startedAt) / 1000)), device: navigator.userAgent,
      recordingVersion: VERSION, responses: Array.isArray(score.responses) ? score.responses : []
    };
    enqueue(payload); await flushQueue();
    document.dispatchEvent(new CustomEvent('quiz-result-recorded', { detail: payload }));
    return true;
  }
  function inspect() {
    clearTimeout(checkTimer);
    checkTimer = setTimeout(() => { const root = resultRoot(), result = root && parseResult(root); if (result) record(result); }, 80);
  }
  document.addEventListener('click', event => {
    const text = clean(event.target.closest('button,a')?.textContent);
    if (/(開始作答|開始測驗|開始練習|重新選題|重新開始|再做一次錯題)/.test(text)) lastFingerprint = '';
    if (/(結束作答|結束練習|完成測驗|查看結果|交卷|完成)/.test(text)) setTimeout(inspect, 150);
  }, true);
  document.addEventListener('quiz-result-ready', event => record(event.detail || {}));
  new MutationObserver(inspect).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'hidden', 'style'] });
  window.addEventListener('online', flushQueue);
  window.QuizResultRecorder = { record, getProfile, saveProfile, flushQueue };
  setupDashboardProfile(); inspect(); flushQueue();
})();
