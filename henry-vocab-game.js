/* Henry 靜心 weekly vocabulary game engine. Data: window.HV_DATA (same JSON as the Word worksheet). */
(() => {
  'use strict';
  const D = window.HV_DATA;
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const norm = s => String(s).trim().toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').replace(/[.!?,]+$/, '');
  const ALT = { marveled: ['marvelled'], marveling: ['marvelling'], traveled: ['travelled'], traveling: ['travelling'] };
  const same = (a, b) => norm(a) === norm(b) || (ALT[norm(b)] || []).includes(norm(a));
  const RULE = {
    past: ['過去式 Past tense', '有過去時間線索（yesterday, last…, ago, when I was…）→ -ed / -ied / 不規則過去式'],
    s: ['-s / -es / -ies', '主詞是 he / she / it / 單數名詞，且是現在的習慣或事實 → 動詞加 -s / -es / -ies'],
    ing: ['-ing 進行式', 'am / is / are / was / were + 動詞 → 加 -ing'],
    pp: ['p.p. 完成式', 'have / has / had + 動詞 → 過去分詞'],
    plural: ['複數 Plural', 'two / many / several / some / all the… + 名詞 → 加 -s / -es / -ies'],
    sing: ['單數 Singular', 'a / an / one / every + 名詞 → 單數'],
    none: ['不變 No change', '形容詞、副詞不加 -s 或 -ed，照原樣寫'],
  };
  const words = D.words;
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function speak(text) {
    try { const u = new SpeechSynthesisUtterance(text.replace(/\*\*/g, '')); u.lang = 'en-US'; u.rate = .9; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (_) { }
  }
  const STORY_RE = /\[([^\]>]+)>([^\]]+)\]|\{([^}>]+)>([^}]+)\}/g;
  const storyKey = st => st.replace(STORY_RE, (a, b, c, d, e) => b ? c : e);

  // ---------- sections ----------
  const SECTIONS = [
    { id: 'cards', name: '單字卡 Word Cards', desc: `${words.length} 個單字｜意思、詞形、搭配詞、朗讀`, scored: false },
    { id: 'meaning', name: '看意思寫單字 Meaning → Word', desc: `${words.length} 題｜拼字作答`, scored: true },
    { id: 'sentence', name: '單句填空（詞形變化）', desc: `${D.sentenceSets.flat().length} 題｜動詞時態・名詞單複數`, scored: true },
    { id: 'paragraph', name: '段落填空 Paragraph Fill-in', desc: `${D.paragraphs.length} 篇｜${D.paragraphs.reduce((n, p) => n + p.answers.length, 0)} 格`, scored: true },
    { id: 'fix', name: '改錯 Grammar Fix', desc: `${words.length} 篇小短文｜動詞變化・名詞單複數`, scored: true },
    { id: 'make', name: '造句 Sentence Making', desc: `${words.length} 題｜情境造句＋範例`, scored: false },
  ];
  let state = null;

  function home() {
    $('#select').classList.remove('hidden'); $('#play').classList.add('hidden'); $('#done').classList.add('hidden');
    $('#sectionGrid').innerHTML = SECTIONS.map(s => `<button class="section-btn" data-s="${s.id}"><b>${esc(s.name)}</b><span>${esc(s.desc)}</span></button>`).join('');
    document.querySelectorAll('.section-btn').forEach(b => b.onclick = () => start(b.dataset.s));
    window.scrollTo(0, 0);
  }

  function start(id, retryItems) {
    const sec = SECTIONS.find(s => s.id === id);
    let items;
    if (id === 'cards') items = words.map(w => ({ w }));
    if (id === 'meaning') items = shuffle(words).map(w => ({ w, a: w.w }));
    if (id === 'sentence') items = D.sentenceSets.flat().map(x => ({ ...x }));
    if (id === 'paragraph') items = D.paragraphs.map(p => ({ p }));
    if (id === 'fix') items = words.map(w => ({ w }));
    if (id === 'make') items = words.map(w => ({ w }));
    if (retryItems) items = retryItems;
    items.forEach((it, i) => it.no = it.no || i + 1);
    state = { sec, items, i: 0, total: 0, wrong: 0, wrongNos: [], wrongItems: [], responses: [] };
    if (sec.scored) state.total = id === 'paragraph' ? items.reduce((n, it) => n + it.p.answers.length, 0) : id === 'fix' ? items.reduce((n, it) => n + countFix(it.w.story), 0) : items.length;
    $('#select').classList.add('hidden'); $('#done').classList.add('hidden'); $('#play').classList.remove('hidden');
    show(); $('#play').scrollIntoView({ block: 'start' });
  }
  const countFix = st => (st.match(STORY_RE) || []).length;

  function chrome() {
    const { sec, items, i } = state;
    $('#secTitle').textContent = sec.name;
    $('#meta').textContent = `${i + 1} / ${items.length}`;
    $('#bar').style.width = `${(i / items.length) * 100}%`;
    $('#wrongCount').textContent = sec.scored ? `錯 ${state.wrong}` : '';
    $('#feedback').className = 'feedback hidden'; $('#feedback').innerHTML = '';
    $('#next').classList.add('hidden'); $('#check').classList.remove('hidden'); $('#check').disabled = false;
  }
  function feedback(ok, html) { const f = $('#feedback'); f.className = 'feedback ' + (ok ? 'ok' : 'bad'); f.innerHTML = html; }
  function finishItem() { $('#check').classList.add('hidden'); $('#next').classList.remove('hidden'); $('#next').focus(); }
  function miss(item, n, detail) {
    state.wrong += n; state.wrongNos.push(item.no); if (!state.wrongItems.includes(item)) state.wrongItems.push(item);
    state.responses.push({ q: item.no, detail });
  }

  function show() {
    chrome();
    const it = state.items[state.i], id = state.sec.id, area = $('#area');
    $('#check').textContent = '檢查答案';
    if (id === 'cards') {
      const w = it.w;
      area.innerHTML = `<div class="wcard"><div class="whead"><b>${esc(w.w)}</b> <span class="pos">(${esc(w.pos)})</span> <span class="zh">${esc(w.zh)}</span>${w.rec ? ' <span class="rec">★ 認讀字</span>' : ''}
        <button class="btn voice small" data-say="${esc(w.w)}">🔊</button></div>
        ${w.forms ? `<p class="forms">${esc(w.forms)}</p>` : ''}
        <ol class="means">${w.meanings.map(m => `<li>${esc(m.en)}<br><span class="zh">${esc(m.zh)}</span></li>`).join('')}</ol>
        <h4>Collocations 常見搭配</h4><ul class="coll">${w.coll.map(c => `<li><b>${esc(c.en)}</b> <span class="zh">${esc(c.zh)}</span></li>`).join('')}</ul>
        ${w.family ? `<p class="forms">Word family 詞類變化：${esc(w.family)}</p>` : ''}
        <p class="sample">例句：${esc(w.sample)} <button class="btn voice small" data-say="${esc(w.sample)}">🔊</button></p></div>`;
      area.querySelectorAll('[data-say]').forEach(b => b.onclick = () => speak(b.dataset.say));
      $('#check').classList.add('hidden'); $('#next').classList.remove('hidden');
      return;
    }
    if (id === 'meaning') {
      area.innerHTML = `<div class="question">${esc(it.w.short)} → ?</div>
        <div class="bank">${words.map(w => `<span class="word">${esc(w.w)}</span>`).join('')}</div>
        <input id="ans" class="answer" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="輸入單字">`;
      return focusEnter();
    }
    if (id === 'sentence') {
      area.innerHTML = `<div class="question" id="sent">${esc(it.s).replace('___', '<span class="blank">______</span>')}</div>
        <p class="hint">Base word 原形：<span class="word">${esc(it.w)}</span>　先找線索字，再決定要不要變化！</p>
        <input id="ans" class="answer" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="輸入正確形式">`;
      it.tries = 0; return focusEnter();
    }
    if (id === 'paragraph') {
      const p = it.p; const bank = shuffle(p.answers.map(a => a.w));
      area.innerHTML = `<h3 class="ptitle">${esc(p.title)}</h3><div class="bank">${bank.map(w => `<span class="word">${esc(w)}</span>`).join('')}</div>
        <p class="hint">每個字只用一次；動詞和名詞要變化形式。</p>` +
        p.text.split('\n\n').map(par => `<p class="para">${esc(par).replace(/\{(\d+)\}/g, (_, n) => `<input class="inl" data-k="${n - 1}" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="blank ${n}" placeholder="(${n})">`)}</p>`).join('');
      return;
    }
    if (id === 'fix') {
      const w = it.w; let k = 0;
      const html = esc(w.story).replace(/\[([^\]&]+)&gt;([^\]]+)\]|\{([^}&]+)&gt;([^}]+)\}/g, (all, opts, right, wrong, fix) => {
        const idx = k++;
        if (opts) return `<select class="inl be" data-k="${idx}" aria-label="be verb"><option value="">(${opts})</option>${opts.split('/').map(o => `<option>${o}</option>`).join('')}</select>`;
        return `<span class="edit"><del>${wrong}</del><input class="inl fixin" data-k="${idx}" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="correct ${wrong}" placeholder="${wrong}"></span>`;
      });
      area.innerHTML = `<p class="instructions">${esc(w.w)}：紅色字是錯的，在旁邊輸入正確形式；下拉選單選對 be 動詞。（共 ${countFix(w.story)} 處）</p><div class="question fixbox">${html}</div>`;
      return;
    }
    if (id === 'make') {
      const w = it.w;
      area.innerHTML = `<div class="question"><span class="word">${esc(w.w)}</span> (${esc(w.pos)}) ${esc(w.zh)}</div>
        <p><b>情境 Prompt：</b>${esc(w.prompt.en)}<br><span class="zh">${esc(w.prompt.zh)}</span></p>
        <p class="hint">搭配詞提示：${w.coll.map(c => esc(c.en)).join('｜')}</p>
        <textarea id="ans" class="answer" rows="3" placeholder="用 ${esc(w.w)} 造一個完整的句子（需要時變化詞形）"></textarea>`;
      $('#check').textContent = '看範例';
      return;
    }
  }
  function focusEnter() {
    const inp = $('#ans'); setTimeout(() => { try { inp.focus({ preventScroll: true }); } catch (_) { } }, 30);
    inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); if (!$('#check').classList.contains('hidden')) check(); else next(); } };
  }

  function wordForms(w) {
    const b = w.w.toLowerCase(), s = new Set([b, b + 's', b + 'es', b + 'ed', b + 'd', b + 'ing', b.replace(/e$/, '') + 'ing', b.replace(/y$/, 'ies'), b.replace(/y$/, 'ied')]);
    (w.irr || []).forEach(x => s.add(x.toLowerCase())); return s;
  }

  function check() {
    const it = state.items[state.i], id = state.sec.id;
    if (id === 'meaning') {
      const v = $('#ans').value; if (!v.trim()) return;
      const ok = same(v, it.a); $('#ans').disabled = true;
      if (!ok) miss(it, 1, `${it.w.short} → ${v}`);
      feedback(ok, ok ? `✔ 答對了！<b>${esc(it.a)}</b> ${esc(it.w.zh)}` : `✘ 正確答案：<b>${esc(it.a)}</b> ${esc(it.w.zh)}`);
      speak(it.a); return finishItem();
    }
    if (id === 'sentence') {
      const v = $('#ans').value; if (!v.trim()) return;
      const ok = same(v, it.a); it.tries++;
      if (!ok && it.tries === 1) {
        const b = it.s.indexOf('___'); let c = it.s.lastIndexOf(it.clue, b); if (c < 0) c = it.s.indexOf(it.clue, b);
        const parts = [it.s.slice(0, c), it.s.slice(c, c + it.clue.length), it.s.slice(c + it.clue.length)];
        $('#sent').innerHTML = (esc(parts[0]) + '<mark>' + esc(parts[1]) + '</mark>' + esc(parts[2])).replace('___', '<span class="blank">______</span>');
        feedback(false, `再想一次！看看黃色的線索字：<b>${esc(it.clue)}</b>`); $('#ans').select(); return;
      }
      $('#ans').disabled = true;
      if (!ok) miss(it, 1, `${it.s} → ${v}`);
      const full = it.s.replace('___', it.a);
      const r = RULE[it.tag] || ['', ''];
      feedback(ok, `${ok ? (it.tries === 1 ? '✔ 一次就對！' : '✔ 改對了！') : '✘ 正確答案：<b>' + esc(it.a) + '</b>'}<br><span class="rule">${esc(r[0])}</span> ${esc(r[1])}<br><span class="full">${esc(full)}</span>`);
      speak(full); return finishItem();
    }
    if (id === 'paragraph') {
      const p = it.p; let wrong = 0; const det = [];
      document.querySelectorAll('#area .inl').forEach(inp => {
        const a = p.answers[+inp.dataset.k]; const ok = same(inp.value, a.a);
        inp.classList.toggle('correct', ok); inp.classList.toggle('incorrect', !ok); inp.disabled = true;
        if (!ok) { wrong++; det.push(`(${+inp.dataset.k + 1}) ${inp.value || '—'} → ${a.a}`); inp.insertAdjacentHTML('afterend', `<span class="fixans">${esc(a.a)}</span>`); }
      });
      if (wrong) miss(it, wrong, det.join('; '));
      feedback(!wrong, wrong ? `✘ 錯 ${wrong} 格，正確答案已標在旁邊（綠字）。` : '✔ 全部正確！');
      speak(p.text.replace(/\{(\d+)\}/g, (_, n) => p.answers[n - 1].a)); return finishItem();
    }
    if (id === 'fix') {
      const toks = [...it.w.story.matchAll(STORY_RE)]; let wrong = 0; const det = [];
      document.querySelectorAll('#area .inl').forEach(inp => {
        const m = toks[+inp.dataset.k]; const right = m[1] ? m[2] : m[4];
        const ok = same(inp.value, right);
        inp.classList.toggle('correct', ok); inp.classList.toggle('incorrect', !ok); inp.disabled = true;
        if (!ok) { wrong++; det.push(`${m[3] || '(' + m[1] + ')'} → ${right}`); inp.insertAdjacentHTML('afterend', `<span class="fixans">${esc(right)}</span>`); }
      });
      if (wrong) miss(it, wrong, det.join('; '));
      const key = storyKey(it.w.story);
      feedback(!wrong, `${wrong ? `✘ 錯 ${wrong} 處，正確答案已標在旁邊（綠字）。` : '✔ 全部改對了！'}<div class="reference">${esc(key)}</div>`);
      speak(key); return finishItem();
    }
    if (id === 'make') {
      const v = $('#ans').value.trim(); const w = it.w; const F = wordForms(w);
      const used = v.toLowerCase().split(/[^a-z']+/).some(t => F.has(t));
      const okShape = /^[A-Z]/.test(v) && /[.!?]$/.test(v);
      let note = !v ? '先試著自己寫一句，再看範例。' : used ? '✔ 有用到本週單字。' : `⚠ 句子裡沒有看到 ${w.w}（或它的變化形）。`;
      if (v && !okShape) note += ' 記得大寫開頭、句號結尾。';
      feedback(!!v && used, `${esc(note)}<div class="reference"><b>範例 Sample：</b>${esc(w.sample)}</div>`);
      speak(w.sample); return finishItem();
    }
  }

  function next() {
    state.i++; $('#play').scrollIntoView({ block: 'start' });
    if (state.i < state.items.length) return show();
    done();
  }
  function done() {
    $('#play').classList.add('hidden'); const box = $('#done'); box.classList.remove('hidden');
    const s = state, sec = s.sec;
    if (!sec.scored) {
      box.innerHTML = `<h2>完成：${esc(sec.name)}</h2><p>做得好！可以選其他題型繼續練習。</p><div class="actions"><button class="btn primary" id="again">重新開始</button><button class="btn" id="back">回題型選單</button></div>`;
    } else {
      const correct = Math.max(0, s.total - s.wrong);
      box.innerHTML = `<h2>練習結果：${esc(sec.name)}</h2>
        <div class="summary"><div class="stat"><b>${correct} / ${s.total}</b>答對題數</div><div class="stat"><b>${Math.round(correct / s.total * 100)}%</b>正確率</div><div class="stat"><b>${s.wrong}</b>錯題數</div></div>
        ${s.wrongItems.length ? `<h3>要再複習的題目</h3>` + s.responses.map(r => `<div class="wrong-card">第 ${r.q} 題：${esc(r.detail)}</div>`).join('') : '<p>全部答對，太棒了！</p>'}
        <div class="actions">${s.wrongItems.length ? '<button class="btn danger" id="retry">再做一次錯題</button>' : ''}<button class="btn primary" id="again">重新開始</button><button class="btn" id="back">回題型選單</button></div>`;
      document.dispatchEvent(new CustomEvent('quiz-result-ready', { detail: { total: s.total, correct, wrong: s.wrong, mistakeQuestionNumbers: s.wrongNos.join(', '), responses: s.responses } }));
      const r = $('#retry'); if (r) r.onclick = () => start(sec.id, s.wrongItems.map(x => ({ ...x, tries: 0 })));
    }
    $('#again').onclick = () => start(sec.id); $('#back').onclick = home;
    window.scrollTo(0, 0);
  }

  $('#check').onclick = check; $('#next').onclick = next; $('#quit').onclick = home;
  document.title = `Henry 靜心 ${D.code} Vocabulary Game`;
  $('#title').textContent = `Henry 靜心 ${D.code} Vocabulary Game`;
  $('#sub').textContent = `Module ${D.module} Week ${D.week}（${D.schoolWeek}）：${words.map(w => w.w).join(' · ')}`;
  home();
})();
