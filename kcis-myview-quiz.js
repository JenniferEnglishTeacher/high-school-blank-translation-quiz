/* kcis-myview-quiz.js — KCIS My View article quizzes (vocabulary / FET / reading).
   Page sets window.MYVIEW_PART = 'vocab' | 'fet' | 'reading' and loads kcis-myview-<slug>-data.js (window.MYVIEW). */
(() => {
  'use strict';
  const D = window.MYVIEW, PART = window.MYVIEW_PART || 'vocab';
  const CSS = `:root{--accent:#0f766e;--bg:#f4f7fb;--ink:#172033;--muted:#65748b;--line:#d9e2ef;--ok:#15803d;--okbg:#ecfdf3;--bad:#b91c1c;--badbg:#fff1f2;--voice:#6d28d9}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Arial,"Noto Sans TC","Microsoft JhengHei",sans-serif;line-height:1.65}
.wrap{max-width:980px;margin:auto;padding:15px}.hero,.card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:22px;margin:15px 0;box-shadow:0 6px 22px #0f172a0c}
.hero{background:linear-gradient(135deg,#ecfdf5,#fff)}h1{margin:4px 0;font-size:clamp(24px,4vw,36px)}h2,h3{margin-top:0}.muted{color:var(--muted)}.hidden{display:none!important}
.topnav{display:flex;flex-wrap:wrap;gap:8px}.topnav a{padding:6px 12px;border-radius:999px;background:#fff;border:1px solid var(--line);text-decoration:none;color:#115e59;font-weight:800;font-size:14px}.topnav a.on{background:var(--accent);color:#fff;border-color:var(--accent)}
.badge{display:inline-block;padding:3px 10px;border-radius:999px;background:#ccfbf1;color:#115e59;font-weight:800;font-size:13px;margin-right:6px}
.actions{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0}.btn{border:0;border-radius:10px;padding:11px 16px;font:800 16px Arial,"Noto Sans TC",sans-serif;cursor:pointer;background:#e5e7eb;color:var(--ink);text-decoration:none}
.primary{background:var(--accent);color:#fff}.voice{background:var(--voice);color:#fff}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}
.sec-btn{padding:16px;text-align:left;border:2px solid var(--line);border-radius:13px;background:#fff;cursor:pointer;font:inherit}.sec-btn:hover{border-color:var(--accent);background:#f0fdfa}.sec-btn b{display:block;font-size:18px}
.progress{height:10px;background:#e5e7eb;border-radius:999px;overflow:hidden}.bar{height:100%;background:var(--accent);transition:width .2s}.meta{display:flex;justify-content:space-between;flex-wrap:wrap;color:var(--muted);font-weight:800;margin:8px 0 14px}
.question{font-size:19px;font-weight:700;padding:16px;background:#f8fafc;border-radius:12px;line-height:2.1}.question input{font:inherit;font-size:18px;padding:2px 8px;border:2px solid #94a3b8;border-radius:8px;min-width:90px;margin:0 3px;text-align:center}
.question input.right{border-color:var(--ok);background:var(--okbg);color:var(--ok)}.question input.wrong{border-color:var(--bad);background:var(--badbg)}
.options{display:grid;gap:9px;margin:14px 0}.option{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border:2px solid #cbd5e1;border-radius:10px;background:#fff;font:700 17px Arial,"Noto Sans TC",sans-serif;cursor:pointer;text-align:left;color:var(--ink)}
.option .letter{flex:0 0 auto;width:28px;height:28px;border-radius:50%;background:#e2e8f0;display:grid;place-items:center;font-size:14px}.option.correct{border-color:var(--ok);background:var(--okbg)}.option.incorrect{border-color:var(--bad);background:var(--badbg);opacity:.75}
.feedback,.reference{padding:13px;border-radius:10px;font-weight:700;margin:12px 0;white-space:pre-wrap}.feedback.ok{background:var(--okbg);color:var(--ok)}.feedback.bad{background:var(--badbg);color:var(--bad)}.feedback.info{background:#eff6ff;color:#1e3a8a}
.reference{border:2px solid #bbf7d0;background:#f0fdf4;font-weight:600}.hint{padding:11px 13px;border-radius:10px;background:#fffbeb;border:1px solid #fde68a;margin:10px 0;font-weight:700;color:#92400e}
textarea{width:100%;min-height:110px;font:inherit;font-size:17px;padding:12px;border:2px solid #94a3b8;border-radius:10px}
.summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.stat{padding:14px;border:1px solid var(--line);border-radius:11px;background:#fafafa}.stat b{display:block;font-size:28px}
.wrong-card{margin:10px 0;padding:13px;border:1px solid #fecaca;border-radius:11px;background:#fff7f7}
table.study{width:100%;border-collapse:collapse;font-size:15px}table.study th,table.study td{border-bottom:1px solid var(--line);padding:8px 6px;text-align:left;vertical-align:top}table.study th{background:#f0fdfa}
.spk{border:0;background:#ede9fe;color:var(--voice);border-radius:8px;padding:2px 8px;cursor:pointer;font-size:14px}details.studybox summary{cursor:pointer;font-weight:900;font-size:18px}
label.chk{display:inline-flex;gap:8px;align-items:center;font-weight:700}
@media(max-width:620px){.wrap{padding:8px}.hero,.card{padding:15px}.question{font-size:17px}table.study{font-size:13px}}`;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s || '').toLowerCase().replace(/[’‘`]/g, "'").replace(/[.,!?;:"“”]/g, ' ').replace(/\s+/g, ' ').trim();
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const BLANK = /_{3,}(?:\s+_{3,})*/g;
  let voice = null;
  function pickVoice() { const vs = speechSynthesis.getVoices(); voice = vs.find(v => /en-US/i.test(v.lang) && /Samantha|Google US|Jenny|Aria/i.test(v.name)) || vs.find(v => /^en-US/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null; }
  if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(String(text).replace(BLANK, ' ')); u.lang = 'en-US'; u.rate = 0.9; if (voice) u.voice = voice; speechSynthesis.speak(u);
  }
  window.mvSpeak = speak;

  const LABEL = { vocab: '老師精選單字', fet: 'FET 單字', reading: '閱讀理解' };
  const SECTIONS = {
    vocab: [{ id: 'cloze', name: '例句填空', desc: '看例句，拼出正確單字／片語', items: D.vocab, type: 'cloze' }, { id: 'mcq', name: '單字選擇題', desc: '四選一，選出最適合的字', items: D.vocabMcq, type: 'mcq' }],
    fet: [{ id: 'cloze', name: 'FET 例句填空', desc: '看例句，拼出正確單字', items: D.fet, type: 'cloze' }, { id: 'mcq', name: 'FET 單字選擇題', desc: '四選一，選出最適合的字', items: D.fetMcq, type: 'mcq' }],
    reading: [{ id: 'rmcq', name: '閱讀理解選擇題', desc: '文章結構・因果・問題解決・比較', items: D.readingMcq, type: 'mcq' }, { id: 'short', name: '簡答題＋文本證據', desc: '先寫答案，再核對參考答案（自我評分，不計入成績）', items: D.short, type: 'short' }]
  }[PART].filter(s => s.items && s.items.length);

  const app = document.getElementById('app');
  const slugBase = 'kcis-myview-' + D.slug;
  const parts = [['vocab', '老師精選單字'], ...(D.fet && D.fet.length ? [['fet', 'FET 單字']] : []), ['reading', '閱讀理解']];
  document.title = `KCIS My View ${D.grade}｜${D.title}｜${LABEL[PART]}`;

  let queue = [], idx = 0, log = [], current = null;

  function hero(compact) {
    return `<section class="hero"><nav class="topnav"><a href="dashboard.html#primary-kcis-myview">← Dashboard</a>${parts.map(([p, n]) => `<a class="${p === PART ? 'on' : ''}" href="${slugBase}-${p}.html">${n}</a>`).join('')}</nav>
      <p style="margin:12px 0 0"><span class="badge">KCIS My View</span><span class="badge">${esc(D.grade)}</span>${PART === 'fet' && D.fetLabel ? `<span class="badge">${esc(D.fetLabel)}</span>` : ''}</p>
      <h1${compact ? ' style="font-size:clamp(19px,3vw,24px)"' : ''}>${esc(D.title)}｜${LABEL[PART]}</h1>
      <p class="muted${compact ? ' hidden' : ''}">${SECTIONS.map(s => `${s.name} ${s.items.length} 題`).join('｜')}｜即時批改｜答對後整句播放</p></section>`;
  }

  function studyTable() {
    if (PART === 'reading') return '';
    const list = PART === 'fet' ? D.fet : D.vocab;
    return `<section class="card"><details class="studybox"><summary>📖 單字表（${list.length} 個）— 先複習再作答</summary><div style="overflow-x:auto;margin-top:10px"><table class="study"><thead><tr><th>#</th><th>單字</th><th>詞性</th><th>英文解釋</th><th>中文</th></tr></thead><tbody>
      ${list.map((v, i) => `<tr><td>${i + 1}</td><td><b>${esc(v.w)}</b> <button class="spk" onclick="mvSpeak(${esc(JSON.stringify(v.w))})">🔊</button></td><td>${esc(v.pos)}</td><td>${esc(v.en)}</td><td>${esc(v.zh)}</td></tr>`).join('')}
      </tbody></table></div></details></section>`;
  }

  function start() {
    speechSynthesis && speechSynthesis.cancel && speechSynthesis.cancel();
    app.innerHTML = hero() + studyTable() + `<section class="card"><h2>選擇練習範圍</h2><div class="grid">
      ${SECTIONS.map((s, i) => `<button class="sec-btn" data-sec="${i}"><b>${s.name}</b><span class="muted">${s.items.length} 題｜${s.desc}</span></button>`).join('')}
      ${SECTIONS.length > 1 ? `<button class="sec-btn" data-sec="all"><b>全部依序作答</b><span class="muted">${SECTIONS.reduce((n, s) => n + s.items.length, 0)} 題｜${SECTIONS.map(s => s.name).join(' → ')}</span></button>` : ''}
      </div><p><label class="chk"><input type="checkbox" id="shuf"> 題目隨機排序</label></p></section>`;
    app.querySelectorAll('[data-sec]').forEach(b => b.onclick = () => {
      const secs = b.dataset.sec === 'all' ? SECTIONS : [SECTIONS[+b.dataset.sec]];
      const shuf = document.getElementById('shuf').checked;
      queue = []; secs.forEach(s => { const items = s.items.map((it, k) => ({ sec: s, it, num: k + 1 })); queue.push(...(shuf ? shuffle(items) : items)); });
      begin(queue);
    });
  }

  function begin(q) { queue = q; idx = 0; log = []; render(); }

  function shell(inner) {
    const done = log.filter(l => l.scored);
    const right = done.filter(l => l.ok).length;
    app.innerHTML = hero(true) + `<section class="card"><div class="progress"><div class="bar" style="width:${Math.round(idx / queue.length * 100)}%"></div></div>
      <div class="meta"><span>${esc(current.sec.name)}｜第 ${current.num} 題</span><span>進度 ${idx + 1} / ${queue.length}｜答對 ${right}</span></div>${inner}
      <div id="fb"></div><div class="actions"><button class="btn primary hidden" id="next">${idx + 1 < queue.length ? '下一題 →' : '查看結果'}</button><button class="btn" id="quit">結束作答</button></div></section>`;
    document.getElementById('next').onclick = () => { idx++; idx < queue.length ? render() : results(); };
    document.getElementById('quit').onclick = () => results();
  }
  const fb = (cls, html) => { document.getElementById('fb').innerHTML = `<div class="feedback ${cls}">${html}</div>`; };
  const showNext = () => { const n = document.getElementById('next'); n.classList.remove('hidden'); n.focus(); };

  function render() {
    current = queue[idx];
    ({ cloze: renderCloze, mcq: renderMcq, short: renderShort })[current.sec.type](current.it);
  }

  // ---------- cloze ----------
  function splitAns(ans, k) { const w = ans.split(' '); if (k <= 1) return [ans]; const out = w.slice(0, k - 1); out.push(w.slice(k - 1).join(' ')); return out; }
  function renderCloze(v) {
    const groups = v.s.match(BLANK) || [];
    const k = groups.length || 1;
    let i = 0;
    const html = esc(v.s).replace(BLANK, () => { const part = splitAns(v.w, k)[i] || v.w; return `<input data-g="${i++}" autocomplete="off" autocapitalize="off" spellcheck="false" style="width:${Math.max(5, part.length + 3)}ch" aria-label="blank">`; });
    shell(`<div class="question">${html}</div><p class="muted" style="margin:8px 0 0">${esc(v.pos)} ${esc(v.zh)}</p>
      <div class="actions"><button class="btn primary" id="check">檢查答案</button><button class="btn" id="hintb">💡 提示</button><button class="btn voice" id="say">🔊 播放例句</button></div><div id="hint"></div>`);
    const inputs = [...app.querySelectorAll('.question input')];
    let tries = 0, finished = false;
    inputs[0] && inputs[0].focus();
    inputs.forEach(inp => inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); finished ? document.getElementById('next').click() : check(); } }));
    const showHint = () => { document.getElementById('hint').innerHTML = `<div class="hint">💡 ${esc(v.en)}｜${esc(v.zh)}｜第一個字母：<b>${esc(v.w[0])}</b>｜共 ${v.w.length} 個字元</div>`; };
    document.getElementById('hintb').onclick = showHint;
    document.getElementById('say').onclick = () => speak(finished ? fullSentence(v) : v.s);
    document.getElementById('check').onclick = check;
    function check() {
      if (finished) return;
      const vals = inputs.map(x => norm(x.value));
      if (vals.every(x => !x)) { fb('info', '請先輸入答案。'); return; }
      const ok = v.ans.some(a => { const p = splitAns(norm(a), k); return p.every((x, j) => x === vals[j]); });
      tries++;
      if (ok) {
        finished = true; inputs.forEach(x => { x.classList.add('right'); x.readOnly = true; });
        log.push({ ...current, ok: tries === 1, scored: true, answer: v.w });
        fb('ok', `✔ 正確！${tries > 1 ? '（第二次答對，列入錯題複習）' : ''}\n${esc(fullSentence(v, inputs.map(x => x.value)))}${v.szh ? '\n' + esc(v.szh) : ''}`);
        speak(fullSentence(v, inputs.map(x => x.value))); showNext();
      } else if (tries === 1) {
        inputs.forEach(x => x.classList.add('wrong')); showHint(); fb('bad', '✘ 不正確，看看提示再試一次。');
        inputs[0].select();
      } else {
        finished = true; inputs.forEach((x, j) => { x.value = splitAns(v.w, k)[j] || ''; x.classList.remove('wrong'); x.classList.add('right'); x.readOnly = true; });
        log.push({ ...current, ok: false, scored: true, answer: v.w });
        fb('bad', `正確答案：${esc(v.w)}\n${esc(fullSentence(v))}${v.szh ? '\n' + esc(v.szh) : ''}`);
        speak(fullSentence(v)); showNext();
      }
    }
  }
  function fullSentence(v, typed) {
    const groups = v.s.match(BLANK) || []; const parts = typed || splitAns(v.w, groups.length || 1); let i = 0;
    return v.s.replace(BLANK, () => parts[i++] || v.w);
  }

  // ---------- mcq ----------
  function renderMcq(q) {
    const hasBlank = /_{2,}/.test(q.q);
    shell(`<div class="question" style="line-height:1.7">${esc(q.q)}</div><div class="options">${q.o.map((o, i) => `<button class="option" data-i="${i}"><span class="letter">${'ABCD'[i]}</span><span>${esc(o)}</span></button>`).join('')}</div>
      <div class="actions"><button class="btn voice" id="say">🔊 播放題目</button></div>`);
    let wrong = false, done = false;
    const filled = () => hasBlank ? q.q.replace(/_{2,}/, q.o[q.a]) : q.q + ' ' + q.o[q.a];
    document.getElementById('say').onclick = () => speak(done ? filled() : q.q);
    app.querySelectorAll('.option').forEach(b => b.onclick = () => {
      if (done) return;
      const i = +b.dataset.i;
      if (i === q.a) {
        done = true; b.classList.add('correct');
        log.push({ ...current, ok: !wrong, scored: true, answer: `(${'ABCD'[q.a]}) ${q.o[q.a]}` });
        fb('ok', `✔ 正確！答案是 (${'ABCD'[q.a]}) ${esc(q.o[q.a])}${wrong ? '（曾答錯，列入錯題複習）' : ''}${hasBlank ? '\n' + esc(filled()) : ''}`);
        if (hasBlank) speak(filled());
        showNext();
      } else {
        wrong = true; b.classList.add('incorrect'); b.disabled = true; fb('bad', '✘ 不正確，再試一次。');
      }
    });
  }

  // ---------- short answer ----------
  function renderShort(s) {
    shell(`<div class="question" style="line-height:1.7">${s.cer ? '<span class="badge">CER Close Read</span><br>' : ''}${esc(s.q)}</div>
      <p class="muted">${s.cer ? '用 Claim（主張）・Evidence（文本證據：Text evidence to support my claim is, "…"）・Reasoning（This shows that…）作答。' : '寫完整句子，並加上文本證據：The text says, "…"'}</p>
      <textarea id="ta" placeholder="Write your answer here..."></textarea>
      <div class="actions"><button class="btn primary" id="show">核對參考答案</button></div><div id="ref"></div>`);
    document.getElementById('show').onclick = () => {
      const txt = document.getElementById('ta').value.trim();
      if (txt.length < 5) { fb('info', '請先寫下你的答案，再核對參考答案。'); return; }
      document.getElementById('fb').innerHTML = '';
      document.getElementById('ref').innerHTML = `<div class="reference"><b>參考答案</b>\n${esc(s.a)}</div>
        <div class="actions"><button class="btn primary" data-self="1">✔ 我寫到重點了</button><button class="btn" data-self="0">✎ 還需要加強</button><button class="btn voice" id="sayref">🔊 播放參考答案</button></div>`;
      document.getElementById('sayref').onclick = () => speak(s.a);
      document.getElementById('show').disabled = true;
      app.querySelectorAll('[data-self]').forEach(b => b.onclick = () => {
        log.push({ ...current, ok: b.dataset.self === '1', scored: false, answer: s.a, mine: txt });
        app.querySelectorAll('[data-self]').forEach(x => x.disabled = true); showNext();
      });
    };
  }

  // ---------- results ----------
  function results() {
    speechSynthesis && speechSynthesis.cancel && speechSynthesis.cancel();
    const scored = log.filter(l => l.scored), right = scored.filter(l => l.ok).length, wrongs = scored.filter(l => !l.ok);
    const selfs = log.filter(l => !l.scored), selfOk = selfs.filter(l => l.ok).length;
    const label = l => `${l.sec.name} 第 ${l.num} 題`;
    const qtext = l => l.sec.type === 'cloze' ? l.it.s : l.it.q;
    app.innerHTML = hero() + `<section class="card" id="result"><h2>測驗結果</h2><div class="summary">
      <div class="stat">已作答<b>${scored.length}</b>題</div><div class="stat">答對題數<b>${right}</b></div><div class="stat">曾答錯題數<b>${wrongs.length}</b></div>
      <div class="stat">成績<b>${scored.length ? Math.round(right / scored.length * 100) : 0}</b>分</div>${selfs.length ? `<div class="stat">簡答自評<b>${selfOk} / ${selfs.length}</b>寫到重點</div>` : ''}</div>
      <div id="wrongList">${wrongs.length ? '<h3 style="margin-top:18px">錯題複習</h3>' + wrongs.map(l => `<div class="wrong-card"><b>${esc(label(l))}</b><br>${esc(qtext(l))}<br>✔ 正確答案：<b>${esc(l.answer)}</b></div>`).join('') : (scored.length ? '<p class="feedback ok">全部第一次就答對，太棒了！</p>' : '')}</div>
      ${selfs.filter(l => !l.ok).length ? '<h3>簡答題：還需要加強</h3>' + selfs.filter(l => !l.ok).map(l => `<div class="wrong-card"><b>${esc(label(l))}</b><br>${esc(l.it.q)}<br><span class="muted">參考答案：</span>${esc(l.answer)}</div>`).join('') : ''}
      <div class="actions">${wrongs.length || selfs.some(l => !l.ok) ? '<button class="btn primary" id="redo">再做一次錯題</button>' : ''}<button class="btn" id="again">重新開始</button><a class="btn" href="dashboard.html#primary-kcis-myview">回 Dashboard</a></div></section>`;
    const redo = document.getElementById('redo');
    if (redo) redo.onclick = () => begin(log.filter(l => !l.ok).map(({ sec, it, num }) => ({ sec, it, num })));
    document.getElementById('again').onclick = start;
    if (scored.length) {
      const nums = [...new Set(wrongs.map(l => String(l.num)))].join(', ');
      document.dispatchEvent(new CustomEvent('quiz-result-ready', { detail: { total: scored.length, correct: right, wrong: wrongs.length, mistakeQuestionNumbers: nums, responses: scored.map(l => ({ section: l.sec.name, number: l.num, correct: l.ok })) } }));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  start();
})();
