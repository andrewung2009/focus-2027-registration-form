import { CAMP } from "../config.js";
import { DIET_NOTES_REQUIRED, MODES, SECTIONS, modeById, sectionById } from "./schema.js";
import { ageLabel, displayToISO, formatDobTyping } from "./age.js";
import {
  allEntries,
  blankPerson,
  counts,
  createState,
  ensureMode,
  findPerson,
  pruneBlank,
  visiblePeople,
} from "./model.js";
import { renderSection } from "./ui/person-card.js";
import { renderReview, renderSuccess } from "./ui/review.js";
import { buildPayload, buildRegistrationId, sendRegistration } from "./submit.js";
import {
  fieldError,
  formatMyKadTyping,
  sectionMismatchFor,
  validatePerson,
  validateRegistration,
} from "./validate.js";

const root = document.getElementById("app");
const banner = document.getElementById("banner");
const state = createState();
let stage = "edit";
let registrationId = "";
let lastResult = null;
let submitting = false;

function visibleSections() {
  const mode = modeById(state.mode);
  return SECTIONS.filter((section) => mode.sections.includes(section.id));
}

function plural(count, singular, pluralForm) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function renderModeBar() {
  return `
    <section class="mode-bar">
      <div class="mode-copy">
        <h2>Who is registering?</h2>
        <p>Choose the option that fits your group.</p>
      </div>
      <div class="mode-grid" role="radiogroup" aria-label="Registration type">
        ${MODES.map((mode) => `
          <label class="mode-option${mode.id === state.mode ? " is-active" : ""}">
            <input type="radio" name="mode" value="${mode.id}" data-mode ${mode.id === state.mode ? "checked" : ""}>
            <span class="mode-title">${mode.label}</span>
            <span class="mode-hint">${mode.hint}</span>
          </label>`).join("")}
      </div>
    </section>`;
}

function renderCounts() {
  const mode = modeById(state.mode);
  const totals = counts(state);
  const parts = [
    `<span><strong>${totals.adult}</strong> ${totals.adult === 1 ? "adult" : "adults"}</span>`,
  ];
  if (mode.sections.includes("youth")) {
    parts.push(`<span><strong>${totals.youth}</strong> youth</span>`);
  }
  if (mode.sections.includes("child")) {
    parts.push(`<span><strong>${totals.child}</strong> ${totals.child === 1 ? "child" : "children"}</span>`);
  }
  if (mode.adultCounts) {
    parts.push(`<span class="count-note">${mode.adultCounts.join(" or ")} adults</span>`);
  } else if (mode.minAdults > 1) {
    parts.push(`<span class="count-note">Exactly ${mode.minAdults} adult${mode.minAdults === 1 ? "" : "s"}</span>`);
  }
  if (mode.maxTotal) {
    parts.push(`<span class="count-note">Maximum ${mode.maxTotal} people</span>`);
  }
  return parts.join("");
}

function renderActionBar() {
  return `
    <section class="actionbar" aria-label="Form summary">
      <div class="counts">${renderCounts()}</div>
      <div class="actions">
        <button type="button" class="btn primary" data-review>Review registration</button>
      </div>
    </section>`;
}

function render() {
  const intro = document.querySelector(".intro");
  if (intro) intro.hidden = stage !== "edit";
  if (stage === "review") {
    root.innerHTML = renderReview(state, allEntries(state), counts(state));
    return;
  }
  if (stage === "success") {
    root.innerHTML = renderSuccess(lastResult);
    return;
  }
  root.innerHTML = [
    renderModeBar(),
    visibleSections().map((section) => renderSection(state, section)).join(""),
    renderActionBar(),
  ].join("");
}

function clearBanner() {
  banner.hidden = true;
  banner.textContent = "";
  banner.className = "banner";
}

function showBanner(kind, message) {
  banner.hidden = false;
  banner.className = `banner ${kind}`;
  banner.textContent = message;
}

function showFieldError(card, key, message) {
  const errorElement = card.querySelector(`[data-error="${key}"]`);
  if (errorElement) errorElement.textContent = message || "";
  card.querySelectorAll(`[data-field="${key}"]`).forEach((input) => {
    if (message) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  });
}

