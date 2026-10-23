import { CAMP } from "../../config.js";
import { ageLabel, formatDisplayDate } from "../age.js";
import { counts, visiblePeople } from "../model.js";
import {
  COUNTRIES,
  DIET_NOTES_REQUIRED,
  DIET_OPTIONS,
  GENDERS,
  ID_TYPES,
  ROOM_IMAGES,
  ROOM_OPTIONS,
  STAY_OPTIONS,
  fieldsForMode,
  modeById,
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
        <input class="input grow" type="text" data-field="idNumber" value="${esc(person.idNumber)}"
          autocomplete="off" spellcheck="false" inputmode="${isPassport ? "text" : "numeric"}"
          placeholder="${placeholder}">
      </div>
      <input class="input" type="text" data-field="idCountryOther" value="${esc(person.idCountryOther)}"
        maxlength="80" placeholder="Type the issuing country" ${otherCountry ? "" : "hidden"}>
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

function programField(person, section) {
  const { field, label, hint } = section.program;
  return `
    <fieldset class="field field-span">
      <legend class="field-label">${esc(label)} <span class="req">*</span></legend>
      <div class="segmented segmented-sm">
        <label>
          <input type="radio" name="${field}-${person.localId}" value="yes"
            data-field="${field}" ${person[field] === "yes" ? "checked" : ""}>
          <span>Yes</span>
        </label>
        <label>
          <input type="radio" name="${field}-${person.localId}" value="no"
            data-field="${field}" ${person[field] === "no" ? "checked" : ""}>
          <span>No</span>
        </label>
      </div>
      ${hint ? `<p class="field-hint">${esc(hint)}</p>` : ""}
      <p class="field-error" data-error="${field}"></p>
    </fieldset>`;
}

function stayField(person) {
  return `
    <fieldset class="field field-span">
      <legend class="field-label">Accommodation Preference <span class="req">*</span></legend>
      <div class="segmented segmented-sm">
        ${STAY_OPTIONS.map((stay) => `
          <label>
            <input type="radio" name="stayWith-${person.localId}" value="${stay.value}"
              data-field="stayWith" ${person.stayWith === stay.value ? "checked" : ""}>
            <span>${stay.label}</span>
          </label>`).join("")}
      </div>
      <p class="field-error" data-error="stayWith"></p>
    </fieldset>`;
}

function roomingFields(person) {
  const twin = person.rooming === "twin";
  const specify = person.roomingPref === "specify";
  return `
    <fieldset class="field field-span">
      <legend class="field-label">Room preference <span class="req">*</span></legend>
      <div class="segmented segmented-sm">
        ${ROOM_OPTIONS.map((option) => `
          <label>
            <input type="radio" name="rooming-${person.localId}" value="${option.value}"
              data-field="rooming" ${person.rooming === option.value ? "checked" : ""}>
            <span>${esc(option.label)}</span>
          </label>`).join("")}
      </div>
      <p class="field-hint">If you select Studio King: 1 King Size Bed, you will have the room to yourself. Please note that single occupancy requires paying the full 2-pax rate to cover total room costs. To view room layouts, visit <a href="https://amvertoncove.com/our-rooms" target="_blank" rel="noopener">amvertoncove.com/our-rooms</a>.</p>
      <div class="room-photos">
        ${ROOM_OPTIONS.map((option) => {
          const image = ROOM_IMAGES[option.value];
          if (!image) return "";
          return `
            <figure class="room-photo">
              <img src="${esc(image.src)}" alt="${esc(image.alt)}" loading="lazy">
              <figcaption>${esc(option.short)}</figcaption>
            </figure>`;
        }).join("")}
      </div>
      <p class="field-hint">While we make every effort to accommodate your room preference, final assignments remain at the discretion of the Focus Team to ensure all participants are safely and comfortably accommodated within venue capacity.</p>
      <p class="field-error" data-error="rooming"></p>
    </fieldset>
    <fieldset class="field field-span" data-rooming-choose ${twin ? "" : "hidden"}>
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

function fieldsFor(person, section, fieldIds) {
  return fieldIds.map((field) => {
    switch (field) {
      case "name": return nameField(person);
      case "email": return emailField(person);
      case "id": return idField(person);
      case "dob": return dobField(person);
      case "gender": return genderField(person);
      case "phone": return phoneField(person);
      case "diet": return dietFields(person);
      case "program": return programField(person, section);
      case "stay": return stayField(person);
      case "rooming": return roomingFields(person);
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
      <p class="card-alert" data-alert hidden></p>
      <div class="person-grid">
        ${fieldsFor(person, section, options.fields || section.fields)}
      </div>
    </article>`;
}

export function renderSection(state, section) {
  const mode = modeById(state.mode);
  const people = visiblePeople(state, section.id);
  const totals = counts(state);
  const total = totals.adult + totals.youth + totals.child;
  const atTotalCap = mode.maxTotal !== null && mode.maxTotal !== undefined && total >= mode.maxTotal;
  const atAdultCap = section.id === "adult"
    && mode.maxAdults !== null && mode.maxAdults !== undefined && people.length >= mode.maxAdults;
  const addable = (section.id === "adult" ? mode.addAdults : true) && !atTotalCap && !atAdultCap;
  const canRemove = section.id === "adult"
    ? mode.removeAdults && people.length > mode.minAdults
    : people.length > 0;
  const cards = people.map((person, index) => renderPersonCard(person, section, index, {
    canRemove,
    fields: fieldsForMode(section, mode, section.id === "adult" && index === 0),
    label: mode.maxAdults === 1 ? `${section.label} registration` : `${section.label} ${index + 1}`,
  })).join("");
  const empty = !people.length ? `
    <p class="empty-state">No ${(section.heading || section.plural).toLowerCase()} added yet.</p>` : "";
  const capNote = atTotalCap ? `
    <p class="empty-state">This registration type is capped at ${mode.maxTotal} people.</p>` : "";
  const addControl = addable ? `
    <div class="panel-add">
      <button type="button" class="btn small" data-add="${section.id}">${esc(people.length ? section.addLabel : section.firstAddLabel || section.addLabel)}</button>
    </div>` : "";

  return `
    <section class="panel section-${section.id}" data-panel="${section.id}" aria-labelledby="heading-${section.id}">
      <header class="panel-head">
        <div>
          <h2 id="heading-${section.id}">${esc(section.heading || section.plural)}</h2>
          <p class="panel-sub">${esc(section.ages)}</p>
        </div>
      </header>
      <div class="panel-body">
        ${cards}
        ${empty}
        ${capNote}
        ${addControl}
      </div>
    </section>`;
}
