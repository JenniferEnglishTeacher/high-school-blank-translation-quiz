/* gem-mistake-adapter.js — 讓 gem-grammar 互動練習頁支援：全部／隨機 20 題、隨時結束、下載錯題 DOCX（需先載入 mistake-kit.js） */
(() => {
  'use strict';
  const peek = name => { try { return Function(`return typeof ${name}!=='undefined'?${name}:undefined`)(); } catch (_) { return undefined; } };
  const setVar = (name, value) => { try { Function('v', `${name}=v`)(value); } catch (_) {} };
  const dataName = ['trapData', 'quizData', 'questions', 'rawData'].find(n => Array.isArray(peek(n)));
  if (!dataName || typeof window.checkAnswer !== 'function' || !window.MistakeKit) return;
  const data = peek(dataName), full = data.slice();
  const L = i => String.fromCharCode(65 + i);
  const opts = q => q.opts || q.options || [];
  const ansIndex = q => typeof q.ans === 'number' ? q.ans : typeof q.correct === 'number' ? q.correct : opts(q).indexOf(q.correct);
  const renderName = ['renderQuestion', 'render', 'loadQuestion'].find(n => typeof window[n] === 'function');

  MistakeKit.init({
    title: document.querySelector('h1')?.innerText || document.title,
    onEnd: () => { if (typeof window.showResults === 'function') window.showResults(); else alert('已結束本次練習。可重新整理頁面再練一次。'); }
  });

  const original = window.checkAnswer;
  window.checkAnswer = function (selected) {
    try {
      const q = data[peek('currentIdx')], ai = ansIndex(q);
      if (q && selected !== ai) {
        const pattern = Array.isArray(q.pattern) ? '句型：' + q.pattern.join(' ') + '\n' : '';
        MistakeKit.add({
          key: q.q || q.question || q.text, no: full.indexOf(q) + 1, category: q.cat || '',
          question: (q.q || q.question || q.text || '') + (q.hint ? '\n' + q.hint : ''), options: opts(q),
          yourAnswer: `(${L(selected)}) ${opts(q)[selected]}`, correctAnswer: `(${L(ai)}) ${opts(q)[ai]}`,
          explanation: pattern + (q.exp || q.explanation || '')
        });
      }
    } catch (e) { console.warn(e); }
    return original.apply(this, arguments);
  };

  /* 開始選單：全部 or 隨機 20 */
  if (!renderName || full.length <= 20) return;
  const box = document.createElement('div');
  box.id = 'mk-start';
  box.innerHTML = `<div class="mk-card"><h2>選擇練習範圍</h2><p>共 ${full.length} 題。可隨時按右下角「結束並下載錯題 DOCX」。</p><button type="button" data-n="all">全部 ${full.length} 題</button><button type="button" data-n="20">隨機 20 題</button></div>`;
  const style = document.createElement('style');
  style.textContent = '#mk-start{position:fixed;inset:0;z-index:2147483645;background:#0f172acc;display:flex;align-items:center;justify-content:center;padding:16px}#mk-start .mk-card{background:#fff;border-radius:18px;padding:24px;max-width:420px;width:100%;text-align:center;font-family:Arial,"Microsoft JhengHei",sans-serif}#mk-start h2{font-size:22px;font-weight:900;margin:0 0 8px}#mk-start p{color:#475569;margin:0 0 16px}#mk-start button{display:block;width:100%;margin:8px 0;padding:14px;border:0;border-radius:12px;font:900 17px Arial,"Microsoft JhengHei",sans-serif;cursor:pointer;background:#1e3a8a;color:#fff}#mk-start button[data-n="20"]{background:#ea580c}';
  document.head.append(style); document.body.append(box);
  box.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.n === '20') {
      const pick = full.slice();
      for (let i = pick.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pick[i], pick[j]] = [pick[j], pick[i]]; }
      data.splice(0, data.length, ...pick.slice(0, 20));
      setVar('currentIdx', 0); setVar('score', 0);
      window[renderName]();
    }
    box.remove();
  });
})();