function refreshCard(person) {
  const card = root.querySelector(`[data-person="${person.localId}"]`);
  if (!card) return;

  const ageElement = card.querySelector("[data-age]");
  if (ageElement) {
    ageElement.textContent = person.dob
      ? `Age as at ${CAMP.ageAsOf}: ${ageLabel(person.dob, CAMP.cutoffDate)}`
      : `Age as at ${CAMP.ageAsOf}: —`;
  }

  const alert = card.querySelector("[data-alert]");
  const mismatch = sectionMismatchFor(person);
  if (alert) {
    alert.hidden = !mismatch;
    alert.textContent = mismatch ? mismatch.message : "";
  }
  if (mismatch) card.setAttribute("data-mismatch", "true");
  else card.removeAttribute("data-mismatch");

  const notesWrap = card.querySelector("[data-diet-notes]");
  const notesRequired = DIET_NOTES_REQUIRED.has(person.dietType);
  const notesInput = card.querySelector('[data-field="dietNotes"]');
  if (notesWrap) {
    notesWrap.hidden = !notesRequired;
    if (!notesRequired) {
      const notesError = card.querySelector('[data-error="dietNotes"]');
      if (notesError) notesError.textContent = "";
      notesInput?.removeAttribute("aria-invalid");
    }
  }
  if (notesInput) notesInput.setAttribute("aria-required", notesRequired ? "true" : "false");

  const idNumber = card.querySelector('[data-field="idNumber"]');
  if (idNumber) {
    const isPassport = person.idType === "passport";
    idNumber.placeholder = isPassport ? "Passport number" : "e.g. 900101-14-5678";
    idNumber.setAttribute("inputmode", isPassport ? "text" : "numeric");
  }

  const idCountry = card.querySelector('[data-field="idCountry"]');
  if (idCountry) idCountry.hidden = person.idType !== "passport";

  const phone = card.querySelector('[data-field="phone"]');
  if (phone) {
    phone.placeholder = person.phoneCountry === "MY"
      ? "12-345 6789"
      : person.phoneCountry === "OT"
        ? "+country code and number"
        : "Number without leading 0";
  }

  const roomingChoose = card.querySelector("[data-rooming-choose]");
  if (roomingChoose) roomingChoose.hidden = person.rooming !== "twin";

  const staleKeys = [];
  if (person.rooming !== "twin") staleKeys.push("roomingPref");
  if (person.rooming !== "twin" || person.roomingPref !== "specify") staleKeys.push("roommateName");
  for (const key of staleKeys) {
    const errorElement = card.querySelector(`[data-error="${key}"]`);
    if (errorElement) errorElement.textContent = "";
    card.querySelectorAll(`[data-field="${key}"]`).forEach((input) => input.removeAttribute("aria-invalid"));
  }
}

function validateFieldUI(input) {
  const card = input.closest("[data-person]");
  if (!card) return;
  const person = findPerson(state, card.dataset.person);
  if (!person) return;
  const { key, message } = fieldError(person, input.dataset.field);
  showFieldError(card, key, message);
  refreshCard(person);
}

function incompletePeopleIn(sectionId) {
  const section = sectionById(sectionId);
  return visiblePeople(state, sectionId)
    .map((person) => ({ person, result: validatePerson(person, { section: sectionId, fields: section.fields }) }))
    .filter((entry) => !entry.result.ok);
}

