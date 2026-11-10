/* 國中2000字 reward mini-games: every 5 correct answers -> one 60-second game.
   Games rotate: 打地鼠 → 小精靈 → 井字棋 → 找最大牌 → 射擊.
   Usage: J2KGames.after(correctCount, continueFn)  (calls continueFn right away if no game is due) */
(function () {
  const GAME_SECONDS = 60, EVERY = 5;
  const rewarded = new Set();
  let nextGame = 0;
  try { nextGame = Number(localStorage.getItem("j2k-next-game") || 0) % 5; } catch (e) {}

  const css = `
.j2k-ov{position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:9999;display:flex;align-items:center;justify-content:center;padding:12px;font-family:Arial,"Noto Sans TC","Microsoft JhengHei",sans-serif}
.j2k-box{background:#fff;border-radius:18px;max-width:520px;width:100%;max-height:96vh;overflow:auto;padding:16px;box-shadow:0 20px 60px rgba(0,0,0,.35)}
.j2k-top{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:18px;font-weight:800;color:#0f766e}
.j2k-top span{background:#f0fdfa;border-radius:999px;padding:4px 12px;font-size:16px;color:#115e59}
.j2k-bar{height:8px;background:#e5e7eb;border-radius:999px;overflow:hidden;margin:10px 0}
.j2k-bar i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#14b8a6,#f59e0b);transition:width 1s linear}
.j2k-stage{position:relative;min-height:300px;user-select:none;-webkit-user-select:none;touch-action:manipulation}
.j2k-help{color:#64748b;font-size:14px;text-align:center;margin:8px 0}
.j2k-actions{display:flex;justify-content:center;gap:10px;margin-top:6px}
.j2k-btn{border:0;border-radius:10px;padding:10px 16px;font-size:16px;font-weight:700;cursor:pointer;background:#e5e7eb}
.j2k-btn.go{background:#0f766e;color:#fff}
.j2k-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-width:330px;margin:auto}
.j2k-hole{aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 50% 70%,#78350f 0 38%,#a16207 39% 100%);border:0;font-size:44px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.j2k-cell{aspect-ratio:1;border-radius:12px;border:3px solid #99f6e4;background:#f0fdfa;font-size:46px;font-weight:900;cursor:pointer;color:#0f766e}
.j2k-cell.o{color:#ea580c}
.j2k-msg{text-align:center;font-weight:800;color:#0f766e;min-height:24px;margin:6px 0}
.j2k-card{position:absolute;top:60px;width:28%;height:150px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:40px;font-weight:900;cursor:pointer;transition:left .28s ease;box-shadow:0 6px 14px rgba(0,0,0,.18)}
.j2k-card.up{background:#fff;border:3px solid #14b8a6;color:#0f766e}
.j2k-card.down{background:repeating-linear-gradient(45deg,#0f766e 0 10px,#14b8a6 10px 20px);border:3px solid #115e59;color:transparent}
.j2k-card.win{background:#fef3c7;border-color:#f59e0b;color:#b45309}
.j2k-shoot{height:320px;border-radius:14px;background:linear-gradient(#e0f2fe,#f0fdfa);overflow:hidden;cursor:crosshair}
.j2k-target{position:absolute;font-size:40px;line-height:1;cursor:crosshair}
.j2k-pad{display:grid;grid-template-columns:repeat(3,56px);gap:6px;justify-content:center;margin-top:8px}
.j2k-pad button{height:48px;border:0;border-radius:10px;background:#ccfbf1;font-size:22px;font-weight:900;color:#115e59}
.j2k-final{text-align:center;padding:30px 10px}
.j2k-final b{display:block;font-size:56px;color:#f59e0b}`;
  function addCss() { if (document.getElementById("j2k-css")) return; const s = document.createElement("style"); s.id = "j2k-css"; s.textContent = css; document.head.appendChild(s); }
  const rand = n => Math.floor(Math.random() * n);

  // ---------------- games ----------------
  function whack(stage, api) {
    api.help("地鼠冒出來就點牠！🐹 +1，小心不要點到炸彈 💣 −2");
    const g = document.createElement("div"); g.className = "j2k-grid"; stage.appendChild(g);
    const holes = [...Array(9)].map(() => { const b = document.createElement("button"); b.className = "j2k-hole"; b.type = "button"; g.appendChild(b); return b; });
    const up = new Map();
    holes.forEach((b, i) => b.addEventListener("pointerdown", () => {
      const v = up.get(i); if (!v) return;
      up.delete(i); b.textContent = v === "bomb" ? "💥" : "⭐"; api.add(v === "bomb" ? -2 : 1);
      setTimeout(() => { if (!up.has(i)) b.textContent = ""; }, 250);
    }));
    let speed = 900;
    const spawn = () => {
      const free = holes.map((_, i) => i).filter(i => !up.has(i)); if (!free.length) return;
      const i = free[rand(free.length)], kind = Math.random() < .15 ? "bomb" : "mole";
      up.set(i, kind); holes[i].textContent = kind === "bomb" ? "💣" : "🐹";
      setTimeout(() => { if (up.get(i) === kind) { up.delete(i); holes[i].textContent = ""; } }, speed);
      speed = Math.max(550, speed - 8);
    };
    const t = setInterval(spawn, 600);
    return () => clearInterval(t);
  }

  function pacman(stage, api) {
    api.help("用方向鍵、滑動螢幕或下方按鈕移動，吃豆子 +1，被鬼抓到 −3");
    const MAP = ["#############", "#.....#.....#", "#.##.....##.#", "#.#..###..#.#", "#...........#", "###.#.#.#.###",
      "#.....#.....#", "#.###...###.#", "#...........#", "#.##.#.#.##.#", "#....#.#....#", "#.##.....##.#", "#############"];
    const N = MAP.length, cv = document.createElement("canvas"), size = Math.min(360, (stage.clientWidth || 340));
    cv.width = cv.height = size; cv.style.cssText = "display:block;margin:auto;border-radius:12px;background:#0b1020;touch-action:none"; stage.appendChild(cv);
    const ctx = cv.getContext("2d"), cs = size / N;
    let dots;
    const refill = () => { dots = new Set(); MAP.forEach((r, y) => [...r].forEach((c, x) => { if (c === ".") dots.add(x + "," + y); })); };
    refill();
    const wall = (x, y) => MAP[y][x] === "#";
    const pac = { x: 6, y: 8, dx: 0, dy: 0, nx: 0, ny: 0 };
    const ghosts = [{ x: 1, y: 1, dx: 1, dy: 0, c: "#f87171" }, { x: 11, y: 1, dx: -1, dy: 0, c: "#a78bfa" }];
    dots.delete("6,8");
    const setDir = (x, y) => { pac.nx = x; pac.ny = y; };
    const key = e => { const m = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key]; if (m) { e.preventDefault(); setDir(...m); } };
    window.addEventListener("keydown", key);
    let sx, sy;
    cv.addEventListener("touchstart", e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    cv.addEventListener("touchend", e => { const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; if (Math.abs(dx) + Math.abs(dy) < 15) return; Math.abs(dx) > Math.abs(dy) ? setDir(Math.sign(dx), 0) : setDir(0, Math.sign(dy)); });
    const pad = document.createElement("div"); pad.className = "j2k-pad";
    [["", 0, 0], ["▲", 0, -1], ["", 0, 0], ["◀", -1, 0], ["▼", 0, 1], ["▶", 1, 0]].forEach(([t, x, y]) => {
      const b = document.createElement("button"); b.type = "button"; b.textContent = t; if (!t) b.style.visibility = "hidden";
      b.addEventListener("pointerdown", e => { e.preventDefault(); setDir(x, y); }); pad.appendChild(b);
    });
    stage.appendChild(pad);
    let mouth = 0;
    const draw = () => {
      ctx.fillStyle = "#0b1020"; ctx.fillRect(0, 0, size, size);
      MAP.forEach((r, y) => [...r].forEach((c, x) => { if (c === "#") { ctx.fillStyle = "#0f766e"; ctx.fillRect(x * cs + 1, y * cs + 1, cs - 2, cs - 2); } }));
      ctx.fillStyle = "#fde68a"; dots.forEach(k => { const [x, y] = k.split(",").map(Number); ctx.beginPath(); ctx.arc(x * cs + cs / 2, y * cs + cs / 2, cs * .12, 0, 7); ctx.fill(); });
      const a = Math.atan2(pac.dy || 0, pac.dx || 1), m = (mouth = (mouth + 1) % 4) < 2 ? .25 : .05;
      ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.moveTo(pac.x * cs + cs / 2, pac.y * cs + cs / 2);
      ctx.arc(pac.x * cs + cs / 2, pac.y * cs + cs / 2, cs * .42, a + m * Math.PI, a - m * Math.PI + 2 * Math.PI); ctx.fill();
      ghosts.forEach(gh => { ctx.fillStyle = gh.c; ctx.beginPath(); ctx.arc(gh.x * cs + cs / 2, gh.y * cs + cs / 2, cs * .4, Math.PI, 0); ctx.lineTo(gh.x * cs + cs * .9, gh.y * cs + cs * .9); ctx.lineTo(gh.x * cs + cs * .1, gh.y * cs + cs * .9); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.fillRect(gh.x * cs + cs * .3, gh.y * cs + cs * .35, cs * .12, cs * .14); ctx.fillRect(gh.x * cs + cs * .58, gh.y * cs + cs * .35, cs * .12, cs * .14); });
    };
    const caught = () => ghosts.some(g => g.x === pac.x && g.y === pac.y);
    const hit = () => { api.add(-3); pac.x = 6; pac.y = 8; pac.dx = pac.dy = 0; api.flash("👻 被抓到了！−3"); };
    const t1 = setInterval(() => {
      if ((pac.nx || pac.ny) && !wall(pac.x + pac.nx, pac.y + pac.ny)) { pac.dx = pac.nx; pac.dy = pac.ny; }
      if (!wall(pac.x + pac.dx, pac.y + pac.dy)) { pac.x += pac.dx; pac.y += pac.dy; }
      const k = pac.x + "," + pac.y; if (dots.delete(k)) { api.add(1); if (!dots.size) { refill(); api.flash("全部吃光！豆子重新出現"); } }
      if (caught()) hit(); draw();
    }, 170);
    const t2 = setInterval(() => {
      ghosts.forEach(g => {
        const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([x, y]) => !wall(g.x + x, g.y + y) && !(x === -g.dx && y === -g.dy));
        const pool = opts.length ? opts : [[-g.dx, -g.dy]];
        let pick = pool[rand(pool.length)];
        if (Math.random() < .35) pick = pool.slice().sort((a, b) => (Math.abs(g.x + a[0] - pac.x) + Math.abs(g.y + a[1] - pac.y)) - (Math.abs(g.x + b[0] - pac.x) + Math.abs(g.y + b[1] - pac.y)))[0];
        g.dx = pick[0]; g.dy = pick[1]; g.x += g.dx; g.y += g.dy;
      });
      if (caught()) hit(); draw();
    }, 260);
    draw();
    return () => { clearInterval(t1); clearInterval(t2); window.removeEventListener("keydown", key); };
  }

  function tictactoe(stage, api) {
    api.help("你是 X，電腦是 O。贏一局 +3，平手 +1，一直玩到時間結束！");
    const msg = document.createElement("div"); msg.className = "j2k-msg"; stage.appendChild(msg);
    const g = document.createElement("div"); g.className = "j2k-grid"; stage.appendChild(g);
    const cells = [...Array(9)].map(() => { const b = document.createElement("button"); b.type = "button"; b.className = "j2k-cell"; g.appendChild(b); return b; });
    const L = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    let board, lock = false, timers = [];
    const winner = b => { for (const [a, c, d] of L) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a]; return b.every(Boolean) ? "draw" : null; };
    const render = () => cells.forEach((c, i) => { c.textContent = board[i] || ""; c.className = "j2k-cell" + (board[i] === "O" ? " o" : ""); });
    const reset = () => { board = Array(9).fill(null); lock = false; msg.textContent = "輪到你了！"; render(); };
    const finish = w => { lock = true; if (w === "X") { api.add(3); msg.textContent = "🎉 你贏了！+3"; } else if (w === "draw") { api.add(1); msg.textContent = "🤝 平手 +1"; } else msg.textContent = "😅 電腦贏了，再來！"; timers.push(setTimeout(reset, 1100)); };
    const ai = () => {
      const free = board.map((v, i) => v ? null : i).filter(v => v !== null);
      const tryFor = s => { for (const i of free) { const b = board.slice(); b[i] = s; if (winner(b) === s) return i; } return null; };
      let m = tryFor("O"); if (m === null) m = tryFor("X");
      if (m === null && Math.random() < .25) m = free[rand(free.length)];
      if (m === null && board[4] === null) m = 4;
      if (m === null) m = free[rand(free.length)];
      board[m] = "O"; render(); const w = winner(board); if (w) finish(w); else { lock = false; msg.textContent = "輪到你了！"; }
    };
    cells.forEach((c, i) => c.addEventListener("click", () => {
      if (lock || board[i]) return; board[i] = "X"; render(); const w = winner(board);
      if (w) return finish(w); lock = true; msg.textContent = "電腦思考中…"; timers.push(setTimeout(ai, 350));
    }));
    reset();
    return () => timers.forEach(clearTimeout);
  }

  function cards(stage, api) {
    api.help("記住最大的數字在哪張牌！牌會蓋起來洗牌，猜中 +2");
    const msg = document.createElement("div"); msg.className = "j2k-msg"; stage.appendChild(msg);
    const area = document.createElement("div"); area.style.cssText = "position:relative;height:240px"; stage.appendChild(area);
    const slots = [4, 36, 68]; let els = [], slotOf = [], vals = [], round = 0, timers = [], canPick = false;
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const place = () => els.forEach((e, i) => e.style.left = slots[slotOf[i]] + "%");
    const startRound = () => {
      area.innerHTML = ""; round++; canPick = false;
      const nums = [100, 50, 10].map(n => n + rand(9)); nums.sort(() => Math.random() - .5); vals = nums;
      els = vals.map((v, i) => { const d = document.createElement("div"); d.className = "j2k-card up"; d.textContent = v; area.appendChild(d);
        d.addEventListener("click", () => pick(i)); return d; });
      slotOf = [0, 1, 2]; place(); msg.textContent = `第 ${round} 回合：記住最大的牌！`;
      later(() => { els.forEach(e => e.className = "j2k-card down"); msg.textContent = "洗牌中…"; shuffle(3 + round * 2, Math.max(180, 420 - round * 40)); }, 1400);
    };
    const shuffle = (n, ms) => {
      if (n <= 0) { canPick = true; msg.textContent = "最大的牌在哪裡？點一張！"; return; }
      const a = rand(3); let b = rand(3); while (b === a) b = rand(3);
      const ia = slotOf.indexOf(a), ib = slotOf.indexOf(b); slotOf[ia] = b; slotOf[ib] = a;
      els.forEach(e => e.style.transition = `left ${ms / 1000}s ease`); place(); later(() => shuffle(n - 1, ms), ms + 40);
    };
    const pick = i => {
      if (!canPick) return; canPick = false;
      const max = vals.indexOf(Math.max(...vals));
      els.forEach((e, k) => e.className = "j2k-card " + (k === max ? "win" : "up"));
      if (i === max) { api.add(2); msg.textContent = "🎯 猜對了！+2"; } else msg.textContent = "差一點！最大的是發亮的那張";
      later(startRound, 1300);
    };
    startRound();
    return () => timers.forEach(clearTimeout);
  }

  function shooting(stage, api) {
    api.help("點擊移動的氣球射擊！🎈 +1，金星 ⭐ +3");
    const area = document.createElement("div"); area.className = "j2k-shoot j2k-stage"; stage.appendChild(area);
    const items = new Set(); let raf, last = performance.now(), spawnAcc = 0;
    const spawn = () => {
      const gold = Math.random() < .12, el = document.createElement("div"); el.className = "j2k-target"; el.textContent = gold ? "⭐" : ["🎈", "🎯", "🛸"][rand(3)];
      const w = area.clientWidth || 320, h = area.clientHeight || 320, fromLeft = Math.random() < .5;
      const o = { el, x: fromLeft ? -40 : w + 10, y: 10 + rand(h - 60), vx: (fromLeft ? 1 : -1) * (60 + rand(90)) * (gold ? 1.8 : 1), wob: Math.random() * 6, gold };
      el.addEventListener("pointerdown", e => { e.stopPropagation(); if (!items.has(o)) return; items.delete(o); api.add(o.gold ? 3 : 1); el.textContent = "💥"; setTimeout(() => el.remove(), 180); });
      area.appendChild(el); items.add(o);
    };
    const loop = now => {
      const dt = Math.min(.05, (now - last) / 1000); last = now; spawnAcc += dt;
      if (spawnAcc > .55) { spawnAcc = 0; spawn(); }
      const w = area.clientWidth || 320;
      items.forEach(o => { o.x += o.vx * dt; o.wob += dt * 3; o.el.style.transform = `translate(${o.x}px,${o.y + Math.sin(o.wob) * 12}px)`;
        if (o.x < -60 || o.x > w + 60) { items.delete(o); o.el.remove(); } });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }

  const GAMES = [["打地鼠", whack], ["小精靈 Pac-Man", pacman], ["井字棋", tictactoe], ["找最大牌", cards], ["射擊氣球", shooting]];

  function play(onDone) {
    addCss();
    const [name, fn] = GAMES[nextGame]; nextGame = (nextGame + 1) % GAMES.length;
    try { localStorage.setItem("j2k-next-game", String(nextGame)); } catch (e) {}
    const ov = document.createElement("div"); ov.className = "j2k-ov";
    ov.innerHTML = `<div class="j2k-box"><div class="j2k-top"><div>🎮 獎勵遊戲：${name}</div><div><span class="j2k-t">⏱ ${GAME_SECONDS}</span> <span class="j2k-s">⭐ 0</span></div></div><div class="j2k-bar"><i></i></div><div class="j2k-stage"></div><div class="j2k-help"></div><div class="j2k-actions"><button class="j2k-btn j2k-skip" type="button">略過，回到測驗</button></div></div>`;
    document.body.appendChild(ov);
    const stage = ov.querySelector(".j2k-stage"), help = ov.querySelector(".j2k-help"), bar = ov.querySelector(".j2k-bar i");
    let score = 0, left = GAME_SECONDS, cleanup = () => {}, ended = false, flashT;
    const api = {
      add(n) { score = Math.max(0, score + n); ov.querySelector(".j2k-s").textContent = "⭐ " + score; },
      help(t) { help.textContent = t; },
      flash(t) { help.dataset.base = help.dataset.base || help.textContent; help.textContent = t; clearTimeout(flashT); flashT = setTimeout(() => help.textContent = help.dataset.base, 1200); },
    };
    const close = () => { ov.remove(); onDone && onDone(); };
    const end = () => {
      if (ended) return; ended = true; clearInterval(timer); try { cleanup(); } catch (e) {}
      stage.innerHTML = `<div class="j2k-final">⏰ 時間到！你的分數<b>${score}</b>繼續加油，答對 5 題還有下一個遊戲！</div>`;
      help.textContent = ""; const a = ov.querySelector(".j2k-actions"); a.innerHTML = "";
      const b = document.createElement("button"); b.className = "j2k-btn go"; b.textContent = "回到測驗"; b.onclick = close; a.appendChild(b); b.focus();
    };
    ov.querySelector(".j2k-skip").onclick = () => { ended = true; clearInterval(timer); try { cleanup(); } catch (e) {} close(); };
    const timer = setInterval(() => { left--; ov.querySelector(".j2k-t").textContent = "⏱ " + left; bar.style.width = (left / GAME_SECONDS * 100) + "%"; if (left <= 0) end(); }, 1000);
    try { cleanup = fn(stage, api) || (() => {}); } catch (e) { console.error(e); end(); }
  }

  window.J2KGames = {
    after(correctCount, cont) {
      if (correctCount > 0 && correctCount % EVERY === 0 && !rewarded.has(correctCount)) { rewarded.add(correctCount); play(cont); }
      else if (cont) cont();
    },
    play,
  };
})();
