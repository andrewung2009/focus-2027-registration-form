import { CAMP } from "../../config.js";
import { ageLabel, formatDisplayDate, paysYouthFee } from "../age.js";
import { counts, visiblePeople } from "../model.js";
import {
  COUNTRIES,
  DIET_NOTES_REQUIRED,
  DIET_OPTIONS,
  GENDERS,
  ID_TYPES,
  ROOM_GROUPS,
  STAY_OPTIONS,
  STAY_ROOM_OPTIONS,
  fieldsForMode,
  modeById,
  roomOption,
} from "../schema.js";
import { esc } from "./escape.js";

const option = (value, label, selected) => (
  `<option value="${esc(value)}"${selected === value ? " selected" : ""}>${esc(label)}</option>`
);

function nameField(person) {
  return `
    <label class="field field-span">
      <span class="field-label">Full name <span class="req">*</span></span>
      <input class="input" type="text" data-field="name" value="${esc(person.name)}"
        autocomplete="name" placeholder="As printed on IC or passport" maxlength="80">
      <p class="field-error" data-error="name"></p>
    </label>`;
}

function idField(person) {
  const isPassport = person.idType === "passport";
  const otherCountry = isPassport && person.idCountry === "OT";
  const placeholder = isPassport ? "Passport number" : "e.g. 900101-14-5678";
  const countryOptions = COUNTRIES
    .map((country) => option(country.code, country.name, person.idCountry))
    .join("");
  return `
    <div class="field field-span">
      <span class="field-label">IC / Passport <span class="req">*</span></span>
      <div class="field-row">
        <select class="input input-compact" data-field="idType" aria-label="Document type">
          ${ID_TYPES.map((type) => option(type.value, type.label, person.idType)).join("")}
        </select>
        <select class="input input-compact" data-field="idCountry" aria-label="Passport issuing country" ${isPassport ? "" : "hidden"}>
          <option value="">Issuing country</option>
          ${countryOptions}
        </select>
        <input class="input grow" type="text" data-field="idCountryOther" value="${esc(person.idCountryOther)}"
          maxlength="80" placeholder="Type the issuing country" ${otherCountry ? "" : "hidden"}>
        <input class="input grow" type="text" data-field="idNumber" value="${esc(person.idNumber)}"
          autocomplete="off" spellcheck="false" inputmode="${isPassport ? "text" : "numeric"}"
          placeholder="${placeholder}">
      </div>
      <p class="field-error" data-error="idCountry"></p>
      <p class="field-error" data-error="idCountryOther"></p>
      <p class="field-error" data-error="idNumber"></p>
    </div>`;
}

function dobField(person) {
  const display = person.dobDisplay || formatDisplayDate(person.dob);
  return `
    <div class="field">
      <span class="field-label">Date of birth <span class="req">*</span></span>
      <div class="dob-row">
        <input class="input grow" type="text" data-field="dob" value="${esc(display)}"
          autocomplete="bday" inputmode="numeric" maxlength="10" placeholder="dd/mm/yyyy"
          aria-label="Date of birth, dd/mm/yyyy">
      </div>
      <p class="field-error" data-error="dob"></p>
    </div>`;
}

function genderField(person) {
  return `
    <fieldset class="field">
      <legend class="field-label">Gender <span class="req">*</span></legend>
      <div class="segmented segmented-sm">
        ${GENDERS.map((gender) => `
          <label>
            <input type="radio" name="gender-${person.localId}" value="${gender.value}"
              data-field="gender" ${person.gender === gender.value ? "checked" : ""}>
            <span>${gender.label}</span>
          </label>`).join("")}
      </div>
      <p class="field-error" data-error="gender"></p>
    </fieldset>`;
}

function phoneField(person) {
  const countryOptions = COUNTRIES
    .map((country) => option(country.code, country.dial ? `+${country.dial} · ${country.name}` : country.name, person.phoneCountry))
    .join("");
  return `
    <div class="field field-span">
      <span class="field-label">Contact number <span class="req">*</span></span>
      <div class="field-row">
        <select class="input input-compact" data-field="phoneCountry" aria-label="Country code">
          ${countryOptions}
        </select>
        <input class="input grow" type="tel" data-field="phone" value="${esc(person.phone)}"
          autocomplete="tel" inputmode="tel" placeholder="12-345 6789">
      </div>
      <p class="field-error" data-error="phone"></p>
    </div>`;
}

