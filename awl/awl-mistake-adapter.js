/* AWL 測驗：隨機 20 題、隨時結束、下載錯題 DOCX（需先載入 ../mistake-kit.js） */
(() => {
  'use strict';
  const peek = n => { try { return Function(`return typeof ${n}!=='undefined'?${n}:undefined`)(); } catch (_) { return undefined; } };
  const setVar = (n, v) => { try { Function('v', `${n}=v`)(v); } catch (_) {} };
  if (!window.MistakeKit || typeof window.handleAnswer !== 'function') return;
  const DEFS = peek('DEFS') || {};
  const word = k => (DEFS[k] && DEFS[k].word) || k;

  MistakeKit.init({
    title: (peek('UNIT_NAME') || 'AWL') + ' Quiz',
    bar: true,
    onEnd: () => {
      const cur = peek('currentQ') || 0, done = cur + (peek('answered') ? 1 : 0);
      if (!done || document.getElementById('quizScreen')?.style.display !== 'block') return;
      setVar('totalQ', done); window.showEndScreen && window.showEndScreen();
    }
  });

  const orig = window.handleAnswer;
  window.handleAnswer = function (chosenKey, btn, q) {
    try {
      if (!peek('answered') && chosenKey !== q[0]) {
        const options = [...document.querySelectorAll('.option-btn')].map(b => word(b.dataset.key));
        const d = DEFS[q[0]] || {};
        MistakeKit.add({
          key: q[0], category: d.pos || '', question: String(q[1]).replace(/_+/g, '________') + (q[2] ? '\n' + q[2] : ''),
          options, yourAnswer: word(chosenKey), correctAnswer: word(q[0]),
          explanation: [d.en, d.cn, d.ex].filter(Boolean).join('\n')
        });
      }
    } catch (e) { console.warn(e); }
    return orig.apply(this, arguments);
  };

  /* 隨機 20 題按鈕 */
  const startBtn = [...document.querySelectorAll('#splashScreen button')].find(b => /start|開始/i.test(b.textContent));
  if (startBtn && typeof window.startQuiz === 'function') {
    const b20 = startBtn.cloneNode(true);
    b20.removeAttribute('onclick'); b20.removeAttribute('id');
    b20.innerHTML = '🎲 隨機 20 題 Random 20';
    b20.style.marginTop = '10px'; b20.style.background = '#ea580c';
    startBtn.after(b20);
    const origStart = window.startQuiz;
    b20.addEventListener('click', () => {
      origStart();
      const qs = peek('questions');
      if (Array.isArray(qs) && qs.length > 20 && document.getElementById('quizScreen')?.style.display === 'block') {
        qs.length = 20; setVar('totalQ', 20);
        const t = document.getElementById('totalDisplay'); if (t) t.textContent = 20;
        window.renderQuestion();
      }
    });
  }
})();