function showIncomplete(entries, sectionId) {
  for (const { person, result } of entries) {
    const card = root.querySelector(`[data-person="${person.localId}"]`);
    if (!card) continue;
    card.querySelectorAll("[data-error]").forEach((element) => {
      element.textContent = "";
    });
    card.querySelectorAll("[aria-invalid]").forEach((element) => {
      element.removeAttribute("aria-invalid");
    });
    for (const [key, message] of Object.entries(result.errors)) showFieldError(card, key, message);
    refreshCard(person);
  }
  const section = sectionById(sectionId);
  const count = entries.length;
  const noun = count === 1
    ? `the ${section.label.toLowerCase()} above`
    : `${count} ${section.plural.toLowerCase()} above`;
  const hasFieldErrors = entries.some(({ result }) => Object.keys(result.errors).length > 0);
  const message = hasFieldErrors
    ? `Complete all details for ${noun} before adding another ${section.label.toLowerCase()}.`
    : `Fix the highlighted details for ${noun} before adding another ${section.label.toLowerCase()}.`;
  showBanner("error", message);

  const first = root.querySelector(`[data-person="${entries[0].person.localId}"]`);
  if (first) {
    first.scrollIntoView({ behavior: "smooth", block: "center" });
    first.querySelector("[aria-invalid='true']")?.focus({ preventScroll: true });
  } else {
    banner.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function addPerson(sectionId) {
  const mode = modeById(state.mode);
  if (sectionId === "adult" && !mode.addAdults) return;

  const totals = counts(state);
  const total = totals.adult + totals.youth + totals.child;
  if (mode.maxTotal && total >= mode.maxTotal) {
    showBanner("error", `This registration type allows up to ${mode.maxTotal} people. Remove someone before adding another.`);
    banner.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  if (sectionId === "adult" && mode.maxAdults && totals.adult >= mode.maxAdults) return;

  const incomplete = incompletePeopleIn(sectionId);
  if (incomplete.length) {
    showIncomplete(incomplete, sectionId);
    return;
  }

  const person = blankPerson(sectionId);
  state.people[sectionId].push(person);
  clearBanner();
  render();
  const card = root.querySelector(`[data-person="${person.localId}"]`);
  if (card) {
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.querySelector('[data-field="name"]')?.focus({ preventScroll: true });
  }
}

function removePerson(localId) {
  const mode = modeById(state.mode);
  for (const [sectionId, list] of Object.entries(state.people)) {
    const index = list.findIndex((person) => person.localId === localId);
    if (index === -1) continue;
    if (sectionId === "adult") {
      if (!mode.removeAdults) return;
      if (list.length <= mode.minAdults) return;
    }
    list.splice(index, 1);
    clearBanner();
    render();
    return;
  }
}

function setMode(modeId) {
  if (modeId === state.mode) return;
  state.mode = modeId;
  pruneBlank(state);
  ensureMode(state);
  clearBanner();
  render();
}

function clearErrors() {
  root.querySelectorAll("[data-error]").forEach((element) => {
    element.textContent = "";
  });
  root.querySelectorAll("[aria-invalid]").forEach((element) => {
    element.removeAttribute("aria-invalid");
  });
}

function validateForm() {
  const entries = allEntries(state);
  const { ok, results, formErrors } = validateRegistration(state, entries);

  clearErrors();
  for (const [localId, result] of Object.entries(results)) {
    const card = root.querySelector(`[data-person="${localId}"]`);
    if (!card) continue;
    for (const [key, message] of Object.entries(result.errors)) {
      showFieldError(card, key, message);
    }
  }
  for (const entry of entries) refreshCard(entry.person);

  return { entries, ok, results, formErrors };
}

function showValidationErrors(entries, results, formErrors) {
  const failing = entries.filter((entry) => !results[entry.person.localId].ok).length;
  const messages = [...formErrors];
  if (failing) messages.push(`${plural(failing, "person needs", "people need")} attention.`);
  showBanner("error", messages.join(" "));

  const first = root.querySelector("[aria-invalid='true']") || root.querySelector("[data-mismatch]");
  if (first) {
    first.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusable = first.matches("[data-field]") ? first : first.querySelector("[data-field], input, select");
    focusable?.focus({ preventScroll: true });
  } else {
    banner.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function goReview() {
  const { entries, ok, results, formErrors } = validateForm();
  if (!ok) {
    showValidationErrors(entries, results, formErrors);
    return;
  }

  registrationId = buildRegistrationId();
  stage = "review";
  clearBanner();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
  root.querySelector("#review-heading")?.focus({ preventScroll: true });
}

async function submitRegistration() {
  if (submitting) return;
  submitting = true;
  clearBanner();

  const button = root.querySelector("[data-submit]");
  const status = root.querySelector("[data-submit-status]");
  if (button) {
    button.disabled = true;
    button.textContent = "Submitting…";
  }
  if (status) {
    status.hidden = false;
    status.textContent = "Sending your registration…";
  }

  const payload = buildPayload(state, allEntries(state), { registrationId });
  const result = await sendRegistration(payload);
  submitting = false;

  if (!result.ok) {
    if (button) {
      button.disabled = false;
      button.textContent = "Submit";
    }
    if (status) status.hidden = true;
    showBanner("error", result.error);
    banner.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  lastResult = result;
  stage = "success";
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
  root.querySelector("#success-heading")?.focus({ preventScroll: true });
}

function resetRegistration() {
  const fresh = createState();
  state.mode = fresh.mode;
  state.people = fresh.people;
  registrationId = "";
  lastResult = null;
  submitting = false;
  stage = "edit";
  clearBanner();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

root.addEventListener("input", (event) => {
  const input = event.target.closest("[data-field]");
  if (!input) return;
  const card = input.closest("[data-person]");
  if (!card) return;
  const person = findPerson(state, card.dataset.person);
  if (!person) return;

  const field = input.dataset.field;
  if (field === "dob") {
    const display = formatDobTyping(input.value);
    input.value = display;
    person.dobDisplay = display;
    person.dob = displayToISO(display);
  } else if (field === "idNumber" && person.idType === "mykad") {
    const formatted = formatMyKadTyping(input.value);
    input.value = formatted;
    person.idNumber = formatted;
  } else if (field === "phone" && person.phoneCountry === "MY") {
    const cleaned = input.value.replace(/^0+(?=\d)/, "");
    if (cleaned !== input.value) input.value = cleaned;
    person.phone = cleaned;
  } else {
    person[field] = input.value;
    if (field === "roommateName" && person.rooming === "twin" && input.value.trim() && person.roomingPref !== "specify") {
      person.roomingPref = "specify";
      const specifyRadio = card.querySelector('input[type="radio"][name^="roomingPref"][value="specify"]');
      if (specifyRadio) specifyRadio.checked = true;
      refreshCard(person);
    }
  }
  clearBanner();

  const { key, message } = fieldError(person, field);
  const errorElement = card.querySelector(`[data-error="${key}"]`);
  if (errorElement && errorElement.textContent) showFieldError(card, key, message);

  if (["dob", "dietType", "idType", "rooming", "roomingPref"].includes(field)) refreshCard(person);
});

root.addEventListener("change", (event) => {
  const modeInput = event.target.closest("[data-mode]");
  if (modeInput) {
    setMode(modeInput.value);
    return;
  }

  const input = event.target.closest("[data-field]");
  if (!input) return;
  const card = input.closest("[data-person]");
  const person = card ? findPerson(state, card.dataset.person) : null;
  if (!person) return;
  if (input.dataset.field === "dob") {
    const display = formatDobTyping(input.value);
    input.value = display;
    person.dobDisplay = display;
    person.dob = displayToISO(display);
    clearBanner();
    validateFieldUI(input);
    return;
  }

  if (input.dataset.field === "idNumber" && person.idType === "mykad") {
    const formatted = formatMyKadTyping(input.value);
    input.value = formatted;
    person.idNumber = formatted;
    clearBanner();
    validateFieldUI(input);
    return;
  }

  person[input.dataset.field] = input.value;

  if (input.dataset.field === "roomingPref" && input.value === "assign") {
    person.roommateName = "";
    const blankInput = card.querySelector('[data-field="roommateName"]');
    if (blankInput) blankInput.value = "";
  }

  if (input.dataset.field === "idType") {
    if (person.idType === "mykad") {
      const formatted = formatMyKadTyping(person.idNumber);
      person.idNumber = formatted;
      const numberInput = card.querySelector('[data-field="idNumber"]');
      if (numberInput) numberInput.value = formatted;
    } else if (person.idNumber) {
      const formatted = person.idNumber.replace(/-/g, "");
      person.idNumber = formatted;
      const numberInput = card.querySelector('[data-field="idNumber"]');
      if (numberInput) numberInput.value = formatted;
    }
    clearBanner();
    refreshCard(person);
    const numberInput = card.querySelector('[data-field="idNumber"]');
    if (numberInput) validateFieldUI(numberInput);
    return;
  }

  clearBanner();
  if (input.tagName === "SELECT" || input.type === "radio") validateFieldUI(input);
});

root.addEventListener("focusout", (event) => {
  const input = event.target.closest("[data-field]");
  if (!input || input.type === "radio") return;
  validateFieldUI(input);
});

root.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add]");
  if (addButton) {
    addPerson(addButton.dataset.add);
    return;
  }

  const removeButton = event.target.closest("[data-remove]");
  if (removeButton) {
    const card = removeButton.closest("[data-person]");
    if (card) removePerson(card.dataset.person);
    return;
  }

  if (event.target.closest("[data-review]")) {
    goReview();
    return;
  }

  if (event.target.closest("[data-edit]")) {
    stage = "edit";
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  if (event.target.closest("[data-submit]")) {
    submitRegistration();
    return;
  }

  if (event.target.closest("[data-reset]")) {
    resetRegistration();
  }
});

render();