function dietFields(person) {
  const showNotes = DIET_NOTES_REQUIRED.has(person.dietType);
  return `
    <label class="field">
      <span class="field-label">Dietary Requirements <span class="req">*</span></span>
      <select class="input" data-field="dietType">
        <option value="">Select an option</option>
        ${DIET_OPTIONS.map((diet) => option(diet.value, diet.label, person.dietType)).join("")}
      </select>
      <p class="field-error" data-error="dietType"></p>
    </label>
    <label class="field" data-diet-notes ${showNotes ? "" : "hidden"}>
      <span class="field-label">Please specify <span class="req">*</span></span>
      <input class="input" type="text" data-field="dietNotes" value="${esc(person.dietNotes)}"
        maxlength="300" placeholder="Describe this dietary requirement">
      <p class="field-error" data-error="dietNotes"></p>
    </label>`;
}

const PROGRAM_LABELS = { yes: "Yes", no: "No" };

function programField(person, section, locks) {
  const { field, label, hint } = section.program;
  const locked = locks && locks[field] !== undefined;
  const choices = locked
    ? `<span class="is-selected" role="radio" aria-checked="true">${esc(PROGRAM_LABELS[locks[field]])}</span>`
    : `
        <label>
          <input type="radio" name="${field}-${person.localId}" value="yes"
            data-field="${field}" ${person[field] === "yes" ? "checked" : ""}>
          <span>Yes</span>
        </label>
        <label>
          <input type="radio" name="${field}-${person.localId}" value="no"
            data-field="${field}" ${person[field] === "no" ? "checked" : ""}>
          <span>No</span>
        </label>`;
  return `
    <fieldset class="field field-span">
      <legend class="field-label">${esc(label)} <span class="req">*</span></legend>
      <div class="segmented segmented-sm">${choices}</div>
      ${hint ? `<p class="field-hint">${esc(hint)}</p>` : ""}
      <p class="field-error" data-error="${field}"></p>
    </fieldset>`;
}

function stayField(person, locks) {
  const otherYouths = person.stayWith === "other_youths";
  const specify = person.stayRoomPref === "specify";
  const locked = locks && locks.stayWith !== undefined;
  const choices = locked
    ? STAY_OPTIONS
        .filter((stay) => stay.value === locks.stayWith)
        .map((stay) => `<span class="is-selected" role="radio" aria-checked="true">${esc(stay.label)}</span>`)
        .join("")
    : STAY_OPTIONS.map((stay) => `
          <label>
            <input type="radio" name="stayWith-${person.localId}" value="${stay.value}"
              data-field="stayWith" ${person.stayWith === stay.value ? "checked" : ""}>
            <span>${esc(stay.label)}</span>
          </label>`).join("");
  return `
    <fieldset class="field field-span">
      <legend class="field-label">Accommodation Preference <span class="req">*</span></legend>
      <div class="segmented segmented-sm">${choices}</div>
      <p class="field-error" data-error="stayWith"></p>
    </fieldset>
    <fieldset class="field field-span" data-stay-choose ${otherYouths ? "" : "hidden"}>
      <legend class="field-label">Roommate preference <span class="req">*</span></legend>
      <div class="roommate-options">
        <div class="roommate-line">
          <label class="roommate-choice">
            <input type="radio" name="stayRoomPref-${person.localId}" value="specify"
              data-field="stayRoomPref" ${specify ? "checked" : ""}>
            <span>${esc(STAY_ROOM_OPTIONS[0].label)}</span>
          </label>
          <input class="input blank-input" type="text" data-field="stayRoommateName" value="${esc(person.stayRoommateName)}"
            maxlength="80" placeholder="type their full name" aria-label="Roommate full name">
        </div>
        <label class="roommate-choice">
          <input type="radio" name="stayRoomPref-${person.localId}" value="none"
            data-field="stayRoomPref" ${person.stayRoomPref === "none" ? "checked" : ""}>
          <span>${esc(STAY_ROOM_OPTIONS[1].label)}</span>
        </label>
      </div>
      <p class="field-hint">Final room and roommate assignments remain at the discretion of the Focus / Youth Team to ensure all participants are safely and comfortably accommodated within venue capacity.</p>
      <p class="field-error" data-error="stayRoommateName"></p>
      <p class="field-error" data-error="stayRoomPref"></p>
    </fieldset>`;
}

