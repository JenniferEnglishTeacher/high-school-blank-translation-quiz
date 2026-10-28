const RESULT_SHEET = 'test result';
const RESPONSE_SHEET = 'question responses';
const RESULT_HEADERS = [
  'attemptId', 'timeDate', 'studentName', 'area', 'publisher',
  'bookUnit', 'quizType', 'quizTitle', 'pagePath', 'totalQuestions',
  'correctAnswers', 'wrongAnswers', 'scorePercentage',
  'mistakeQuestionNumbers', 'durationSeconds', 'device', 'recordingVersion'
];
const RESPONSE_HEADERS = [
  'attemptId', 'timeDate', 'studentName', 'className', 'testId', 'unitName',
  'grammarFocus', 'questionId', 'questionNumber', 'questionType',
  'studentAnswer', 'correctAnswer', 'isCorrect', 'errorTag', 'retryNumber',
  'responseTimeMs', 'correctScore'
];

function doGet() {
  return json_({ ok: true, service: 'Jennifer English Quiz Results', version: '2026-10-27-1' });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const payload = parsePayload_(e);
    if (!payload || payload.kind !== 'quiz-result') throw new Error('Invalid quiz result payload.');
    validatePayload_(payload);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const resultSheet = ensureSheet_(ss, RESULT_SHEET, RESULT_HEADERS);
    resultSheet.appendRow(RESULT_HEADERS.map(header => resultValue_(payload, header)));
    if (Array.isArray(payload.responses) && payload.responses.length) {
      const responseSheet = ensureSheet_(ss, RESPONSE_SHEET, RESPONSE_HEADERS);
      const rows = payload.responses.map(response => RESPONSE_HEADERS.map(header => responseValue_(payload, response || {}, header)));
      responseSheet.getRange(responseSheet.getLastRow() + 1, 1, rows.length, RESPONSE_HEADERS.length).setValues(rows);
    }
    return json_({ ok: true, attemptId: payload.attemptId });
  } catch (error) {
    return json_({ ok: false, error: String(error && error.message || error) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function parsePayload_(e) {
  const text = e && e.postData && e.postData.contents;
  if (text) {
    try { return JSON.parse(text); } catch (_) {}
  }
  return e && e.parameter ? e.parameter : null;
}

function validatePayload_(payload) {
  if (!payload.attemptId || !payload.studentName || !payload.pagePath) throw new Error('Missing attemptId, studentName, or pagePath.');
  const values = [payload.totalQuestions, payload.correctAnswers, payload.wrongAnswers].map(Number);
  if (!values.every(Number.isFinite) || values.some(value => value < 0)) throw new Error('Invalid score values.');
}

function ensureSheet_(ss, name, headers) {
  const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  const current = sheet.getRange(1, 1, 1, headers.length).getDisplayValues()[0];
  if (current.join('\u0001') !== headers.join('\u0001')) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#164C3D').setFontColor('#FFFFFF').setFontWeight('bold')
      .setHorizontalAlignment('center').setWrap(true);
  }
  return sheet;
}

function resultValue_(p, header) {
  const map = {
    attemptId: p.attemptId, timeDate: p.timeDate || new Date().toISOString(),
    studentName: clean_(p.studentName, 120),
    area: clean_(p.area, 160), publisher: clean_(p.publisher, 160),
    bookUnit: clean_(p.bookUnit, 160), quizType: clean_(p.quizType, 160),
    quizTitle: clean_(p.quizTitle, 240), pagePath: clean_(p.pagePath, 500),
    totalQuestions: number_(p.totalQuestions), correctAnswers: number_(p.correctAnswers),
    wrongAnswers: number_(p.wrongAnswers), scorePercentage: number_(p.scorePercentage),
    mistakeQuestionNumbers: clean_(p.mistakeQuestionNumbers, 1000),
    durationSeconds: number_(p.durationSeconds), device: clean_(p.device, 500),
    recordingVersion: clean_(p.recordingVersion, 80)
  };
  return map[header] === undefined ? '' : map[header];
}

function responseValue_(p, r, header) {
  const defaults = {
    attemptId: p.attemptId, timeDate: p.timeDate || new Date().toISOString(),
    studentName: clean_(p.studentName, 120), className: '',
    testId: clean_(p.pagePath, 500), unitName: clean_(p.bookUnit, 160), grammarFocus: clean_(p.quizType, 160)
  };
  if (Object.prototype.hasOwnProperty.call(defaults, header)) return defaults[header];
  if (['isCorrect', 'retryNumber', 'responseTimeMs', 'correctScore'].includes(header)) return number_(r[header]);
  return clean_(r[header], 1000);
}

function clean_(value, max) {
  const text = String(value == null ? '' : value).trim();
  return text.length > max ? text.slice(0, max) : text;
}

function number_(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
