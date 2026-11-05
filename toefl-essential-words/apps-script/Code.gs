const SPREADSHEET_ID = '1y8aIYpMF2gLxjtJD-fSHpqznhhCwLojIfCMVspjW-Js';
const SHEET_NAME = 'test result';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Missing sheet: ' + SHEET_NAME);
    sheet.appendRow([
      new Date(),
      String(data.studentName || '').slice(0, 80),
      String(data.unitTested || '').slice(0, 30),
      String(data.wrongWords || '').slice(0, 5000)
    ]);
    return ContentService.createTextOutput(JSON.stringify({ok: true}))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return ContentService.createTextOutput('TOEFL quiz result collector is running.');
}
