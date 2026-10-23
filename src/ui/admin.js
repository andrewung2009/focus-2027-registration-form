import { CAMP } from "../../config.js";
import { esc } from "./escape.js";
import { DIET_OPTIONS, STAY_OPTIONS } from "../schema.js";

const KEY_STORAGE = "f27-admin-key";
const SECTIONS = { adult: "Adult", youth: "Youth", child: "Child" };
const ID_TYPES = { mykad: "MyKad", passport: "Passport" };
const YES_NO = { yes: "Joining", no: "Not joining" };

const notice = document.getElementById("notice");
const keyForm = document.getElementById("key-form");
const keyInput = document.getElementById("key-input");
const toolbar = { search: document.getElementById("search"), refresh: document.getElementById("refresh") };
const summaryEl = document.getElementById("summary");
const listEl = document.getElementById("responses");
const footnote = document.getElementById("footnote");

let responses = [];
let stats = null;
let query = "";

keyInput.value = localStorage.getItem(KEY_STORAGE) || "";
const storedKey = keyInput.value;

keyForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const key = keyInput.value.trim();
  if (!key) {
    showNotice("Enter the admin key to continue.", "error");
    return;
  }
  localStorage.setItem(KEY_STORAGE, key);
  loadResponses(key);
});

toolbar.refresh.addEventListener("click", () => {
  const key = localStorage.getItem(KEY_STORAGE);
  if (key) loadResponses(key);
});

toolbar.search.addEventListener("input", () => {
  query = toolbar.search.value.trim().toLowerCase();
  renderList();
});

function showNotice(message, kind) {
  notice.hidden = false;
  notice.textContent = message;
  notice.className = `adm-notice ${kind || ""}`;
}

function hideNotice() {
  notice.hidden = true;
  notice.textContent = "";
}

async function loadResponses(key) {
  showNotice("Loading responses…", "info");
  let data;
  try {
    const response = await fetch(`${CAMP.endpoint}?view=responses&key=${encodeURIComponent(key)}`);
    data = await response.json();
  } catch {
    showNotice("Could not reach the response endpoint. Check that the Apps Script was redeployed with the latest Code.gs version.", "error");
    return;
  }
  if (!data || data.ok !== true) {
    showNotice(data?.error || "The response endpoint rejected the request. Check the admin key.", "error");
    return;
  }
  if (data.service || !data.stats || !Array.isArray(data.responses)) {
    showNotice("The Apps Script answered but the responses view isn't available yet — paste the updated Code.gs and redeploy it as a new version (Deploy → Manage deployments → New version).", "error");
    return;
  }
  hideNotice();
  stats = data.stats;
  responses = Array.isArray(data.responses) ? data.responses.slice().reverse() : [];
  keyForm.hidden = true;
  toolbar.search.hidden = false;
  toolbar.refresh.hidden = false;
  footnote.hidden = false;
  renderSummary();
  renderList();
}

function renderSummary() {
  summaryEl.hidden = false;
  const chips = [
    ["Responses", stats.responses],
    ["Total campers", stats.campers],
    ["Adults", stats.adults],
    ["Youths", stats.youths],
    ["Children", stats.children],
  ];
  summaryEl.innerHTML = chips.map(([label, value]) => `
    <div class="adm-stat">
      <span class="adm-stat-value">${esc(value)}</span>
      <span class="adm-stat-label">${esc(label)}</span>
    </div>`).join("");
}

function matchesQuery(response) {
  if (!query) return true;
  if (response.registrationId.toLowerCase().includes(query)) return true;
  return response.people.some((person) => (
    String(person.name).toLowerCase().includes(query)
    || String(person.idNumber).toLowerCase().includes(query)
    || String(person.email).toLowerCase().includes(query)
  ));
}

function renderList() {
  listEl.hidden = false;
  const visible = responses.filter(matchesQuery);
  if (!visible.length) {
    listEl.innerHTML = `<p class="empty-state">${responses.length ? "No responses match your search." : "No responses yet."}</p>`;
    return;
  }
  listEl.innerHTML = visible.map(renderResponse).join("");
}

function renderProofLinks(response) {
  const urls = String(response.proofUrl || "").split("\n").map((url) => url.trim()).filter(Boolean);
  const names = String(response.proofName || "").split("\n").map((name) => name.trim()).filter(Boolean);
  if (!urls.length) return "";
  return urls.map((url, index) => {
    const label = names[index] || `Receipt ${index + 1}`;
    const badge = label.startsWith("ERROR") ? `<span class="field-error">${esc(label)}</span>` : "";
    return `<a class="adm-proof" href="${esc(url)}" target="_blank" rel="noopener">View proof of payment &middot; ${esc(label)}</a>${badge}`;
  }).join("");
}

function renderResponse(response) {
  const received = formatTimestamp(response.receivedAt);
  return `
    <details class="adm-response panel">
      <summary>
        <span class="adm-response-id">${esc(response.registrationId)}</span>
        <span class="pill">${esc(response.modeLabel)}</span>
        <span class="adm-response-meta">${esc(received)} · ${esc(response.groupSize)} ${response.groupSize === 1 ? "camper" : "campers"}</span>
      </summary>
      <div class="adm-response-body">
        ${renderProofLinks(response)}
        ${response.people.map((person) => renderPerson(person)).join("")}
      </div>
    </details>`;
}

function renderPerson(person) {
  const rows = [
    ["Camper type", SECTIONS[person.section] || person.section, "pill"],
    ["Date of birth", person.dob],
    ["Identity", identityText(person)],
    ["Gender", person.gender === "male" ? "Male" : person.gender === "female" ? "Female" : person.gender],
    ["Contact", person.phoneE164],
    ["Email", person.email],
    ["Diet", dietText(person)],
  ];
  if (person.section === "youth") {
    rows.push(["Youth program", YES_NO[person.youthProgram] || ""]);
    rows.push(["Stay preference", stayLabel(person.stayWith)]);
  }
  if (person.section === "child") {
    rows.push(["CHTBB program", YES_NO[person.chtbbProgram] || ""]);
  }
  if (person.section === "adult" && person.rooming) {
    rows.push(["Room selection", person.rooming === "twin" ? "Twin sharing" : "Single occupancy"]);
    if (person.rooming === "twin") {
      rows.push(["Roommate", person.roomingPref === "assign" ? "Assigned by us" : person.roommateName]);
    }
  }

  return `
    <div class="adm-person">
      <div class="adm-person-head">
        <span class="adm-person-name">${esc(person.name)}</span>
        <span class="pill">${esc(SECTIONS[person.section] || person.section)}</span>
      </div>
      <dl class="adm-fields">
        ${rows.filter(([, value]) => value).map(([label, value]) => `
          <div class="adm-field">
            <dt>${esc(label)}</dt>
            <dd>${esc(value)}</dd>
          </div>`).join("")}
      </dl>
    </div>`;
}

function formatTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value === 0 ? "" : value);
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function identityText(person) {
  if (!person.idNumber) return "";
  const type = ID_TYPES[person.idType] || person.idType;
  return person.idType === "passport"
    ? `${type}${person.idCountry ? ` · ${person.idCountry}` : ""} · ${person.idNumber}`
    : `${type} · ${person.idNumber}`;
}

function dietText(person) {
  const label = DIET_OPTIONS.find((option) => option.value === person.dietType)?.label;
  return person.dietNotes ? `${label || person.dietType} — ${person.dietNotes}` : label || person.dietType || "";
}

function stayLabel(value) {
  return STAY_OPTIONS.find((option) => option.value === value)?.label || value || "";
}