const ROOM_LINK = '<a href="https://amvertoncove.com/our-rooms" target="_blank" rel="noopener">amvertoncove.com/our-rooms</a>';
const ROOM_DISCLAIMER = "While we make every effort to accommodate your room preference, final assignments remain at the discretion of the Focus Team to ensure all participants are safely and comfortably accommodated within venue capacity.";

function roomCopy(mode, suiteGroup) {
  if (mode === "self") {
    return [
      `If you select Studio King: 1 King Size Bed, you will have the room to yourself. Please note that single occupancy requires paying the full 2-pax rate to cover total room costs. To view room layouts, visit ${ROOM_LINK}.`,
      ROOM_DISCLAIMER,
    ];
  }
  if (suiteGroup) {
    return [
      `To view room layouts, visit ${ROOM_LINK}.`,
      `Please note that Double Twin Suite and Deluxe Suite are available in limited numbers. ${ROOM_DISCLAIMER}`,
    ];
  }
  return [`To view room layouts, visit ${ROOM_LINK}.`, ROOM_DISCLAIMER];
}

function roommateChoice(person, specify) {
  return `
    <fieldset class="field field-span" data-rooming-choose ${person.rooming === "twin" ? "" : "hidden"}>
      <legend class="field-label">Studio Twin — pick a roommate option <span class="req">*</span></legend>
      <div class="roommate-options">
        <div class="roommate-line">
          <label class="roommate-choice">
            <input type="radio" name="roomingPref-${person.localId}" value="specify"
              data-field="roomingPref" ${specify ? "checked" : ""}>
            <span>I would like to room with</span>
          </label>
          <input class="input blank-input" type="text" data-field="roommateName" value="${esc(person.roommateName)}"
            maxlength="80" placeholder="type their full name" aria-label="Roommate full name">
        </div>
        <label class="roommate-choice">
          <input type="radio" name="roomingPref-${person.localId}" value="assign"
            data-field="roomingPref" ${person.roomingPref === "assign" ? "checked" : ""}>
          <span>Assign me a roommate</span>
        </label>
      </div>
      <p class="field-error" data-error="roommateName"></p>
      <p class="field-error" data-error="roomingPref"></p>
    </fieldset>`;
}

