/* mistake-kit.js — 共用錯題收集＋「結束並下載錯題 DOCX」(no external library)
   API:
     MistakeKit.init({ title, bar:true, onEnd:fn })
     MistakeKit.add({ key, no, category, question, options:[], yourAnswer, correctAnswer, explanation })
     MistakeKit.download()   MistakeKit.clear()   MistakeKit.count()
*/
(() => {
  'use strict';
  if (window.MistakeKit) return;
  const records = new Map();
  let cfg = { title: '', bar: true, onEnd: null };
  const clean = v => String(v == null ? '' : v).replace(/\r/g, '').trim();
  const studentName = () => { try { return clean(JSON.parse(localStorage.getItem('jenniferQuizStudentProfileV1') || '{}').studentName); } catch (_) { return ''; } };
  const pageTitle = () => clean(cfg.title || document.querySelector('h1')?.innerText || document.title).replace(/\s+/g, ' ');

  /* ---------- minimal DOCX writer ---------- */
  const xmlEsc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  function run(text, o = {}) {
    const pr = (o.bold ? '<w:b/>' : '') + (o.color ? `<w:color w:val="${o.color}"/>` : '') + (o.size ? `<w:sz w:val="${o.size}"/><w:szCs w:val="${o.size}"/>` : '');
    return String(text).split('\n').map((line, i) => (i ? '<w:r><w:br/></w:r>' : '') + `<w:r>${pr ? `<w:rPr>${pr}</w:rPr>` : ''}<w:t xml:space="preserve">${xmlEsc(line)}</w:t></w:r>`).join('');
  }
  const para = (runs, o = {}) => `<w:p><w:pPr>${o.style ? `<w:pStyle w:val="${o.style}"/>` : ''}<w:spacing w:after="${o.after ?? 80}"/>${o.indent ? `<w:ind w:left="${o.indent}"/>` : ''}${o.shade ? `<w:shd w:val="clear" w:color="auto" w:fill="${o.shade}"/>` : ''}</w:pPr>${runs}</w:p>`;
  function documentXml(title, list) {
    const name = studentName(), date = new Date().toLocaleString('zh-TW', { hour12: false });
    let body = para(run(title + '｜錯題紀錄', { bold: true, size: 32 }), { after: 120 });
    body += para(run(`學生：${name || '__________'}　　日期：${date}　　錯題數：${list.length}`, { color: '555555' }), { after: 240 });
    list.forEach((r, i) => {
      body += para(run(`${i + 1}. `, { bold: true, size: 26 }) + run((r.no ? (/^\d+$/.test(r.no) ? `第 ${r.no} 題` : r.no) : '') + (r.category ? `${r.no ? '｜' : ''}${r.category}` : ''), { bold: true, size: 26, color: '1F4E79' }), { after: 60, shade: 'EAF1FB' });
      if (r.question) body += para(run(r.question, { size: 24 }), { after: 60 });
      (r.options || []).forEach((opt, k) => { body += para(run(`(${String.fromCharCode(65 + k)}) ${opt}`), { indent: 360, after: 20 }); });
      if (r.attempts.length) body += para(run('你的答案：', { bold: true, color: 'C00000' }) + run(r.attempts.join('；'), { color: 'C00000' }), { after: 20 });
      if (r.correctAnswer) body += para(run('正確答案：', { bold: true, color: '2E7D32' }) + run(r.correctAnswer, { color: '2E7D32' }), { after: 20 });
      if (r.explanation) body += para(run('解析：', { bold: true }) + run(r.explanation), { after: 20 });
      body += para(run('重新作答：______________________________________________', { color: '888888' }), { after: 240 });
    });
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="1000" w:bottom="1000" w:left="1000" w:header="500" w:footer="500" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  }
  const STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Microsoft JhengHei" w:cs="Arial"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-US" w:eastAsia="zh-TW"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>';
  const CT = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>';
  const RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
  const DOCRELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function zip(files) {
    const enc = new TextEncoder(), parts = [], central = []; let offset = 0;
    for (const [name, text] of files) {
      const nb = enc.encode(name), data = enc.encode(text), crc = crc32(data);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nb.length, true);
      parts.push(new Uint8Array(h.buffer), nb, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
      c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nb.length, true); c.setUint32(42, offset, true);
      central.push(new Uint8Array(c.buffer), nb);
      offset += 30 + nb.length + data.length;
    }
    const size = central.reduce((s, p) => s + p.length, 0), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, size, true); e.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }
  function buildDocx(title, list) {
    return zip([['[Content_Types].xml', CT], ['_rels/.rels', RELS], ['word/_rels/document.xml.rels', DOCRELS], ['word/styles.xml', STYLES], ['word/document.xml', documentXml(title, list)]]);
  }

  /* ---------- records ---------- */
  function add(r) {
    const key = clean(r.key ?? r.no ?? r.question);
    if (!records.has(key)) records.set(key, { no: clean(r.no), category: clean(r.category), question: clean(r.question), options: (r.options || []).map(clean), correctAnswer: clean(r.correctAnswer), explanation: clean(r.explanation), attempts: [] });
    const rec = records.get(key), ans = clean(r.yourAnswer);
    if (ans && !rec.attempts.includes(ans)) rec.attempts.push(ans);
    refresh();
  }
  function download(list) {
    const items = list || [...records.values()];
    if (!items.length) { alert('目前沒有錯題，不需要下載。🎉'); return false; }
    const title = pageTitle(), blob = buildDocx(title, items), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = `${title.replace(/[\\/:*?"<>|]/g, '').slice(0, 60)}_錯題_${new Date().toISOString().slice(0, 10)}.docx`;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  }

  /* ---------- floating bar ---------- */
  let bar;
  function mountBar() {
    if (bar || !cfg.bar) return;
    const style = document.createElement('style');
    style.textContent = '#mk-bar{position:fixed;right:14px;bottom:14px;z-index:2147483646;display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:14px;background:#0f172a;color:#fff;font:700 14px Arial,"Microsoft JhengHei",sans-serif;box-shadow:0 8px 24px #0005}#mk-bar b{color:#fca5a5}#mk-bar button{border:0;border-radius:10px;padding:9px 12px;font:900 14px Arial,"Microsoft JhengHei",sans-serif;cursor:pointer;background:#ef4444;color:#fff}#mk-bar button:hover{background:#dc2626}@media print{#mk-bar{display:none}}';
    document.head.append(style);
    bar = document.createElement('div'); bar.id = 'mk-bar';
    bar.innerHTML = '<span>錯題 <b id="mk-count">0</b> 題</span><button type="button" id="mk-end">⏹ 結束並下載錯題 DOCX</button>';
    document.body.append(bar);
    bar.querySelector('#mk-end').onclick = () => {
      if (!confirm(records.size ? `確定結束練習並下載 ${records.size} 題錯題 DOCX？` : '目前沒有錯題。確定結束練習？')) return;
      if (records.size) download();
      if (typeof cfg.onEnd === 'function') { try { cfg.onEnd(); } catch (e) { console.warn(e); } }
    };
    refresh();
  }
  function refresh() { const el = document.getElementById('mk-count'); if (el) el.textContent = records.size; }
  function init(options = {}) {
    cfg = { ...cfg, ...options };
    if (document.body) mountBar(); else document.addEventListener('DOMContentLoaded', mountBar);
  }
  /* 讓已有自己錯題清單的頁面定期同步進來：fn() 回傳 add() 格式的陣列 */
  function syncFrom(fn, ms = 800) {
    const tick = () => { try { const list = fn() || []; records.clear(); list.forEach(add); refresh(); } catch (_) {} };
    tick(); setInterval(tick, ms);
  }
  window.MistakeKit = { init, add, syncFrom, download, buildDocx, clear: () => { records.clear(); refresh(); }, count: () => records.size, records: () => [...records.values()] };
})();
