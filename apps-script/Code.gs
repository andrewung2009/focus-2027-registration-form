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

var PROOF_FOLDER_NAME = "Focus 2027 Proof of Payment";

var PROOF_LINK_COLUMN = 29;

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
  "Room preference",
  "Roommate preference",
  "Roommate name",
  "Proof of payment",
  "Proof file name",
  "Stay roommate preference",
  "Stay roommate name",
  "Guardian name",
  "Guardian email",
  "Guardian ID type",
  "Guardian ID country",
  "Guardian ID number",
  "Guardian contact number (E.164)",
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
        proofUrl: row[28],
        proofName: row[29],
        people: [],
      };
      order.push(registrationId);
    } else {
      var existing = byId[registrationId];
      if (!existing.groupSize) existing.groupSize = Number(row[4]) || 0;
      if (!existing.adults) existing.adults = Number(row[5]) || 0;
      if (!existing.youths) existing.youths = Number(row[6]) || 0;
      if (!existing.children) existing.children = Number(row[7]) || 0;
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
      stayRoomPref: row[30],
      stayRoommateName: row[31],
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

    var proofUrl = "";
    var proofName = "";
    var proofItems = Array.isArray(payload.proof) ? payload.proof : payload.proof && payload.proof.data ? [payload.proof] : [];
    var proofLinks = [];
    var proofLabels = [];
    var proofPairs = [];
    for (var proofIndex = 0; proofIndex < proofItems.length; proofIndex += 1) {
      var proofItem = proofItems[proofIndex];
      if (!proofItem || !proofItem.data) continue;
      try {
        var savedProof = saveProof(payload.registrationId + "-" + (proofLinks.length + 1), proofItem);
        if (savedProof.ok) {
          proofLinks.push(savedProof.url);
          proofLabels.push(proofItem.name);
          proofPairs.push({ url: savedProof.url, name: proofItem.name });
        } else {
          proofLabels.push("ERROR: the file could not be saved.");
        }
      } catch (proofError) {
        proofLabels.push("ERROR: " + String(proofError && proofError.message || proofError).slice(0, 180));
      }
    }
    proofUrl = proofLinks.join("\n");
    proofName = proofLabels.join("\n");

    var guardian = payload.guardian || {};
    var rows = payload.people.map(function (person, personIndex) {
      var showCounts = personIndex === 0;
      return [
        new Date(),
        payload.registrationId,
        payload.camp,
        payload.modeLabel,
        showCounts ? payload.people.length : "",
        showCounts ? payload.counts.adult : "",
        showCounts ? payload.counts.youth : "",
        showCounts ? payload.counts.child : "",
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
        proofUrl,
        proofName,
        person.stayRoomPref || "",
        person.stayRoommateName || "",
        guardian.name || "",
        guardian.email || "",
        guardian.idType || "",
        guardian.idCountry || "",
        guardian.idNumber || "",
        guardian.phoneE164 || "",
      ];
    });

    var startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
    if (proofPairs.length) {
      applyProofLinkCells(sheet, startRow, rows.length, proofPairs);
    }
    return reply({ ok: true, registrationId: payload.registrationId, count: payload.people.length });
  } catch (error) {
    return reply({ ok: false, error: "Could not save the registration. Please try again. [" + String(error && error.message || error) + "]" });
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

function saveProof(registrationId, proof) {
  var bytes = Utilities.base64Decode(proof.data);
  if (!bytes || !bytes.length) return { ok: false };
  var ext = proof.mimeType === "application/pdf" ? "pdf" : "jpg";
  var mime = ext === "pdf" ? "application/pdf" : "image/jpeg";
  var blob = Utilities.newBlob(bytes, mime, registrationId + "." + ext);
  var file = proofFolder().createFile(blob);
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (ignoredSharingError) {
  }
  return { ok: true, url: file.getUrl() };
}

function applyProofLinkCells(sheet, startRow, rowCount, pairs) {
  var text = pairs.map(function (pair) { return pair.url; }).join("\n");
  var builder = SpreadsheetApp.newRichTextValue().setText(text);
  var offset = 0;
  for (var index = 0; index < pairs.length; index += 1) {
    builder = builder.setLinkUrl(offset, offset + pairs[index].url.length, pairs[index].url);
    offset += pairs[index].url.length + 1;
  }
  var rich = builder.build();
  for (var row = 0; row < rowCount; row += 1) {
    sheet.getRange(startRow + row, PROOF_LINK_COLUMN).setRichTextValue(rich);
  }
  sheet.getRange(startRow, PROOF_LINK_COLUMN, rowCount, 1).setWrap(true);
}

function proofFolder() {
  var folders = DriveApp.getFoldersByName(PROOF_FOLDER_NAME);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(PROOF_FOLDER_NAME);
}

function ensureHeaders(sheet) {
  var existing = sheet.getLastRow() === 0 ? [] : sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  var missing = false;
  for (var index = 0; index < HEADERS.length; index += 1) {
    if (existing[index] !== HEADERS[index]) missing = true;
  }
  if (!missing) return;
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.setFrozenRows(1);
}

function normaliseGroupCounts() {
  var sheet = getSheet();
  ensureHeaders(sheet);
  var last = sheet.getLastRow();
  if (last < 2) return;
  var ids = sheet.getRange(2, 2, last - 1, 1).getValues();
  var seen = {};
  for (var index = 0; index < ids.length; index += 1) {
    var id = String(ids[index][0]);
    if (!id) continue;
    if (!seen[id]) {
      seen[id] = true;
      continue;
    }
    sheet.getRange(index + 2, 5, 1, 4).setValues([["", "", "", ""]]);
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
