/* reward-games.js — 每答對 5 題解鎖一次一分鐘小遊戲（翻牌比大小・井字遊戲・打地鼠三態・彈弓砸塔）。
   Drop-in: <script src="/high-school-blank-translation-quiz/reward-games.js?v=..." defer></script>
   Detects correct answers automatically (.feedback.ok, .q.right, .option-btn.correct without .incorrect).
   Pages can also call window.RewardGames.correct(). Games ported from verb-forms-arcade.html. */
(() => {
  'use strict';
  if (window.RewardGames) return;
  const EVERY = 5;
  const GAMES = [
    { id: 'cards', name: '翻牌比大小', desc: '記住最高分的牌，洗牌後猜它在哪' },
    { id: 'ttt', name: '井字遊戲', desc: '玩家 vs 電腦，或兩人輪流｜60 秒' },
    { id: 'moles', name: '打地鼠三態', desc: '40 秒內只敲正確的過去式' },
    { id: 'sling', name: '彈弓砸塔', desc: '拉彈弓打下木塔上的星星｜60 秒' },
  ];
  // base, past, wrong forms (for moles)
  const VERBS = [['go', 'went', 'goed', 'gone'], ['eat', 'ate', 'eated', 'eaten'], ['see', 'saw', 'seed', 'seen'], ['buy', 'bought', 'buyed', 'brought'], ['bring', 'brought', 'bringed', 'brang'],
    ['think', 'thought', 'thinked', 'thank'], ['teach', 'taught', 'teached', 'thought'], ['catch', 'caught', 'catched'], ['write', 'wrote', 'writed', 'written'], ['take', 'took', 'taked', 'taken'],
    ['make', 'made', 'maked'], ['come', 'came', 'comed'], ['run', 'ran', 'runned'], ['swim', 'swam', 'swimmed', 'swum'], ['sing', 'sang', 'singed', 'sung'], ['drink', 'drank', 'drinked', 'drunk'],
    ['give', 'gave', 'gived', 'given'], ['sit', 'sat', 'sitted'], ['feel', 'felt', 'feeled'], ['keep', 'kept', 'keeped'], ['sleep', 'slept', 'sleeped'], ['leave', 'left', 'leaved'],
    ['fly', 'flew', 'flied', 'flown'], ['know', 'knew', 'knowed', 'known'], ['grow', 'grew', 'growed', 'grown'], ['draw', 'drew', 'drawed', 'drawn'], ['hang', 'hung', 'hanged up'],
    ['cut', 'cut', 'cutted'], ['put', 'put', 'putted'], ['hit', 'hit', 'hitted'], ['read', 'read', 'readed'], ['burst', 'burst', 'bursted'],
    ['study', 'studied', 'studyed'], ['cry', 'cried', 'cryed'], ['carry', 'carried', 'carryed'], ['play', 'played', 'plaied'], ['stay', 'stayed', 'staied'],
    ['stop', 'stopped', 'stoped'], ['plan', 'planned', 'planed'], ['shop', 'shopped', 'shoped'], ['drop', 'dropped', 'droped'], ['hope', 'hoped', 'hopeed'], ['dance', 'danced', 'danceed'],
    ['visit', 'visited', 'visitted'], ['open', 'opened', 'openned'], ['travel', 'traveled', 'travelt'], ['despise', 'despised', 'despiseed'], ['deny', 'denied', 'denyed'], ['rely', 'relied', 'relyed'],
    ['adapt', 'adapted', 'adaptted'], ['surrender', 'surrendered', 'surrenderd'], ['devise', 'devised', 'deviseed'], ['taunt', 'taunted', 'tauntted'], ['spare', 'spared', 'spareed']];

  const R = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const chance = p => Math.random() < p;

  // ---------- styles (all prefixed rg- so host pages are untouched) ----------
  const css = `
#rg-overlay{--felt:#0f5747;--felt-deep:#0a3f34;--gold:#f2b632;--coral:#e2574c;--mint:#1f9d6b;--display:"Lilita One","Arial Rounded MT Bold","Microsoft JhengHei",sans-serif;
position:fixed;inset:0;z-index:2147483000;background:rgba(6,32,26,.82);display:grid;place-items:center;overflow:auto;font-family:"Nunito","Noto Sans TC","Microsoft JhengHei",Arial,sans-serif;line-height:1.5;
padding:max(16px,env(safe-area-inset-top,0px)) max(16px,env(safe-area-inset-right,0px)) max(16px,env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px))}
#rg-overlay[hidden]{display:none!important}
#rg-overlay *{box-sizing:border-box}
.rg-arena{width:min(800px,100%);background:radial-gradient(130% 120% at 50% 0%,#17725d,var(--felt-deep));border:3px solid var(--gold);border-radius:22px;color:#fff;padding:20px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.4)}
.rg-arena h3{margin:0;font-family:var(--display);font-weight:400;font-size:clamp(26px,5vw,36px);color:var(--gold);letter-spacing:.5px}
.rg-arena p{margin:6px 0 12px;color:#dcefe8;font-weight:800}
.rg-result{font-family:var(--display);font-weight:400;font-size:28px;color:var(--gold);min-height:40px;margin-top:10px}
.rg-btn{display:inline-block;border:0;border-radius:12px;padding:11px 20px;margin:10px 5px 0;font:800 17px inherit;cursor:pointer;background:var(--gold);color:#3a2a00;font-family:inherit}
.rg-btn.ghost{background:rgba(255,255,255,.16);color:#fff}
.rg-btn:focus-visible,.rg-pick:focus-visible{outline:3px solid #fff;outline-offset:2px}
.rg-mini{border:1px solid rgba(255,255,255,.5);background:transparent;color:#fff;border-radius:999px;padding:5px 12px;font:800 14px inherit;font-family:inherit;cursor:pointer}
.rg-picks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:14px}
.rg-pick{border:2px solid rgba(255,255,255,.35);border-radius:16px;background:rgba(255,255,255,.08);color:#fff;padding:16px;cursor:pointer;text-align:left;font-family:inherit}
.rg-pick:hover{border-color:var(--gold);background:rgba(242,182,50,.14)}
.rg-pick b{display:block;font-family:var(--display);font-weight:400;font-size:24px;color:var(--gold)}
.rg-pick span{color:#dcefe8;font-weight:700;font-size:14px}
.rg-table{position:relative;height:190px;margin:10px auto 0;max-width:640px}
.rg-card{position:absolute;top:10px;width:18%;max-width:110px;aspect-ratio:2.5/3.5;perspective:800px;cursor:default;border:0;padding:0;background:transparent;transition:left .32s cubic-bezier(.5,0,.3,1)}
.rg-card .in{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .45s}
.rg-card.down .in{transform:rotateY(180deg)}
.rg-card .f,.rg-card .b{position:absolute;inset:0;border-radius:12px;backface-visibility:hidden;display:grid;place-items:center}
.rg-card .f{background:#fffdf7;color:var(--felt-deep);border:3px solid var(--gold);font-family:var(--display);font-size:clamp(24px,5vw,38px)}
.rg-card .f.top{background:var(--gold);color:#3a2a00}
.rg-card .b{transform:rotateY(180deg);background:repeating-linear-gradient(45deg,#c8453b 0 8px,#b23a31 8px 16px);border:3px solid #fff}
.rg-card .b::after{content:"?";font-family:var(--display);font-size:34px;color:#fff}
.rg-card.pickable{cursor:pointer}.rg-card.pickable:hover .in{transform:rotateY(180deg) translateY(-6px)}
.rg-card.picked{outline:4px solid var(--gold);border-radius:14px}
.rg-ttt{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:min(300px,80vw);margin:12px auto 0}
.rg-cell{aspect-ratio:1;border:0;border-radius:14px;background:#fffdf7;font-family:var(--display);font-size:clamp(40px,12vw,64px);line-height:1;cursor:pointer;color:var(--felt-deep);padding:0}
.rg-cell:hover:not(:disabled){background:#fff3d6}.rg-cell.x{color:#2f6fd6}.rg-cell.o{color:#e2574c}.rg-cell.win{background:var(--gold)}.rg-cell:disabled{cursor:default}
.rg-tally{margin-top:8px;font-weight:800;color:#dcefe8}.rg-tally b{font-family:var(--display);font-weight:400;font-size:24px;color:var(--gold)}
.rg-sling{margin:10px auto 0;max-width:760px;border-radius:14px;overflow:hidden;border:2px solid rgba(255,255,255,.4)}
.rg-sling canvas{display:block;width:100%;height:auto;aspect-ratio:760/400;touch-action:none;cursor:grab}
.rg-moles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;max-width:560px;margin:8px auto 0}
.rg-hole{position:relative;aspect-ratio:1.6;border-radius:50%/40%;background:radial-gradient(ellipse at 50% 70%,#06261f 0 55%,#0b3a30 56%);overflow:hidden}
.rg-mole{position:absolute;left:6%;right:6%;bottom:-100%;height:78%;border:0;border-radius:40% 40% 12% 12%;background:#d9a066;color:#3b220b;font-weight:900;font-size:clamp(12px,2.6vw,16px);line-height:1.2;padding:4px;cursor:pointer;transition:bottom .18s;overflow-wrap:anywhere;font-family:inherit}
.rg-mole.up{bottom:6%}.rg-mole.hitok{background:var(--mint);color:#fff}.rg-mole.hitbad{background:var(--coral);color:#fff}
.rg-timer{height:10px;border-radius:999px;background:rgba(255,255,255,.18);overflow:hidden;max-width:560px;margin:8px auto 0}
.rg-timer i{display:block;height:100%;background:var(--gold);width:100%}
.rg-hidden{display:none!important}
#rg-badge{position:fixed;z-index:2147482999;right:max(14px,env(safe-area-inset-right,0px));bottom:max(14px,env(safe-area-inset-bottom,0px));display:flex;align-items:center;gap:8px;
border:2px solid #f2b632;border-radius:999px;background:#0f5747;color:#fff;padding:7px 14px 7px 10px;font:800 15px "Nunito","Noto Sans TC","Microsoft JhengHei",Arial,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.25);cursor:default}
#rg-badge .pips{display:flex;gap:4px}#rg-badge .pip{width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,.25)}#rg-badge .pip.on{background:#f2b632}
#rg-badge.ready{cursor:pointer;background:#f2b632;color:#3a2a00;animation:rgpulse 1.1s ease-in-out infinite}
#rg-badge.ready .pip{background:#3a2a00}
@keyframes rgpulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
@media (max-width:620px){.rg-table{height:150px}.rg-picks{grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce){#rg-overlay *,#rg-badge{transition-duration:.01ms!important;animation:none!important}}`;

  let overlay, arena, badge, count = 0, tickets = 0, points = 0, lastGame = '';
  let timers = [], TOKEN = 0;
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
  const every = (fn, ms) => { const t = setInterval(fn, ms); timers.push(t); return t; };
  const q = s => arena.querySelector(s);
  const open = () => overlay && !overlay.hidden;

  function mount() {
    if (overlay) return;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    overlay = document.createElement('div'); overlay.id = 'rg-overlay'; overlay.hidden = true;
    overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-labelledby', 'rg-title');
    arena = document.createElement('div'); arena.className = 'rg-arena'; overlay.appendChild(arena);
    badge = document.createElement('button'); badge.id = 'rg-badge'; badge.type = 'button';
    badge.addEventListener('click', () => { if (tickets > 0 && !open()) picker(); });
    document.body.appendChild(overlay); document.body.appendChild(badge);
    renderBadge();
  }
  function renderBadge() {
    if (!badge) return;
    const pips = Array.from({ length: EVERY }, (_, i) => `<i class="pip${i < count % EVERY || tickets ? ' on' : ''}"></i>`).join('');
    badge.classList.toggle('ready', tickets > 0);
    badge.innerHTML = tickets > 0 ? `🎮 小遊戲解鎖！點我玩${tickets > 1 ? ` ×${tickets}` : ''}` : `<span class="pips">${pips}</span><span>再答對 ${EVERY - count % EVERY} 題玩小遊戲${points ? `｜${points} 分` : ''}</span>`;
    badge.setAttribute('aria-label', tickets > 0 ? '小遊戲已解鎖，點擊開始' : `再答對 ${EVERY - count % EVERY} 題解鎖小遊戲`);
  }
  function correct() {
    mount(); count++;
    if (count % EVERY === 0) tickets++;
    renderBadge();
  }
  function close() {
    TOKEN++; timers.forEach(t => { clearTimeout(t); clearInterval(t); }); timers = [];
    overlay.hidden = true; arena.innerHTML = ''; renderBadge();
  }
  function picker() {
    overlay.hidden = false;
    arena.innerHTML = `<h3 id="rg-title">選一個小遊戲！</h3><p>你已經答對 ${count} 題。選一個一分鐘小遊戲，玩完再回來繼續作答。</p>
      <div class="rg-picks">${GAMES.map(g => `<button class="rg-pick" type="button" data-g="${g.id}"><b>${g.name}</b><span>${g.desc}</span></button>`).join('')}</div>
      <button class="rg-btn ghost" type="button" id="rg-later">等一下再玩</button>`;
    arena.querySelectorAll('.rg-pick').forEach(b => b.onclick = () => { tickets--; lastGame = b.dataset.g; ({ cards: gameCards, ttt: gameTTT, moles: gameMoles, sling: gameSling })[b.dataset.g](); });
    q('#rg-later').onclick = close;
    arena.querySelector('.rg-pick').focus();
  }
  function award(pts, msg) {
    points += pts;
    const r = q('#rg-result'); if (r) r.textContent = msg;
    const b = document.createElement('button'); b.className = 'rg-btn'; b.type = 'button'; b.textContent = '回到題目 →';
    b.onclick = close; arena.appendChild(b); b.focus();
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && open()) close(); });

  /* 1. 翻牌比大小 */
  function gameCards() {
    const vals = shuffle([10, 20, 30, 50, 100]); const top = Math.max(...vals);
    arena.innerHTML = `<h3 id="rg-title">翻牌比大小</h3><p id="rg-msg">記住 <b style="color:var(--gold)">${top}</b> 分在哪一張！</p><div class="rg-table" id="rg-table"></div><div class="rg-result" id="rg-result"></div>`;
    const table = q('#rg-table'); const slots = vals.map((_, i) => i);
    const cards = vals.map(val => {
      const c = document.createElement('button'); c.type = 'button'; c.className = 'rg-card'; c.disabled = true;
      c.innerHTML = `<div class="in"><div class="f${val === top ? ' top' : ''}">${val}</div><div class="b"></div></div>`;
      c.dataset.val = val; table.appendChild(c); return c;
    });
    const place = () => cards.forEach((c, i) => { c.style.left = (slots[i] * 20 + 1) + '%'; });
    place();
    later(() => { cards.forEach(c => c.classList.add('down')); q('#rg-msg').textContent = '洗牌中…盯緊它！'; }, 1800);
    let swaps = 0;
    later(() => {
      every(() => {
        if (swaps >= 9) return;
        const a = Math.floor(Math.random() * 5); let b = Math.floor(Math.random() * 5); if (b === a) b = (a + 1) % 5;
        [slots[a], slots[b]] = [slots[b], slots[a]]; place(); swaps++;
        if (swaps === 9) later(pickable, 450);
      }, 380);
    }, 2400);
    function pickable() {
      q('#rg-msg').textContent = '最高分的牌在哪裡？選一張！';
      cards.forEach(c => {
        c.disabled = false; c.classList.add('pickable'); c.onclick = () => {
          cards.forEach(x => { x.disabled = true; x.classList.remove('pickable'); x.onclick = null; });
          c.classList.add('picked'); c.classList.remove('down');
          later(() => cards.forEach(x => x.classList.remove('down')), 700);
          const val = +c.dataset.val; award(val, val === top ? `猜中最高分！+${val}` : `得到 +${val} 分`);
        };
      });
    }
  }

  /* 2. 井字遊戲 */
  function gameTTT() {
    arena.innerHTML = `<h3 id="rg-title">井字遊戲</h3><p id="rg-tmsg">先選模式，60 秒內可以玩好幾局</p>
      <div id="rg-tmode"><button class="rg-btn" type="button" data-m="pvc">玩家 vs 電腦</button><button class="rg-btn" type="button" data-m="pvp">玩家 vs 玩家（輪流）</button></div>
      <div class="rg-timer rg-hidden" id="rg-tbw"><i id="rg-tbar"></i></div><div class="rg-tally rg-hidden" id="rg-tally"></div>
      <div class="rg-ttt rg-hidden" id="rg-board"></div><div class="rg-result" id="rg-result"></div>`;
    const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    let mode = '', board, turn, starter = 'X', busy = false, live = true;
    const tally = { X: 0, O: 0, D: 0 }; const cells = [];
    const winner = b => { for (const l of LINES) { const [a, c, d] = l; if (b[a] && b[a] === b[c] && b[a] === b[d]) return { p: b[a], l }; } return b.every(Boolean) ? { p: 'D' } : null; };
    const label = p => mode === 'pvc' ? (p === 'X' ? '你' : '電腦') : (p === 'X' ? '玩家 X' : '玩家 O');
    const showTally = () => { q('#rg-tally').innerHTML = mode === 'pvc' ? `你 <b>${tally.X}</b>　平手 <b>${tally.D}</b>　電腦 <b>${tally.O}</b>` : `玩家 X <b>${tally.X}</b>　平手 <b>${tally.D}</b>　玩家 O <b>${tally.O}</b>`; };
    const status = () => { q('#rg-tmsg').textContent = `輪到 ${turn}（${label(turn)}）`; };
    function newRound() {
      board = Array(9).fill(''); turn = starter; starter = starter === 'X' ? 'O' : 'X'; busy = false;
      cells.forEach(c => { c.textContent = ''; c.className = 'rg-cell'; c.disabled = false; });
      status(); if (mode === 'pvc' && turn === 'O') aiMove();
    }
    function aiMove() {
      busy = true;
      later(() => {
        if (!live) return;
        const empty = board.map((v, i) => v ? null : i).filter(i => i !== null);
        const tryWin = p => empty.find(i => { const b = board.slice(); b[i] = p; const w = winner(b); return w && w.p === p; });
        let i;
        if (chance(.3)) i = R(empty);
        else i = tryWin('O') ?? tryWin('X') ?? (board[4] ? null : 4) ?? R(empty.filter(x => [0, 2, 6, 8].includes(x)).concat(empty));
        place(i); busy = false;
      }, 450);
    }
    function place(i) {
      board[i] = turn; cells[i].textContent = turn; cells[i].classList.add(turn === 'X' ? 'x' : 'o'); cells[i].disabled = true;
      const w = winner(board);
      if (w) {
        busy = true;
        if (w.p === 'D') { tally.D++; q('#rg-tmsg').textContent = '平手！'; }
        else { tally[w.p]++; w.l.forEach(k => cells[k].classList.add('win')); q('#rg-tmsg').textContent = `${label(w.p)} 贏了！`; }
        cells.forEach(c => c.disabled = true); showTally();
        later(() => { if (live) newRound(); }, 1100); return;
      }
      turn = turn === 'X' ? 'O' : 'X'; status();
      if (mode === 'pvc' && turn === 'O') aiMove();
    }
    function end() {
      if (!live) return; live = false; busy = true; cells.forEach(c => c.disabled = true);
      let pts, msg;
      if (mode === 'pvc') { pts = Math.max(5, tally.X * 20 + tally.D * 10); msg = `時間到！你贏 ${tally.X} 局、平手 ${tally.D} 局｜+${pts} 分`; }
      else { pts = 30; msg = `時間到！X 贏 ${tally.X} 局、O 贏 ${tally.O} 局｜+${pts} 分`; }
      q('#rg-tmsg').textContent = '時間到！'; award(pts, msg);
    }
    arena.querySelectorAll('#rg-tmode button').forEach(b => b.onclick = () => {
      mode = b.dataset.m; q('#rg-tmode').remove();
      ['#rg-tbw', '#rg-tally', '#rg-board'].forEach(s => q(s).classList.remove('rg-hidden'));
      for (let i = 0; i < 9; i++) {
        const c = document.createElement('button'); c.type = 'button'; c.className = 'rg-cell'; c.setAttribute('aria-label', '第 ' + (i + 1) + ' 格');
        c.onclick = () => { if (busy || board[i] || !live) return; if (mode === 'pvc' && turn !== 'X') return; place(i); };
        q('#rg-board').appendChild(c); cells.push(c);
      }
      const res = q('#rg-result'); res.innerHTML = '<button class="rg-mini" type="button" id="rg-tstop">提早結束領分</button>';
      q('#rg-tstop').onclick = () => { res.textContent = ''; end(); };
      showTally(); newRound();
      const t0 = Date.now(), DUR = 60000;
      every(() => { const left = Math.max(0, 1 - (Date.now() - t0) / DUR); q('#rg-tbar').style.width = (left * 100) + '%'; if (left <= 0) { const s = q('#rg-tstop'); if (s) s.remove(); end(); } }, 200);
    });
    arena.querySelector('#rg-tmode button').focus();
  }

  /* 3. 打地鼠三態 */
  function gameMoles() {
    const DUR = 40000, STAY = 3200, EVERY_MS = 1700, MAXUP = 3;
    arena.innerHTML = `<h3 id="rg-title">打地鼠三態</h3><p>只敲<strong style="color:var(--gold)">過去式正確</strong>的地鼠！對 +5，錯 −3（40 秒）</p><div class="rg-timer"><i id="rg-tbar"></i></div><div class="rg-moles" id="rg-mg"></div><div class="rg-result" id="rg-result">0 分</div>`;
    const mg = q('#rg-mg'); const holes = [];
    for (let i = 0; i < 9; i++) { const h = document.createElement('div'); h.className = 'rg-hole'; const m = document.createElement('button'); m.type = 'button'; m.className = 'rg-mole'; h.appendChild(m); mg.appendChild(h); holes.push(m); }
    let pts = 0, live = true; const t0 = Date.now(); const tb = q('#rg-tbar');
    every(() => { tb.style.width = (Math.max(0, 1 - (Date.now() - t0) / DUR) * 100) + '%'; }, 100);
    function pop() {
      if (!live) return;
      if (holes.filter(m => m.classList.contains('up')).length >= MAXUP) return;
      const free = holes.filter(m => !m.classList.contains('up')); if (!free.length) return;
      const m = R(free), v = R(VERBS), good = chance(.55);
      m.textContent = `${v[0]} → ${good ? v[1] : R(v.slice(2))}`; m.dataset.good = good ? '1' : '0'; m.className = 'rg-mole up';
      m.onclick = () => {
        if (!m.classList.contains('up') || m.dataset.hit) return; m.dataset.hit = '1';
        if (m.dataset.good === '1') { pts += 5; m.classList.add('hitok'); } else { pts -= 3; m.classList.add('hitbad'); m.textContent = `${v[0]} → ${v[1]}`; }
        q('#rg-result').textContent = pts + ' 分'; later(() => { m.className = 'rg-mole'; delete m.dataset.hit; }, 900);
      };
      later(() => { if (!m.dataset.hit) m.className = 'rg-mole'; }, STAY);
    }
    every(pop, EVERY_MS); pop();
    later(() => { live = false; holes.forEach(m => { m.className = 'rg-mole'; m.onclick = null; }); const p = Math.max(0, pts); award(p, `時間到！得到 +${p} 分`); }, DUR);
  }

  /* 4. 彈弓砸塔 */
  function gameSling() {
    const W = 760, H = 400, GY = 356, G = 0.32, AX = 118, AY = 270, MAXPULL = 95, SR = 13, DUR = 60000;
    arena.innerHTML = `<h3 id="rg-title">彈弓砸塔</h3><p>按住石頭往後拉、放開發射，打下所有星星！3 顆石頭、60 秒</p><div class="rg-timer"><i id="rg-tbar"></i></div><div class="rg-sling"><canvas id="rg-cv"></canvas></div><div class="rg-result" id="rg-result"></div>`;
    const cv = q('#rg-cv'), ctx = cv.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2); cv.width = W * dpr; cv.height = H * dpr; ctx.scale(dpr, dpr);
    const token = ++TOKEN;
    const bodies = [];
    const add = (x, y, w, h, type) => bodies.push({ x, y, w, h, type, state: 'static', vx: 0, vy: 0, rot: 0, vr: 0, hit: false });
    const xs = shuffle([430, 535, 640]).slice(0, chance(.5) ? 2 : 3).sort((a, b) => a - b);
    xs.forEach(cx => {
      let base = GY; const levels = 1 + Math.floor(Math.random() * 3);
      for (let l = 0; l < levels; l++) { const ph = 52; add(cx - 38, base - ph, 13, ph, 'wood'); add(cx + 25, base - ph, 13, ph, 'wood'); add(cx - 44, base - ph - 12, 88, 12, 'wood'); base = base - ph - 12; }
      if (chance(.5)) add(cx - 15, GY - 30, 30, 30, 'crate');
      add(cx - 14, base - 28, 28, 28, 'star');
    });
    const totalStars = bodies.filter(b => b.type === 'star').length;
    let stones = 3, stone = null, drag = false, score = 0, ended = false, t0 = Date.now(), parts = [], floats = [], idleSince = 0;
    const ready = () => ({ x: AX, y: AY, vx: 0, vy: 0, fly: false, t: 0 });
    stone = ready(); stones--;
    const pos = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
    cv.addEventListener('pointerdown', e => { if (ended || !stone || stone.fly) return; const p = pos(e); if (Math.hypot(p.x - stone.x, p.y - stone.y) < 48) { drag = true; cv.setPointerCapture(e.pointerId); } });
    cv.addEventListener('pointermove', e => { if (!drag) return; const p = pos(e); let dx = p.x - AX, dy = p.y - AY; const d = Math.hypot(dx, dy); if (d > MAXPULL) { dx *= MAXPULL / d; dy *= MAXPULL / d; } if (dx > 10) dx = 10; stone.x = AX + dx; stone.y = AY + dy; });
    const release = () => { if (!drag) return; drag = false; const dx = AX - stone.x, dy = AY - stone.y; if (Math.hypot(dx, dy) < 12) { stone.x = AX; stone.y = AY; return; } stone.vx = dx * 0.19; stone.vy = dy * 0.19; stone.fly = true; };
    cv.addEventListener('pointerup', release); cv.addEventListener('pointercancel', release);
    const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    const gain = (n, x, y) => { score += n; floats.push({ x, y, t: 0, txt: '+' + n }); };
    function popStar(b) { if (b.state === 'gone') return; b.state = 'gone'; gain(20, b.x + b.w / 2, b.y); for (let i = 0; i < 14; i++) { const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 3; parts.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, t: 0 }); } }
    function knock(b, vx, vy) { if (b.type === 'star') { popStar(b); return; } b.state = 'fly'; b.vx = vx; b.vy = vy; b.vr = (Math.random() - .5) * .2; if (!b.hit) { b.hit = true; gain(1, b.x + b.w / 2, b.y); } }
    function supported(b) { if (b.y + b.h >= GY - 0.5) return true; return bodies.some(o => o !== b && (o.state === 'static' || o.state === 'rest') && Math.abs(o.y - (b.y + b.h)) <= 2.5 && Math.min(b.x + b.w, o.x + o.w) - Math.max(b.x, o.x) > 3); }
    let last = performance.now();
    function step(k) {
      if (stone && stone.fly) {
        stone.t += k; stone.vy += G * k; stone.x += stone.vx * k; stone.y += stone.vy * k;
        if (stone.y + SR > GY) { stone.y = GY - SR; stone.vy *= -0.35; stone.vx *= 0.75; }
        for (const b of bodies) {
          if (b.state !== 'static') continue;
          const nx = Math.max(b.x, Math.min(stone.x, b.x + b.w)), ny = Math.max(b.y, Math.min(stone.y, b.y + b.h));
          if (Math.hypot(stone.x - nx, stone.y - ny) < SR) { const sp = Math.hypot(stone.vx, stone.vy); if (sp > 1.5) { knock(b, stone.vx * 0.55, stone.vy * 0.4 - 1); stone.vx *= 0.35; stone.vy *= 0.5; } else { stone.vx *= -0.3; } }
        }
        const slow = Math.hypot(stone.vx, stone.vy) < 0.35 && stone.y >= GY - SR - 1;
        if (slow || stone.x > W + 60 || stone.x < -60 || stone.t > 420) { stone = null; idleSince = performance.now(); }
      }
      for (const b of bodies) {
        if (b.state === 'static' && !supported(b)) { b.state = 'fly'; b.vx = (Math.random() - .5) * .6; b.vy = 0; b.vr = (Math.random() - .5) * .08; }
        if (b.state !== 'fly') continue;
        b.vy += G * k; b.x += b.vx * k; b.y += b.vy * k; b.rot += b.vr * k;
        for (const o of bodies) { if (o === b || o.state !== 'static') continue; if (overlap(b, o) && Math.hypot(b.vx, b.vy) > 3.2) { knock(o, b.vx * 0.5, b.vy * 0.3 - 0.3); b.vx *= 0.5; } }
        if (b.y + b.h >= GY) {
          if (b.type === 'star') { popStar(b); continue; }
          b.y = GY - b.h; b.vy *= -0.25; b.vx *= 0.7; b.vr *= 0.6;
          if (Math.abs(b.vy) < 0.8 && Math.abs(b.vx) < 0.3) { b.state = 'rest'; b.vy = 0; b.vx = 0; b.vr = 0; }
        }
        if (b.type === 'star' && b.state === 'fly' && b.vy > 4) popStar(b);
        if (b.x > W + 80 || b.x < -80) b.state = 'gone';
      }
      parts.forEach(p => { p.t += k; p.vy += 0.1 * k; p.x += p.vx * k; p.y += p.vy * k; }); parts = parts.filter(p => p.t < 45);
      floats.forEach(f => { f.t += k; f.y -= 0.6 * k; }); floats = floats.filter(f => f.t < 50);
      const starsLeft = bodies.filter(b => b.type === 'star' && b.state !== 'gone').length;
      const moving = bodies.some(b => b.state === 'fly');
      if (!ended && starsLeft === 0 && !moving) finish(true);
      else if (!ended && !stone && !moving && performance.now() - idleSince > 700) { if (stones > 0) { stones--; stone = ready(); } else finish(false); }
    }
    function finish(clear) {
      if (ended) return; ended = true;
      const left = stones + (stone && !stone.fly ? 1 : 0);
      if (clear && left) gain(10 * left, W / 2, 80);
      const popped = bodies.filter(b => b.type === 'star' && b.state === 'gone').length;
      later(() => award(score, `${clear ? '全部打下！' : '結束！'}星星 ${popped}/${totalStars}｜+${score} 分`), 600);
    }
    function star(x, y, r, rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fillStyle = '#f2b632'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#9a6a05'; ctx.stroke(); ctx.restore(); }
    function draw() {
      const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#bfe4f2'); sky.addColorStop(1, '#eef8f2'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#cfe7cf'; ctx.beginPath(); ctx.ellipse(200, GY + 30, 330, 110, 0, Math.PI, 0); ctx.fill(); ctx.beginPath(); ctx.ellipse(620, GY + 40, 300, 90, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#6b8f3a'; ctx.fillRect(0, GY, W, 6); ctx.fillStyle = '#8a6a43'; ctx.fillRect(0, GY + 6, W, H - GY - 6);
      if (drag) { let x = stone.x, y = stone.y, vx = (AX - stone.x) * 0.19, vy = (AY - stone.y) * 0.19; ctx.fillStyle = 'rgba(29,42,38,.45)'; for (let i = 0; i < 40; i++) { vy += G; x += vx; y += vy; if (i % 3 === 0) { ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); } if (y > GY) break; } }
      ctx.lineCap = 'round'; ctx.strokeStyle = '#6d4521'; ctx.lineWidth = 12;
      ctx.beginPath(); ctx.moveTo(AX, GY); ctx.lineTo(AX, AY + 38); ctx.stroke();
      ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(AX, AY + 40); ctx.lineTo(AX + 14, AY - 6); ctx.stroke();
      if (stone && !stone.fly) { ctx.strokeStyle = '#3b2412'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(AX + 14, AY - 4); ctx.lineTo(stone.x, stone.y); ctx.stroke(); }
      for (const b of bodies) {
        if (b.state === 'gone') continue;
        ctx.save(); ctx.translate(b.x + b.w / 2, b.y + b.h / 2); ctx.rotate(b.rot);
        if (b.type === 'star') { ctx.restore(); star(b.x + b.w / 2, b.y + b.h / 2, 15, b.rot); continue; }
        ctx.fillStyle = b.type === 'crate' ? '#c9925a' : '#d8a86a'; ctx.strokeStyle = '#7a4d22'; ctx.lineWidth = 2;
        ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); ctx.strokeRect(-b.w / 2, -b.h / 2, b.w, b.h);
        if (b.type === 'crate') { ctx.beginPath(); ctx.moveTo(-b.w / 2, -b.h / 2); ctx.lineTo(b.w / 2, b.h / 2); ctx.moveTo(b.w / 2, -b.h / 2); ctx.lineTo(-b.w / 2, b.h / 2); ctx.stroke(); }
        ctx.restore();
      }
      if (stone) { ctx.fillStyle = '#6f7a80'; ctx.beginPath(); ctx.arc(stone.x, stone.y, SR, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#a9b4b9'; ctx.beginPath(); ctx.arc(stone.x - 4, stone.y - 4, 4.5, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = '#7d5129'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(AX, AY + 40); ctx.lineTo(AX - 14, AY - 8); ctx.stroke();
      if (stone && !stone.fly) { ctx.strokeStyle = '#3b2412'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(AX - 14, AY - 6); ctx.lineTo(stone.x, stone.y); ctx.stroke(); }
      for (let i = 0; i < stones; i++) { ctx.fillStyle = '#6f7a80'; ctx.beginPath(); ctx.arc(40 + i * 24, GY - 10, 9, 0, Math.PI * 2); ctx.fill(); }
      parts.forEach(p => { ctx.fillStyle = `rgba(242,182,50,${1 - p.t / 45})`; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); });
      ctx.font = 'bold 22px Nunito, Arial'; ctx.textAlign = 'center';
      floats.forEach(f => { ctx.fillStyle = `rgba(29,42,38,${1 - f.t / 50})`; ctx.fillText(f.txt, f.x, f.y); });
      ctx.textAlign = 'left'; ctx.fillStyle = '#1d2a26'; ctx.font = 'bold 20px Nunito, Arial'; ctx.fillText('分數 ' + score, 16, 30);
      if (stone && !stone.fly && !drag && !ended) { ctx.font = 'bold 16px Nunito, "Microsoft JhengHei", Arial'; ctx.fillStyle = '#0f5747'; ctx.fillText('← 按住石頭往後拉', AX + 24, AY - 34); }
    }
    function loop(now) {
      if (token !== TOKEN) return;
      const k = Math.min(2.5, (now - last) / 16.67); last = now;
      for (let i = 0; i < 3; i++) step(k / 3);
      draw();
      const left = Math.max(0, 1 - (Date.now() - t0) / DUR); const tb = q('#rg-tbar'); if (tb) tb.style.width = (left * 100) + '%';
      if (left <= 0 && !ended) finish(false);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  // ---------- automatic correct-answer detection ----------
  const fbState = new WeakMap(); // element -> {armed, sig, timer}
  function evalFeedback(el) {
    const st = fbState.get(el) || { armed: true, sig: '' }; fbState.set(el, st);
    clearTimeout(st.timer);
    st.timer = setTimeout(() => {
      const cl = el.classList, okNow = cl.contains('ok') && !cl.contains('hidden') && !el.hidden && el.isConnected;
      if (!okNow) { st.armed = true; return; }
      const sig = el.textContent.replace(/\s+/g, ' ').trim();
      if (sig && (st.armed || sig !== st.sig)) { st.armed = false; st.sig = sig; correct(); }
    }, 60);
  }
  function inspect(el, oldClass) {
    if (!(el instanceof Element) || (overlay && overlay.contains(el)) || (badge && badge.contains(el))) return;
    const cl = el.classList;
    if (cl.contains('feedback')) return evalFeedback(el);           // pattern 1: .feedback.ok
    if (cl.contains('q') && cl.contains('right') && !/\bright\b/.test(oldClass)) return correct();   // pattern 2: comma page
    if (cl.contains('option-btn') && cl.contains('correct') && !/\bcorrect\b/.test(oldClass)) {   // pattern 3: AWL
      setTimeout(() => { if (!document.querySelector('.option-btn.incorrect')) correct(); }, 0);
    }
  }
  function start() {
    mount();
    document.querySelectorAll('.feedback').forEach(el => fbState.set(el, { armed: !el.classList.contains('ok'), sig: el.textContent.replace(/\s+/g, ' ').trim() }));
    const mo = new MutationObserver(list => {
      for (const m of list) {
        if (m.type === 'attributes') inspect(m.target, m.oldValue || '');
        else {
          const t = m.target.nodeType === 1 ? m.target : m.target.parentElement;
          const fb = t && t.closest && t.closest('.feedback');
          if (fb && fbState.has(fb)) evalFeedback(fb);
        }
      }
    });
    mo.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class', 'hidden'], attributeOldValue: true, childList: true, characterData: true });
  }
  window.RewardGames = { correct, open: () => { mount(); picker(); }, get count() { return count; } };
  document.addEventListener('reward-correct', correct);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
