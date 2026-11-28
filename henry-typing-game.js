/* Henry typing trainer + dinosaur shooting reward.
   Data: window.HV_DATA (same JSON as the weekly vocab game). Sentences come from D.paragraphs with the answers filled in.
   Every correctly typed sentence unlocks 60 seconds of the dinosaur game. */
(() => {
  'use strict';
  const D = window.HV_DATA;
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem('henryType:' + D.code + ':' + k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem('henryType:' + D.code + ':' + k, JSON.stringify(v)); } catch (_) { } },
  };
  function speak(t) { try { const u = new SpeechSynthesisUtterance(t); u.lang = 'en-US'; u.rate = .85; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (_) { } }

  // ---------- sentences ----------
  const clean = t => t.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
  const PASSAGES = D.paragraphs.map(p => {
    const full = clean(p.text.replace(/\{(\d+)\}/g, (_, n) => p.answers[n - 1].a));
    const sents = full.replace(/\b(Mr|Mrs|Ms|Dr|St)\. /g, '$1.\u0001').split(/(?<=[.!?]"?)\s+(?=[A-Z"])/).map(s => s.replace(/\u0001/g, ' ').trim()).filter(Boolean);
    return { title: p.title, sents };
  });

  // ---------- keyboard guide ----------
  const ROWS = [
    ['`1234567890-=', '~!@#$%^&*()_+'],
    ['qwertyuiop[]\\', 'QWERTYUIOP{}|'],
    ["asdfghjkl;'", 'ASDFGHJKL:"'],
    ['zxcvbnm,./', 'ZXCVBNM<>?'],
  ];
  // finger per column, per row (0 L-pinky ... 3 L-index, 4 R-index ... 7 R-pinky)
  const FING = [
    [0, 0, 1, 2, 3, 3, 4, 4, 5, 6, 7, 7, 7],
    [0, 1, 2, 3, 3, 4, 4, 5, 6, 7, 7, 7, 7],
    [0, 1, 2, 3, 3, 4, 4, 5, 6, 7, 7],
    [0, 1, 2, 3, 3, 4, 4, 5, 6, 7],
  ];
  const FNAME = ['左手小指', '左手無名指', '左手中指', '左手食指', '右手食指', '右手中指', '右手無名指', '右手小指'];
  const FCOL = ['#fca5a5', '#fdba74', '#fde047', '#86efac', '#86efac', '#fde047', '#fdba74', '#fca5a5'];
  function keyInfo(ch) {
    if (ch === ' ') return { id: 'space', finger: '大拇指', shift: false };
    for (let r = 0; r < ROWS.length; r++) for (let s = 0; s < 2; s++) {
      const c = ROWS[r][s].indexOf(ch);
      if (c >= 0) { const f = FING[r][c]; return { id: `k${r}-${c}`, finger: FNAME[f], shift: s === 1, side: f < 4 ? 'L' : 'R' }; }
    }
    return null;
  }

  // ---------- styles ----------
  const st = document.createElement('style');
  st.textContent = `
.tw-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between}
.tw-stats{display:flex;gap:10px;flex-wrap:wrap}.tw-stat{background:#f1f5f9;border-radius:10px;padding:6px 12px;font-weight:800}.tw-stat b{color:#1e3a8a;font-size:20px}
.tw-target{font:600 26px/1.7 "Courier New",Consolas,monospace;background:#fff;border:2px solid #d7e0eb;border-radius:14px;padding:16px 18px;margin:12px 0;word-break:break-word;letter-spacing:.5px;cursor:text}
.tw-target span{border-radius:4px}.tw-target .ok{color:#15803d}.tw-target .cur{background:#fde047;border-bottom:3px solid #1e3a8a}.tw-target .todo{color:#64748b}
.tw-target .sp.cur{padding:0 6px}.tw-target.shake{animation:twshake .25s}.tw-target .bad{background:#fecaca;color:#b91c1c}
@keyframes twshake{0%,100%{transform:none}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
.tw-input{position:absolute;opacity:0;width:1px;height:1px;left:-9999px}
.tw-tip{font-weight:800;color:#9a3412;min-height:1.6em}
.tw-kb{user-select:none;margin-top:10px}.tw-kr{display:flex;gap:5px;margin:5px 0}.tw-k{flex:0 0 auto;min-width:42px;height:42px;border-radius:8px;border:1px solid #cbd5e1;display:flex;align-items:center;justify-content:center;font:700 15px Arial,sans-serif;color:#1e293b;opacity:.75}
.tw-k.on{outline:4px solid #1e3a8a;opacity:1;transform:translateY(-2px);box-shadow:0 4px 10px #1e3a8a55}.tw-k.home{text-decoration:underline}
.tw-legend{display:flex;gap:8px;flex-wrap:wrap;font-size:13px;color:#475569;margin-top:6px}.tw-legend i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:3px;vertical-align:-1px}
.tw-done{text-align:center;padding:10px}.tw-stars{font-size:40px;letter-spacing:6px}
.tw-unlock{display:inline-block;margin:10px 0;padding:14px 22px;border:0;border-radius:14px;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;font:900 20px Arial,"Noto Sans TC",sans-serif;cursor:pointer;box-shadow:0 6px 16px #15803d55}
.tw-pick{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}
.tw-pick button{border:2px solid #d7e0eb;border-radius:14px;padding:16px;text-align:left;background:#fff;cursor:pointer;font:inherit}.tw-pick button:hover{border-color:#60a5fa;background:#eff6ff}
.tw-pick b{display:block;font-size:19px;color:#1e3a8a}.tw-dots{margin:8px 0;display:flex;gap:4px;flex-wrap:wrap}.tw-dots i{width:14px;height:14px;border-radius:50%;background:#e2e8f0}.tw-dots i.d{background:#22c55e}.tw-dots i.c{background:#fde047;outline:2px solid #1e3a8a}
#dino-wrap{position:fixed;inset:0;z-index:9000;background:#0f172acc;display:flex;align-items:center;justify-content:center;padding:10px}
#dino-box{background:#fff;border-radius:18px;padding:12px;max-width:960px;width:100%;box-shadow:0 20px 50px #0008}
#dino-cv{width:100%;height:auto;display:block;border-radius:12px;cursor:crosshair;touch-action:none;background:#bae6fd}
.dino-bar{height:10px;background:#e2e8f0;border-radius:99px;overflow:hidden;margin:8px 0}.dino-bar i{display:block;height:100%;background:linear-gradient(90deg,#22c55e,#facc15,#ef4444);width:100%}
@media(max-width:700px){.tw-target{font-size:20px}.tw-k{min-width:24px;height:32px;font-size:11px}.tw-kb{overflow-x:auto}}`;
  document.head.appendChild(st);

  // ---------- state ----------
  let pIdx = 0, sIdx = 0, typed = '', errs = 0, t0 = 0, tick = null;
  const area = $('#tw-area');
  const doneKey = (p, s) => `done-${p}-${s}`;

  function home() {
    stopTick();
    $('#tw-title').textContent = `Henry 打字練習 ${D.code}`;
    area.innerHTML = `<h2>選一篇文章開始打字</h2>
      <p class="note">每打完一個完整句子，就能玩 <b>1 分鐘恐龍射擊</b> 🦖！大小寫、標點都要打對喔。</p>
      <div class="tw-pick">${PASSAGES.map((p, i) => {
        const nDone = p.sents.filter((_, j) => store.get(doneKey(i, j), null)).length;
        return `<button type="button" data-p="${i}"><b>${esc(p.title)}</b>${p.sents.length} 句｜已完成 ${nDone} 句
          <div class="tw-dots">${p.sents.map((_, j) => `<i class="${store.get(doneKey(i, j), null) ? 'd' : ''}"></i>`).join('')}</div></button>`;
      }).join('')}</div>
      <p class="note" style="margin-top:14px">🦖 恐龍最高分：<b>${store.get('dinoBest', 0)}</b></p>`;
    area.querySelectorAll('[data-p]').forEach(b => b.onclick = () => {
      pIdx = +b.dataset.p; const sents = PASSAGES[pIdx].sents;
      sIdx = Math.max(0, sents.findIndex((_, j) => !store.get(doneKey(pIdx, j), null))); startSentence();
    });
  }

  function startSentence() {
    stopTick(); typed = ''; errs = 0; t0 = 0;
    const P = PASSAGES[pIdx], target = P.sents[sIdx];
    area.innerHTML = `<div class="tw-row"><h2 style="margin:0">${esc(P.title)}　<span class="note">第 ${sIdx + 1} / ${P.sents.length} 句</span></h2>
        <button type="button" class="btn" id="tw-say">🔊 聽句子</button></div>
      <div class="tw-dots">${P.sents.map((_, j) => `<i class="${j === sIdx ? 'c' : store.get(doneKey(pIdx, j), null) ? 'd' : ''}"></i>`).join('')}</div>
      <div class="tw-stats"><span class="tw-stat">⏱ <b id="tw-time">0.0</b> 秒</span><span class="tw-stat">✘ 打錯 <b id="tw-err">0</b></span><span class="tw-stat">🏁 最快 <b>${fmtBest(store.get(`best-${pIdx}-${sIdx}`, null))}</b></span></div>
      <div class="tw-target" id="tw-target"></div>
      <div class="tw-tip" id="tw-tip"></div>
      <input id="tw-in" class="tw-input" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="typing box">
      <div class="tw-kb" id="tw-kb"></div>
      <div class="tw-legend">${['左小指', '左無名指', '左中指', '食指', '右中指', '右無名指', '右小指'].map((n, i) => `<span><i style="background:${[FCOL[0], FCOL[1], FCOL[2], FCOL[3], FCOL[5], FCOL[6], FCOL[7]][i]}"></i>${n}</span>`).join('')}<span>　空白鍵用大拇指；底線的 F、J 是食指的家</span></div>
      <div class="actions"><button type="button" class="btn" id="tw-home">← 選文章</button><button type="button" class="btn" id="tw-skip">跳過這句 →</button></div>`;
    buildKb();
    const inp = $('#tw-in');
    const focus = () => { try { inp.focus({ preventScroll: true }); } catch (_) { } };
    $('#tw-target').onclick = focus; focus();
    $('#tw-say').onclick = () => { speak(target); focus(); };
    $('#tw-home').onclick = home;
    $('#tw-skip').onclick = () => nextSentence();
    inp.addEventListener('paste', e => e.preventDefault());
    inp.addEventListener('keydown', e => {
      if (e.key === 'Tab' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.length === 1) { e.preventDefault(); typeChar(e.key); }
      else if (e.key === 'Backspace') e.preventDefault();
    });
    inp.addEventListener('input', () => { const v = inp.value; inp.value = ''; for (const ch of v) typeChar(ch); });
    render();
  }

  function typeChar(ch) {
    const target = PASSAGES[pIdx].sents[sIdx];
    if (typed.length >= target.length) return;
    if (!t0) { t0 = performance.now(); tick = setInterval(showTime, 100); }
    const want = target[typed.length];
    if (ch === want || (want === ' ' && ch === ' ')) { typed += want; render(); }
    else {
      errs++; $('#tw-err').textContent = errs; render(true);
      const tg = $('#tw-target'); tg.classList.remove('shake'); void tg.offsetWidth; tg.classList.add('shake');
      const wantName = want === ' ' ? '空白鍵' : `「${want}」`;
      const inf = keyInfo(want);
      $('#tw-tip').textContent = `要打 ${wantName}${inf && inf.shift ? `（按住${inf.side === 'L' ? '右' : '左'}手 Shift）` : ''}，你打了「${ch === ' ' ? '空白' : ch}」`;
    }
    if (typed.length === target.length) finish();
  }

  function render(bad) {
    const target = PASSAGES[pIdx].sents[sIdx], n = typed.length;
    $('#tw-target').innerHTML = [...target].map((c, i) => {
      const cls = i < n ? 'ok' : i === n ? 'cur' + (bad ? ' bad' : '') : 'todo';
      return `<span class="${cls}${c === ' ' ? ' sp' : ''}">${c === ' ' ? (i === n ? '␣' : ' ') : esc(c)}</span>`;
    }).join('');
    if (!bad) {
      const want = target[n];
      if (want) { const inf = keyInfo(want); $('#tw-tip').textContent = inf ? `下一個：${want === ' ' ? '空白鍵' : want}　→ ${inf.finger}${inf.shift ? `＋${inf.side === 'L' ? '右' : '左'}手小指按 Shift` : ''}` : ''; }
    }
    highlightKey(target[n]);
  }

  function buildKb() {
    const kb = $('#tw-kb');
    kb.innerHTML = ROWS.map((r, ri) => `<div class="tw-kr" style="padding-left:${[0, 22, 34, 56][ri]}px">${ri === 3 ? '<div class="tw-k" data-k="shiftL" style="min-width:70px;background:#fca5a5">Shift</div>' : ''}${[...r[0]].map((c, ci) => `<div class="tw-k${'fj'.includes(c) ? ' home' : ''}" data-k="k${ri}-${ci}" style="background:${FCOL[FING[ri][ci]]}">${esc(c.toUpperCase())}</div>`).join('')}${ri === 3 ? '<div class="tw-k" data-k="shiftR" style="min-width:70px;background:#fca5a5">Shift</div>' : ''}</div>`).join('') +
      `<div class="tw-kr" style="justify-content:center"><div class="tw-k" data-k="space" style="min-width:300px;background:#c4b5fd">space</div></div>`;
  }
  function highlightKey(ch) {
    document.querySelectorAll('.tw-k.on').forEach(k => k.classList.remove('on'));
    if (ch == null) return; const inf = keyInfo(ch); if (!inf) return;
    const k = document.querySelector(`.tw-k[data-k="${inf.id}"]`); if (k) k.classList.add('on');
    if (inf.shift) { const s = document.querySelector(`.tw-k[data-k="${inf.side === 'L' ? 'shiftR' : 'shiftL'}"]`); if (s) s.classList.add('on'); }
  }

  const elapsed = () => t0 ? (performance.now() - t0) / 1000 : 0;
  function showTime() { const el = $('#tw-time'); if (el) el.textContent = elapsed().toFixed(1); }
  function stopTick() { if (tick) clearInterval(tick); tick = null; }
  const fmtBest = b => b ? `${b.sec.toFixed(1)} 秒` : '—';

  function finish() {
    stopTick(); highlightKey(null);
    const target = PASSAGES[pIdx].sents[sIdx];
    const sec = Math.max(elapsed(), 0.1), words = target.length / 5, wpm = Math.round(words / (sec / 60));
    const acc = Math.round(target.length / (target.length + errs) * 100);
    const bestKey = `best-${pIdx}-${sIdx}`, prev = store.get(bestKey, null);
    const isBest = !prev || sec < prev.sec;
    if (isBest) store.set(bestKey, { sec, wpm, acc });
    store.set(doneKey(pIdx, sIdx), true);
    const stars = 1 + (acc >= 90 ? 1 : 0) + (acc >= 97 && (isBest || wpm >= 15) ? 1 : 0);
    speak(target);
    area.innerHTML = `<div class="tw-done"><div class="tw-stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
      <h2>打完了！${isBest && prev ? '🏆 新紀錄！' : ''}</h2>
      <p style="font:600 20px/1.6 'Courier New',monospace">${esc(target)}</p>
      <div class="tw-stats" style="justify-content:center"><span class="tw-stat">⏱ <b>${sec.toFixed(1)}</b> 秒</span><span class="tw-stat">⚡ <b>${wpm}</b> 字/分鐘</span><span class="tw-stat">🎯 正確率 <b>${acc}%</b></span><span class="tw-stat">✘ 打錯 <b>${errs}</b></span></div>
      <button type="button" class="tw-unlock" id="tw-play">🦖 解鎖！玩 1 分鐘恐龍射擊</button><br>
      <button type="button" class="btn" id="tw-again">再打一次這句</button> <button type="button" class="btn" id="tw-next">先不玩，下一句 →</button></div>`;
    $('#tw-play').onclick = () => dinoGame(nextSentence);
    $('#tw-again').onclick = startSentence;
    $('#tw-next').onclick = nextSentence;
    $('#tw-play').focus();
  }

  function nextSentence() {
    const P = PASSAGES[pIdx];
    if (sIdx < P.sents.length - 1) { sIdx++; return startSentence(); }
    area.innerHTML = `<div class="tw-done"><div class="tw-stars">🎉</div><h2>整篇「${esc(P.title)}」打完了！</h2>
      <p>${P.sents.map(esc).join(' ')}</p><button type="button" class="btn primary" id="tw-h">選下一篇 →</button></div>`;
    $('#tw-h').onclick = home;
  }

  // ---------- dinosaur shooting (60 s) ----------
  function dinoGame(onEnd) {
    const W = 900, H = 460, GROUND = 400, DUR = 60;
    const wrap = document.createElement('div'); wrap.id = 'dino-wrap';
    wrap.innerHTML = `<div id="dino-box"><div class="tw-row"><b style="font-size:20px">🦖 恐龍射擊</b><span class="tw-stats"><span class="tw-stat">分數 <b id="d-score">0</b></span><span class="tw-stat">⏱ <b id="d-time">60</b></span><span class="tw-stat">🏆 <b>${store.get('dinoBest', 0)}</b></span></span></div>
      <div class="dino-bar"><i id="d-bar"></i></div><canvas id="dino-cv" width="${W}" height="${H}"></canvas>
      <p class="note" style="margin:6px 0 0">點恐龍射擊！小恐龍跑得快，分數比較高。別讓恐龍跑到城牆！</p></div>`;
    document.body.appendChild(wrap);
    const cv = $('#dino-cv'), ctx = cv.getContext('2d');
    let dinos = [], parts = [], shots = [], score = 0, spawnT = 0, last = performance.now(), start = last, run = true, raf;
    let AC = null; try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { }
    const beep = (f, d, type = 'square', v = .06) => { if (!AC) return; const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.value = f; g.gain.value = v; o.connect(g); g.connect(AC.destination); o.start(); g.gain.exponentialRampToValueAtTime(.0001, AC.currentTime + d); o.stop(AC.currentTime + d); };
    const TYPES = [
      { e: '🦖', size: 64, speed: 70, pts: 10, hp: 2 },
      { e: '🦕', size: 72, speed: 50, pts: 10, hp: 3 },
      { e: '🦖', size: 40, speed: 140, pts: 25, hp: 1 },
      { e: '🐊', size: 46, speed: 110, pts: 15, hp: 1 },
    ];
    function spawn(prog) {
      const t = TYPES[Math.random() < .15 + prog * .25 ? 2 : Math.floor(Math.random() * 4)];
      const fly = Math.random() < .25;
      dinos.push({ ...t, x: W + 40, y: fly ? 90 + Math.random() * 160 : GROUND - t.size * .35, vy: 0, fly, speed: t.speed * (1 + prog * .9), maxhp: t.hp, bob: Math.random() * 6, hit: 0 });
    }
    function shoot(px, py) {
      if (!run) return;
      shots.push({ x: px, y: py, t: 0 }); beep(880, .08);
      let hit = false;
      for (let i = dinos.length - 1; i >= 0; i--) {
        const d = dinos[i];
        if (Math.hypot(px - d.x, py - (d.y - d.size * .35)) < d.size * .6) {
          hit = true; d.hp--; d.hit = .15;
          if (d.hp <= 0) {
            score += d.pts; dinos.splice(i, 1); beep(220, .25, 'sawtooth', .08);
            for (let k = 0; k < 16; k++) parts.push({ x: px, y: py, vx: (Math.random() - .5) * 420, vy: (Math.random() - .8) * 380, life: .7, c: ['#f97316', '#facc15', '#ef4444', '#84cc16'][k % 4] });
            parts.push({ x: d.x, y: d.y - d.size, vx: 0, vy: -60, life: 1, txt: '+' + d.pts });
          }
          break;
        }
      }
      if (!hit) parts.push({ x: px, y: py, vx: 0, vy: 0, life: .3, c: '#64748b' });
    }
    cv.addEventListener('pointerdown', e => {
      e.preventDefault(); const r = cv.getBoundingClientRect();
      shoot((e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height);
    });
    function loop(now) {
      if (!run) return;
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      const t = (now - start) / 1000, left = Math.max(0, DUR - t), prog = Math.min(1, t / DUR);
      spawnT -= dt; if (spawnT <= 0) { spawn(prog); spawnT = 1.2 - prog * .75 + Math.random() * .4; }
      dinos.forEach(d => { d.x -= d.speed * dt; d.bob += dt * 10; d.hit = Math.max(0, d.hit - dt); });
      dinos = dinos.filter(d => { if (d.x < 70) { score = Math.max(0, score - 5); parts.push({ x: 90, y: d.y - 40, vx: 0, vy: -50, life: 1, txt: '-5', c: '#dc2626' }); beep(120, .2, 'triangle', .1); return false; } return true; });
      parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; if (!p.txt) p.vy += 600 * dt; p.life -= dt; }); parts = parts.filter(p => p.life > 0);
      shots.forEach(s => s.t += dt); shots = shots.filter(s => s.t < .12);
      // draw
      const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#7dd3fc'); sky.addColorStop(1, '#e0f2fe'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(800, 70, 34, 0, 7); ctx.fill();
      ctx.fillStyle = '#a3a3a3'; [[200, 260], [430, 230], [650, 270]].forEach(([x, h]) => { ctx.beginPath(); ctx.moveTo(x - 140, GROUND); ctx.lineTo(x, GROUND - h + 100); ctx.lineTo(x + 140, GROUND); ctx.fill(); });
      ctx.fillStyle = '#65a30d'; ctx.fillRect(0, GROUND, W, H - GROUND); ctx.fillStyle = '#4d7c0f'; ctx.fillRect(0, GROUND, W, 6);
      ctx.fillStyle = '#78716c'; ctx.fillRect(20, GROUND - 120, 50, 120); ctx.fillStyle = '#57534e'; for (let i = 0; i < 3; i++) ctx.fillRect(20 + i * 18, GROUND - 134, 12, 14);
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      dinos.forEach(d => {
        ctx.save(); ctx.translate(d.x, d.y + (d.fly ? Math.sin(d.bob) * 8 : Math.abs(Math.sin(d.bob)) * -4));
        ctx.scale(-1, 1); ctx.globalAlpha = d.hit ? .5 : 1; ctx.font = `${d.size}px serif`; ctx.fillText(d.e, 0, 0); ctx.restore();
        if (d.maxhp > 1) { ctx.fillStyle = '#0003'; ctx.fillRect(d.x - 20, d.y - d.size - 4, 40, 5); ctx.fillStyle = '#22c55e'; ctx.fillRect(d.x - 20, d.y - d.size - 4, 40 * d.hp / d.maxhp, 5); }
      });
      shots.forEach(s => { ctx.strokeStyle = `rgba(239,68,68,${1 - s.t / .12})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(60, GROUND - 120); ctx.lineTo(s.x, s.y); ctx.stroke(); ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(s.x, s.y, 10, 0, 7); ctx.fill(); });
      parts.forEach(p => { ctx.globalAlpha = Math.max(0, p.life); if (p.txt) { ctx.fillStyle = p.c || '#1e3a8a'; ctx.font = 'bold 26px Arial'; ctx.fillText(p.txt, p.x, p.y); } else { ctx.fillStyle = p.c; ctx.fillRect(p.x - 4, p.y - 4, 8, 8); } ctx.globalAlpha = 1; });
      $('#d-score').textContent = score; $('#d-time').textContent = Math.ceil(left); $('#d-bar').style.width = (left / DUR * 100) + '%';
      if (left <= 0) return end();
      raf = requestAnimationFrame(loop);
    }
    function end() {
      run = false; cancelAnimationFrame(raf);
      const best = store.get('dinoBest', 0), nb = score > best; if (nb) store.set('dinoBest', score);
      $('#dino-box').insertAdjacentHTML('beforeend', `<div class="tw-done"><h2>時間到！得分 ${score} ${nb ? '🏆 新紀錄！' : ''}</h2><button type="button" class="tw-unlock" id="d-back">回去打下一句 ⌨️</button></div>`);
      $('#d-back').onclick = () => { try { AC && AC.close(); } catch (_) { } wrap.remove(); onEnd(); };
      $('#d-back').focus();
    }
    raf = requestAnimationFrame(loop);
  }

  home();
})();
