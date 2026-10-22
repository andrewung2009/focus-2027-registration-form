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

var ADMIN_KEY = "F27-yihqOrMReA9ong";

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

function doGet(e) {
  var params = e && e.parameter ? e.parameter : {};
  if (params.view === "responses") return responsesView(params);
  return reply({ ok: true, service: "HTBB Focus 2027 registration endpoint" });
}

function responsesView(params) {
  if (params.key !== ADMIN_KEY) {
    return reply({ ok: false, error: "Invalid admin key." });
  }
  var sheet = getSheet();
  ensureHeaders(sheet);
  var last = sheet.getLastRow();
  var values = last < 2 ? [] : sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();

  var byId = {};
  var order = [];
  for (var index = 0; index < values.length; index += 1) {
    var row = values[index];
    var registrationId = String(row[1]);
    if (!registrationId) continue;
    if (!byId[registrationId]) {
      byId[registrationId] = {
        registrationId: registrationId,
        receivedAt: row[0],
        camp: row[2],
        modeLabel: row[3],
        groupSize: Number(row[4]) || 0,
        adults: Number(row[5]) || 0,
        youths: Number(row[6]) || 0,
        children: Number(row[7]) || 0,
        formVersion: row[8],
        submittedAt: row[9],
        people: [],
      };
      order.push(registrationId);
    }
    byId[registrationId].people.push({
      section: row[10],
      name: row[11],
      email: row[12],
      idType: row[13],
      idCountry: row[14],
      idNumber: row[15],
      dob: row[16],
      gender: row[17],
      phoneE164: row[19],
      dietType: row[20],
      dietNotes: row[21],
      youthProgram: row[22],
      chtbbProgram: row[23],
      stayWith: row[24],
      rooming: row[25],
      roomingPref: row[26],
      roommateName: row[27],
    });
  }

  var responses = order.map(function (id) { return byId[id]; });
  var totals = { campers: 0, adults: 0, youths: 0, children: 0 };
  for (var index2 = 0; index2 < responses.length; index2 += 1) {
    totals.campers += responses[index2].groupSize;
    totals.adults += responses[index2].adults;
    totals.youths += responses[index2].youths;
    totals.children += responses[index2].children;
  }

  return reply({
    ok: true,
    generatedAt: new Date().toISOString(),
    stats: { responses: responses.length, campers: totals.campers, adults: totals.adults, youths: totals.youths, children: totals.children },
    responses: responses,
  });
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