function roomingFields(person, mode = "self", adultCount = 1, showLegend = true) {
  const isSelf = mode === "self";
  const suiteGroup = mode === "friends" && adultCount >= 4;
  const values = suiteGroup ? ROOM_GROUPS.suite4 : ROOM_GROUPS.twin2;
  const options = values.map(roomOption).filter(Boolean);
  const specify = person.roomingPref === "specify";
  const copy = roomCopy(mode, suiteGroup).map((paragraph) => `<p class="field-hint">${paragraph}</p>`).join("");

  const legend = showLegend
    ? `<legend class="field-label">Room preference <span class="req">*</span></legend>`
    : "";
  const attrs = showLegend ? "" : ' aria-label="Room preference"';

  if (suiteGroup) {
    const byValue = (value) => options.find((option) => option.value === value);
    const optionCell = (option) => (option ? `
      <label class="room-opt">
        <input type="radio" name="rooming-${person.localId}" value="${option.value}"
          data-field="rooming" ${person.rooming === option.value ? "checked" : ""}>
        <span>${esc(option.label)}</span>
      </label>` : "");
    const imageCell = (option) => (option ? `
      <figure class="room-photo">
        <img src="${esc(option.image)}" alt="${esc(option.label)}" loading="lazy">
      </figure>` : "");
    const pair = (first, second) => `${optionCell(first)}${optionCell(second)}${imageCell(first)}${imageCell(second)}`;
    const cells = pair(byValue("double_queen"), byValue("double_twin_suite"))
      + pair(byValue("deluxe_suite"), byValue("family_suite"));
    return `
      <fieldset class="field field-span"${attrs}>
        ${legend}
        ${copy}
        <div class="room-suite-grid">${cells}</div>
        <p class="field-error" data-error="rooming"></p>
      </fieldset>`;
  }

  const choices = options.map((option) => `
    <label>
      <input type="radio" name="rooming-${person.localId}" value="${option.value}"
        data-field="rooming" ${person.rooming === option.value ? "checked" : ""}>
      <span>${esc(option.label)}</span>
    </label>`).join("");
  const seenImages = new Set();
  const gallery = options.filter((option) => {
    if (!option.image || seenImages.has(option.image)) return false;
    seenImages.add(option.image);
    return true;
  }).map((option) => `
    <figure class="room-photo">
      <img src="${esc(option.image)}" alt="${esc(option.label)}" loading="lazy">
    </figure>`).join("");
  return `
    <fieldset class="field field-span"${attrs}>
      ${legend}
      ${copy}
      <div class="segmented segmented-sm">${choices}</div>
      <div class="room-photos">${gallery}</div>
      <p class="field-error" data-error="rooming"></p>
    </fieldset>
    ${isSelf ? roommateChoice(person, specify) : ""}`;
}

export function renderRoomPanel(state) {
  const mode = modeById(state.mode);
  const lead = state.people.adult[0];
  if (!lead || !["self", "couple", "friends"].includes(mode.id)) return "";
  const adultCount = visiblePeople(state, "adult").length;
  return `
    <section class="panel room-panel" data-room-panel aria-labelledby="heading-room">
      <header class="panel-head">
        <div><h2 id="heading-room">Room preference</h2></div>
      </header>
      <div class="panel-body">
        <article class="person-card section-adult" data-person="${lead.localId}" data-section="adult">
          <div class="person-grid">
            ${roomingFields(lead, mode.id, adultCount, false)}
          </div>
        </article>
      </div>
    </section>`;
}

function emailField(person) {
  return `
    <label class="field field-span">
      <span class="field-label">Email address <span class="req">*</span></span>
      <input class="input" type="email" data-field="email" value="${esc(person.email)}"
        autocomplete="email" maxlength="120" placeholder="you@example.com">
      <p class="field-hint">Registration updates will be sent to this email.</p>
      <p class="field-error" data-error="email"></p>
    </label>`;
}

function fieldsFor(person, section, fieldIds, options = {}) {
  return fieldIds.map((field) => {
    switch (field) {
      case "name": return nameField(person);
      case "email": return emailField(person);
      case "id": return idField(person);
      case "dob": return dobField(person);
      case "gender": return genderField(person);
      case "phone": return phoneField(person);
      case "diet": return dietFields(person);
      case "program": return programField(person, section, options.locks);
      case "stay": return stayField(person, options.locks);
      case "rooming": return roomingFields(person, options.mode, options.adultCount);
      default: return "";
    }
  }).join("");
}

export function renderPersonCard(person, section, index, options = {}) {
  const label = options.label || `${section.label} ${index + 1}`;
  const isMainContact = section.id === "adult" && index === 0;
  return `
    <article class="person-card section-${section.id}" data-person="${person.localId}" data-section="${section.id}">
      <header class="person-head">
        <div class="person-id">
          <span class="pill">${esc(label)}</span>
          ${isMainContact ? '<span class="pill pill-main">Main contact</span>' : ""}
        </div>
        <div class="person-tools">
          <span class="age-readout" data-age>Age as at ${CAMP.ageAsOf}: ${esc(person.dob ? ageLabel(person.dob, CAMP.cutoffDate) : "—")}</span>
          ${options.canRemove ? '<button type="button" class="btn tiny ghost danger" data-remove>Remove</button>' : ""}
        </div>
      </header>
      ${isMainContact && section.note ? `<p class="card-note">${esc(section.note)}</p>` : ""}
      ${section.id === "adult" ? `<p class="card-note fee-note" data-fee-note${paysYouthFee(person.dob) ? "" : " hidden"}>Note: this person will pay the youth camp fee for Focus 2027.</p>` : ""}
      <p class="card-alert" data-alert hidden></p>
      <div class="person-grid">
        ${fieldsFor(person, section, options.fields || section.fields, options)}
      </div>
    </article>`;
}

