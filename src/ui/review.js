import { CAMP } from "../../config.js";
import { ageLabel, formatDisplayDate } from "../age.js";
import {
  DIET_OPTIONS,
  GENDERS,
  ID_TYPES,
  STAY_OPTIONS,
  modeById,
} from "../schema.js";
import { getCountry, toE164 } from "../validate.js";
import { formatBytes } from "./proof.js";
import { esc } from "./escape.js";

const CHECK_ICON = `<svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>`;

const labelFor = (options, value) => options.find((option) => option.value === value)?.label || "—";

function countsText(counts) {
  const parts = [`${counts.adult} ${counts.adult === 1 ? "adult" : "adults"}`];
  if (counts.youth) parts.push(`${counts.youth} youth`);
  if (counts.child) parts.push(`${counts.child} ${counts.child === 1 ? "child" : "children"}`);
  return parts.join(" · ");
}

function dietText(person) {
  const label = labelFor(DIET_OPTIONS, person.dietType);
  const notes = String(person.dietNotes || "").trim();
  return notes ? `${label} (${notes})` : label;
}

function detailsFor(person, section) {
  const phone = toE164(person.phone, person.phoneCountry) || person.phone;
  const countryName = person.idCountry === "OT"
    ? (String(person.idCountryOther || "").trim() || "Other country")
    : person.idCountry ? getCountry(person.idCountry).name : "";
  const idText = person.idType === "passport"
    ? `Passport · ${countryName || "—"} · ${person.idNumber}`
    : `${labelFor(ID_TYPES, person.idType)} · ${person.idNumber}`;
  const rows = [
    ["Date of birth", `${formatDisplayDate(person.dob)} · ${ageLabel(person.dob, CAMP.cutoffDate)} at ${CAMP.name} ${CAMP.year}`],
    ["IC / Passport", idText],
    ["Gender", labelFor(GENDERS, person.gender)],
    ["Contact number", phone],
  ];
  if (person.email) rows.push(["Email address", person.email]);
  rows.push(["Dietary requirements", dietText(person)]);

  if (section.id === "youth") {
    rows.push(["Youth program", person.youthProgram === "yes" ? "Joining" : "Not joining"]);
    rows.push(["Accommodation preference", labelFor(STAY_OPTIONS, person.stayWith)]);
  }
  if (section.id === "child") {
    rows.push(["CHTBB program", person.chtbbProgram === "yes" ? "Joining" : "Not joining"]);
  }
  if (person.rooming) {
    rows.push(["Room selection", person.rooming === "twin" ? "Twin sharing" : "Single occupancy (pay 2-pax rate)"]);
    if (person.rooming === "twin") {
      rows.push(["Roommate preference", person.roomingPref === "specify"
        ? `Rooming with ${person.roommateName}`
        : "Assign me a roommate"]);
    }
  }
  return rows;
}

function personBlock(person, section, label) {
  return `
    <article class="review-person section-${section.id}">
      <div class="review-person-head">
        <strong>${esc(person.name)}</strong>
        <span class="pill">${esc(label)}</span>
      </div>
      <dl class="review-grid">
        ${detailsFor(person, section).map(([term, value]) => `
          <div>
            <dt>${esc(term)}</dt>
            <dd>${esc(value)}</dd>
          </div>`).join("")}
      </dl>
    </article>`;
}

export function renderReview(state, entries, counts) {
  const mode = modeById(state.mode);
  const groups = ["adult", "youth", "child"].map((sectionId) => {
    const people = entries.filter((entry) => entry.section === sectionId);
    if (!people.length) return "";
    const plural = sectionId === "child" ? "Children" : sectionId === "youth" ? "Youth" : "Adults";
    return `
      <section class="review-group" aria-labelledby="review-${sectionId}">
        <h3 class="review-group-head" id="review-${sectionId}">
          ${plural} <span class="count">${people.length}</span>
        </h3>
        ${people.map((entry, index) => personBlock(
          entry.person,
          { id: sectionId },
          `${sectionId === "youth" ? "Youth" : sectionId === "child" ? "Child" : "Adult"} ${index + 1}`,
        )).join("")}
      </section>`;
  }).join("");

  return `
    <section class="panel review-panel" aria-labelledby="review-heading">
      <header class="panel-head">
        <div>
          <h2 class="review-heading" id="review-heading" tabindex="-1">Review your registration</h2>
          <p class="panel-sub">${esc(mode.label)} · ${countsText(counts)}</p>
        </div>
      </header>
      <div class="panel-body">
        <p class="review-note">Check every detail below. If anything is wrong, go back and edit before submitting.</p>
        ${groups}
        ${(state.proof || []).length ? `
        <div class="review-proof">
          <h3 class="review-group-head">Proof of payment</h3>
          <ul class="review-proof-files">
            ${(state.proof || []).map((file) => `<li>Attached receipt: <strong>${esc(file.name)}</strong> (${esc(formatBytes(file.size))})</li>`).join("")}
          </ul>
        </div>` : ""}
        <div class="review-actions">
          <button type="button" class="btn" data-edit>Back to edit</button>
          <button type="button" class="btn primary" data-submit>Submit</button>
        </div>
        <p class="submit-status" data-submit-status role="status" aria-live="polite" hidden></p>
        <p class="review-fineprint">Submit once only. Your details are sent to the ${CAMP.name} ${CAMP.year} registration team.</p>
      </div>
    </section>`;
}

export function renderSuccess(result) {
  return `
    <section class="panel success-panel" aria-labelledby="success-heading">
      <div class="success-icon" aria-hidden="true">${CHECK_ICON}</div>
      <h2 class="success-heading" id="success-heading" tabindex="-1">Registration received</h2>
      <p class="success-lede">Thank you for registering for ${CAMP.name} ${CAMP.year}! We have successfully received your form submission and payment details.</p>
      <p class="ref-label">Your reference</p>
      <p class="ref-code">${esc(result.registrationId)}</p>
      <p class="review-note">Keep this reference. If you need to change or cancel this registration, contact the church office and quote it.</p>
      <div class="success-next">
        <h3>What&rsquo;s Next?</h3>
        <div class="next-item">
          <p class="next-title">1. Waiver &amp; Consent Forms</p>
          <p>Please ensure everyone in your group completes the online Waiver &amp; Consent Form. Your registration status remains <strong>pending</strong> until forms are submitted for all campers.</p>
          <p>🔗 <a href="https://forms.gle/Rn5F3EwvKCvXuUoK8" target="_blank" rel="noopener">Complete Waiver / Consent Form Here</a>.</p>
          <p class="next-side">(If you registered adult friends in the group booking, please forward the link above to them so they can submit their individual waivers!)</p>
        </div>
        <div class="next-item">
          <p class="next-title">2. Confirmation Email</p>
          <p>Once verified, you will receive a confirmation email.</p>
        </div>
      </div>
      <div class="success-help">
        <h3>❓ Need Help or Changes?</h3>
        <p>If you have any urgent questions or need to make changes to your submission, please reach out to us at <a href="mailto:focus@htbb.org">focus@htbb.org</a>.</p>
      </div>
      <button type="button" class="btn primary" data-reset>Submit another form</button>
    </section>`;
}
