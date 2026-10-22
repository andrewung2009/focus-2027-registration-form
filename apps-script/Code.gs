/**
 * HTBB Focus 2027 registration endpoint.
 *
 * Paste this into a Google Apps Script project attached to your
 * spreadsheet (Extensions > Apps Script), then deploy it as
 * described in the README under "Connecting to Google Sheets".
 * Real locking is best-effort: if it cannot be acquired within two seconds the
 * registration is still saved. Duplicate submissions are filtered out by the
 * registration ID instead.
 */

var SHEET_NAME = "Registrations";

var HEADERS = [
  "Received at",
  "Registration ID",
  "Camp",
  "Registration type",
  "Group size",
  "Adults",
  "Youths",
  "Children",
  "Form version",
  "Submitted at",
  "Section",
  "Name",
  "Email",
  "ID type",
  "ID country",
  "ID number",
  "Date of birth",
  "Gender",
  "Contact number",
  "Contact number (E.164)",
  "Diet type",
  "Diet notes",
  "Youth program",
  "CHTBB program",
  "Stay preference",
  "Room selection",
  "Roommate preference",
  "Roommate name",
];

function doGet() {
  return reply({ ok: true, service: "HTBB Focus 2027 registration endpoint" });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var locked = false;
  try {
    locked = lock.tryLock(2000);
  } catch (ignoredLockError) {
    locked = false;
  }
  try {
    var payload = JSON.parse(e.postData.contents);
    if (!payload || !payload.registrationId || !Array.isArray(payload.people) || payload.people.length === 0) {
      return reply({ ok: false, error: "Invalid registration payload." });
    }

    var sheet = getSheet();
    if (alreadySaved(sheet, payload.registrationId)) {
      return reply({ ok: true, registrationId: payload.registrationId, count: payload.people.length });
    }
    ensureHeaders(sheet);

    var rows = payload.people.map(function (person) {
      return [
        new Date(),
        payload.registrationId,
        payload.camp,
        payload.modeLabel,
        payload.people.length,
        payload.counts.adult,
        payload.counts.youth,
        payload.counts.child,
        payload.formVersion,
        payload.submittedAt,
        person.section,
        person.name,
        person.email,
        person.idType,
        person.idCountry,
        person.idNumber,
        person.dob,
        person.gender,
        person.phone,
        person.phoneE164,
        person.dietType,
        person.dietNotes,
        person.youthProgram,
        person.chtbbProgram,
        person.stayWith,
        person.rooming,
        person.roomingPref,
        person.roommateName,
      ];
    });

    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    return reply({ ok: true, registrationId: payload.registrationId, count: payload.people.length });
  } catch (error) {
    return reply({ ok: false, error: "Could not save the registration. Please try again." });
  } finally {
    if (locked) lock.releaseLock();
  }
}

function getSheet() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    ensureHeaders(sheet);
  }
  return sheet;
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }
}

function alreadySaved(sheet, registrationId) {
  if (sheet.getLastRow() < 2) return false;
  var ids = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues();
  return ids.some(function (row) { return row[0] === registrationId; });
}

function reply(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