function renderGuardianPanel(guardian) {
  return `
    <section class="panel section-adult guardian-panel" data-panel="guardian" aria-labelledby="heading-guardian">
      <header class="panel-head">
        <div>
          <h2 id="heading-guardian">Parent / Legal Guardian</h2>
        </div>
      </header>
      <div class="panel-body">
        <article class="person-card section-adult" data-person="${guardian.localId}" data-section="guardian">
          <div class="person-grid">
            ${nameField(guardian)}
            ${emailField(guardian)}
            ${idField(guardian)}
            ${phoneField(guardian)}
          </div>
        </article>
      </div>
    </section>`;
}

export function renderSection(state, section) {
  const mode = modeById(state.mode);
  const people = visiblePeople(state, section.id);
  const totals = counts(state);
  const total = totals.adult + totals.youth + totals.child;
  const atTotalCap = mode.maxTotal !== null && mode.maxTotal !== undefined && total >= mode.maxTotal;
  const atAdultCap = section.id === "adult"
    && mode.maxAdults !== null && mode.maxAdults !== undefined && people.length >= mode.maxAdults;
  const groupSizeControls = mode.id === "friends" && section.id === "adult";
  const addable = (section.id === "adult" ? mode.addAdults : true) && !atTotalCap && !atAdultCap && !groupSizeControls;
  const canRemove = section.id === "adult"
    ? mode.removeAdults && people.length > mode.minAdults && !groupSizeControls
    : people.length > 0;
  const cards = people.map((person, index) => renderPersonCard(person, section, index, {
    canRemove,
    fields: fieldsForMode(section, mode, section.id === "adult" && index === 0).filter((field) => field !== "rooming"),
    label: mode.maxAdults === 1 ? `${section.label} registration` : `${section.label} ${index + 1}`,
    locks: section.id === "youth" ? mode.locks : undefined,
    mode: mode.id,
    adultCount: section.id === "adult" ? people.length : 0,
  })).join("");
  const empty = !people.length ? `
    <p class="empty-state">No ${(section.heading || section.plural).toLowerCase()} added yet.</p>` : "";
  const capNote = atTotalCap ? `
    <p class="empty-state">This registration type is capped at ${mode.maxTotal} people.</p>` : "";
  const addControl = addable ? `
    <div class="panel-add">
      <button type="button" class="btn small" data-add="${section.id}">${esc(people.length ? section.addLabel : section.firstAddLabel || section.addLabel)}</button>
    </div>` : "";

  const guardianPanel = mode.guardian && section.id === "youth" && state.guardian
    ? renderGuardianPanel(state.guardian)
    : "";

  const groupSizeControl = groupSizeControls ? `
    <div class="group-size">
      <span class="field-label">Group size <span class="req">*</span></span>
      <div class="segmented segmented-sm">
        <label>
          <input type="radio" name="groupSize" value="2" data-group-size ${people.length <= 2 ? "checked" : ""}>
          <span>2 adults</span>
        </label>
        <label>
          <input type="radio" name="groupSize" value="4" data-group-size ${people.length >= 4 ? "checked" : ""}>
          <span>4 adults</span>
        </label>
      </div>
    </div>` : "";

  return `
    ${guardianPanel}
    <section class="panel section-${section.id}" data-panel="${section.id}" aria-labelledby="heading-${section.id}">
      <header class="panel-head">
        <div>
          <h2 id="heading-${section.id}">${esc(section.heading || section.plural)}</h2>
          <p class="panel-sub">${esc(section.ages)}</p>
        </div>
      </header>
      <div class="panel-body">
        ${groupSizeControl}
        ${cards}
        ${empty}
        ${capNote}
        ${addControl}
      </div>
    </section>`;
}
