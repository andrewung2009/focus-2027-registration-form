import { AGE_BANDS, CAMP, CHTBB_BAND, CUTOFF_DATE } from "../config.js";
import { ageLabel, displayToISO, fitsBand, formatDisplayDate, parseDate, sectionForDob } from "./age.js";
import {
  COUNTRIES,
  DIET_NOTES_REQUIRED,
  DIET_OPTIONS,
  GENDERS,
  STAY_OPTIONS,
  modeById,
  sectionById,
} from "./schema.js";

const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} .'@-]*$/u;
const PASSPORT_RE = /^[A-Z0-9]{6,12}$/;
const DISPLAY_DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

const MYKAD_STATES = new Set();
for (let n = 1; n <= 16; n += 1) MYKAD_STATES.add(String(n).padStart(2, "0"));
for (let n = 21; n <= 24; n += 1) MYKAD_STATES.add(String(n).padStart(2, "0"));

export function formatDate(value) {
  const date = value instanceof Date ? value : parseDate(value);
  if (!date) return "";
  return formatDisplayDate(date);
}

export function getCountry(code) {
  return COUNTRIES.find((country) => country.code === code) || COUNTRIES[0];
}

export function validateName(value) {
  const name = String(value ?? "").trim();
  if (!name) return "Full name is required.";
  if (name.length < 2) return "Name must be at least 2 characters.";
  if (name.length > 80) return "Name must be 80 characters or fewer.";
  if (/\d/.test(name)) return "Name cannot contain numbers.";
  if (!NAME_RE.test(name)) return "Name contains characters that are not allowed.";
  return null;
}

export function normaliseMyKad(value) {
  return String(value ?? "").replace(/[\s-]/g, "").toUpperCase();
}

export function normalisePassport(value) {
  return String(value ?? "").trim().toUpperCase();
}

export function formatMyKadTyping(value) {
  const digits = String(value ?? "").replace(/\D/g, "").slice(0, 12);
  if (digits.length <= 6) return digits;
  if (digits.length <= 8) return `${digits.slice(0, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
}

function mykadCandidates(yy, mm, dd) {
  const candidates = [];
  for (const base of [1900, 2000]) {
    const date = buildCandidate(base + yy, mm, dd);
    if (date) candidates.push(date);
  }
  return candidates;
}

function buildCandidate(year, month, day) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

function closestCandidate(candidates, dob) {
  if (!candidates.length) return null;
  if (!dob) return candidates[0];
  return candidates.reduce((best, candidate) => (
    Math.abs(candidate.getTime() - dob.getTime()) < Math.abs(best.getTime() - dob.getTime()) ? candidate : best
  ));
}

export function validateMyKad(value, dobValue) {
  const id = normaliseMyKad(value);
  if (!id) return "IC number is required.";
  if (!/^\d{12}$/.test(id)) return "MyKad numbers are 12 digits, e.g. 900101-14-5678.";
  const state = id.slice(6, 8);
  if (!MYKAD_STATES.has(state)) return `“${state}” is not a valid MyKad state code.`;
  const candidates = mykadCandidates(Number(id.slice(0, 2)), Number(id.slice(2, 4)), Number(id.slice(4, 6)));
  if (!candidates.length) return "The first 6 digits of the MyKad are not a valid birth date.";
  const dob = parseDate(dobValue);
  if (dob && !candidates.some((candidate) => candidate.getTime() === dob.getTime())) {
    const shown = closestCandidate(candidates, dob);
    return `The MyKad birth date (${formatDate(shown)}) does not match the date of birth entered.`;
  }
  return null;
}

export function validatePassport(value) {
  const id = normalisePassport(value);
  if (!id) return "Passport number is required.";
  if (!PASSPORT_RE.test(id)) return "Passport numbers are 6 to 12 letters or digits, with no spaces or symbols.";
  return null;
}

export function validatePassportCountry(value) {
  const code = String(value ?? "").trim();
  if (!code) return "Select the country that issued this passport.";
  if (!COUNTRIES.some((country) => country.code === code)) return "Select a valid country.";
  return null;
}

export function validatePassportCountryOther(value) {
  const name = String(value ?? "").trim();
  if (!name) return "Type the country that issued this passport.";
  if (name.length > 80) return "Country name must be 80 characters or fewer.";
  if (!/^[\p{L}\p{M}][\p{L}\p{M} .'()-]*$/u.test(name)) return "Enter a valid country name.";
  return null;
}

export function validateId(person) {
  if (person.idType === "passport") return validatePassport(person.idNumber);
  return validateMyKad(person.idNumber, person.dob);
}

export function validateChtbbAge(dobValue) {
  const dob = parseDate(dobValue);
  const cutoff = parseDate(CUTOFF_DATE);
  if (!dob || !cutoff) return null;
  if (fitsBand(dob, cutoff, CHTBB_BAND)) return null;
  return "The CHTBB program is for children aged 1½ to 10 at Focus 2027 (born 02/01/2017 to 01/07/2026).";
}

export function validateDob(value) {
  if (!value) return "Date of birth is required.";
  const dob = parseDate(value);
  if (!dob) return "Enter a valid date of birth.";
  if (dob.getUTCFullYear() < 1900) return "Date of birth must be from 1900 onwards.";
  const cutoff = parseDate(CUTOFF_DATE);
  if (dob.getTime() > cutoff.getTime()) return `Date of birth must be on or before ${formatDate(CUTOFF_DATE)}.`;
  return null;
}

export function validateDobDisplay(person) {
  const display = person.dobDisplay || formatDisplayDate(person.dob);
  if (!display) return "Date of birth is required.";
  if (!DISPLAY_DATE_RE.test(display)) return "Enter the date of birth as dd/mm/yyyy.";
  const iso = displayToISO(display);
  if (!iso) return "Enter a real date of birth as dd/mm/yyyy.";
  return validateDob(person.dob || iso);
}

export function validateGender(value) {
  if (!GENDERS.some((gender) => gender.value === value)) return "Select a gender.";
  return null;
}

export function normalisePhoneDigits(value, countryCode) {
  const country = getCountry(countryCode);
  let digits = String(value ?? "").replace(/[^\d]/g, "");
  if (!digits) return "";
  if (country.dial && digits.startsWith(country.dial)) {
    const rest = digits.slice(country.dial.length);
    if (rest.length >= country.nsnMin) digits = rest;
  }
  return digits.replace(/^0+/, "");
}

export function toE164(value, countryCode) {
  const country = getCountry(countryCode);
  const digits = normalisePhoneDigits(value, countryCode);
  if (!digits) return "";
  return country.dial ? `+${country.dial}${digits}` : `+${digits}`;
}

export function validatePhone(value, countryCode) {
  const country = getCountry(countryCode);
  const raw = String(value ?? "").trim();
  if (!raw) return "Contact number is required.";
  if (/[^\d+\s().-]/.test(raw)) return "Contact number can only contain digits, spaces and + ( ) - .";
  const digits = normalisePhoneDigits(raw, countryCode);
  if (!digits) return "Contact number is required.";
  if (country.code === "MY") {
    if (/^1\d{8,9}$/.test(digits)) return null;
    if (/^[3-9]\d{7,8}$/.test(digits)) return null;
    return "Enter a Malaysian mobile (e.g. 12-345 6789) or landline (e.g. 3-1234 5678) without the leading 0.";
  }
  if (country.code === "OT") {
    if (!raw.startsWith("+")) return "For other countries enter the number with its + country code.";
    if (digits.length < 7 || digits.length > 15) return "International numbers must have 7 to 15 digits.";
    return null;
  }
  if (digits.length < country.nsnMin || digits.length > country.nsnMax) {
    return `${country.name} numbers must have ${country.nsnMin === country.nsnMax ? country.nsnMin : `${country.nsnMin} to ${country.nsnMax}`} digits after the country code.`;
  }
  if (digits.startsWith("0")) return "Remove the leading 0 when entering an international number.";
  return null;
}

export function validateDietType(value) {
  if (!value) return "Select a dietary requirement.";
  if (!DIET_OPTIONS.some((option) => option.value === value)) return "Select a valid dietary requirement.";
  return null;
}

export function validateDietNotes(value, dietType) {
  const notes = String(value ?? "").trim();
  if (DIET_NOTES_REQUIRED.has(dietType) && !notes) return "Please describe this dietary requirement.";
  if (notes.length > 300) return "Keep diet notes to 300 characters or fewer.";
  return null;
}

export function validateProgram(value) {
  if (value !== "yes" && value !== "no") return "Choose yes or no.";
  return null;
}

export function validateStay(value) {
  if (!STAY_OPTIONS.some((option) => option.value === value)) return "Choose an accommodation preference.";
  return null;
}

export function validateStayRoomPref(value) {
  if (value !== "specify" && value !== "none") return "Choose who you want to room with, or say you have no preference.";
  return null;
}

export function validateRooming(value) {
  if (value !== "twin" && value !== "single") return "Select a room option.";
  return null;
}

export function validateRoomingPref(value) {
  if (value !== "specify" && value !== "assign") return "Choose who you want to room with, or have us assign one.";
  return null;
}

export function validateRoommateName(value) {
  const name = String(value ?? "").trim();
  if (!name) return "Enter the name of the person you want to room with.";
  return validateName(name);
}

export function programFieldFor(sectionId) {
  return sectionById(sectionId)?.program?.field || null;
}

export function sectionMismatchFor(person) {
  if (!person.dob || validateDob(person.dob)) return null;
  const actual = sectionForDob(person.dob, CUTOFF_DATE, AGE_BANDS);
  const age = ageLabel(person.dob, CUTOFF_DATE);
  if (!actual) {
    return {
      section: null,
      age,
      message: `At ${CAMP.name} ${CAMP.year} this person would be ${age}, which is outside the Focus 2027 age ranges.`,
    };
  }
  if (actual === person.section) return null;
  const label = sectionById(actual).label;
  const current = sectionById(person.section).label;
  return {
    section: actual,
    age,
    message: `This date of birth makes them ${age} at ${CAMP.name} ${CAMP.year}, which belongs in the ${label} section. Move them out of ${current} to continue.`,
  };
}

export function validateEmail(value) {
  const email = String(value ?? "").trim();
  if (!email) return "Email address is required.";
  if (email.length > 120) return "Email must be 120 characters or fewer.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return "Enter a valid email address, e.g. name@example.com.";
  }
  return null;
}

export function validatePerson(person, options = {}) {
  const sectionId = options.section || person.section;
  const section = sectionById(sectionId);
  const fields = options.fields || section.fields;
  const errors = {};

  if (fields.includes("name")) {
    const message = validateName(person.name);
    if (message) errors.name = message;
  }
  if (fields.includes("email")) {
    const message = validateEmail(person.email);
    if (message) errors.email = message;
  }
  if (fields.includes("id")) {
    if (person.idType === "passport") {
      const countryMessage = validatePassportCountry(person.idCountry);
      if (countryMessage) errors.idCountry = countryMessage;
      else if (person.idCountry === "OT") {
        const otherMessage = validatePassportCountryOther(person.idCountryOther);
        if (otherMessage) errors.idCountryOther = otherMessage;
      }
    }
    const message = validateId(person);
    if (message) errors.idNumber = message;
  }
  if (fields.includes("dob")) {
    const message = validateDobDisplay(person);
    if (message) errors.dob = message;
  }
  if (fields.includes("gender")) {
    const message = validateGender(person.gender);
    if (message) errors.gender = message;
  }
  if (fields.includes("phone")) {
    const message = validatePhone(person.phone, person.phoneCountry);
    if (message) errors.phone = message;
  }
  if (fields.includes("diet")) {
    const typeMessage = validateDietType(person.dietType);
    if (typeMessage) errors.dietType = typeMessage;
    const notesMessage = validateDietNotes(person.dietNotes, person.dietType);
    if (notesMessage) errors.dietNotes = notesMessage;
  }
  if (fields.includes("program")) {
    const field = programFieldFor(sectionId);
    if (field) {
      const message = validateProgram(person[field]);
      if (message) errors[field] = message;
      else if (sectionId === "child" && person.chtbbProgram === "yes") {
        const chtbbMessage = validateChtbbAge(person.dob);
        if (chtbbMessage) errors.chtbbProgram = chtbbMessage;
      }
    }
  }
  if (fields.includes("stay")) {
    const message = validateStay(person.stayWith);
    if (message) errors.stayWith = message;
    else if (person.stayWith === "other_youths") {
      const prefMessage = validateStayRoomPref(person.stayRoomPref);
      if (prefMessage) errors.stayRoomPref = prefMessage;
      if (person.stayRoomPref === "specify") {
        const nameMessage = validateRoommateName(person.stayRoommateName);
        if (nameMessage) errors.stayRoommateName = nameMessage;
      }
    }
  }
  if (fields.includes("rooming")) {
    const roomMessage = validateRooming(person.rooming);
    if (roomMessage) errors.rooming = roomMessage;
    else if (person.rooming === "twin") {
      const prefMessage = validateRoomingPref(person.roomingPref);
      if (prefMessage) errors.roomingPref = prefMessage;
      if (person.roomingPref === "specify") {
        const nameMessage = validateRoommateName(person.roommateName);
        if (nameMessage) errors.roommateName = nameMessage;
      }
    }
  }

  const mismatch = fields.includes("dob") ? sectionMismatchFor({ ...person, section: sectionId }) : null;
  return { ok: Object.keys(errors).length === 0 && !mismatch, errors, mismatch };
}

export function fieldError(person, field) {
  switch (field) {
    case "name":
      return { key: "name", message: validateName(person.name) };
    case "email":
      return { key: "email", message: validateEmail(person.email) };
    case "idType":
    case "idNumber":
      return { key: "idNumber", message: validateId(person) };
    case "idCountry":
      return { key: "idCountry", message: person.idType === "passport" ? validatePassportCountry(person.idCountry) : null };
    case "idCountryOther":
      return {
        key: "idCountryOther",
        message: person.idType === "passport" && person.idCountry === "OT"
          ? validatePassportCountryOther(person.idCountryOther)
          : null,
      };
    case "dob":
      return { key: "dob", message: validateDobDisplay(person) };
    case "gender":
      return { key: "gender", message: validateGender(person.gender) };
    case "phone":
    case "phoneCountry":
      return { key: "phone", message: validatePhone(person.phone, person.phoneCountry) };
    case "dietType": {
      const notes = validateDietNotes(person.dietNotes, person.dietType);
      if (notes) return { key: "dietNotes", message: notes };
      return { key: "dietType", message: validateDietType(person.dietType) };
    }
    case "dietNotes":
      return { key: "dietNotes", message: validateDietNotes(person.dietNotes, person.dietType) };
    case "youthProgram":
      return { key: "youthProgram", message: validateProgram(person.youthProgram) };
    case "chtbbProgram": {
      const message = validateProgram(person.chtbbProgram);
      if (message) return { key: "chtbbProgram", message };
      if (person.chtbbProgram === "yes") return { key: "chtbbProgram", message: validateChtbbAge(person.dob) };
      return { key: "chtbbProgram", message: null };
    }
    case "stayWith":
      return { key: "stayWith", message: validateStay(person.stayWith) };
    case "stayRoomPref":
      if (person.stayWith !== "other_youths") return { key: "stayRoomPref", message: null };
      return { key: "stayRoomPref", message: validateStayRoomPref(person.stayRoomPref) };
    case "stayRoommateName":
      if (person.stayWith !== "other_youths" || person.stayRoomPref !== "specify") {
        return { key: "stayRoommateName", message: null };
      }
      return { key: "stayRoommateName", message: validateRoommateName(person.stayRoommateName) };
    case "rooming": {
      const message = validateRooming(person.rooming);
      if (message) return { key: "rooming", message };
      return { key: "rooming", message: null };
    }
    case "roomingPref": {
      const message = validateRoomingPref(person.roomingPref);
      if (message) return { key: "roomingPref", message };
      return { key: "roomingPref", message: null };
    }
    case "roommateName":
      if (person.rooming !== "twin" || person.roomingPref !== "specify") {
        return { key: "roommateName", message: null };
      }
      return { key: "roommateName", message: validateRoommateName(person.roommateName) };
    default:
      return { key: field, message: null };
  }
}

function idKey(person) {
  if (person.idType === "passport") {
    const id = normalisePassport(person.idNumber);
    return id ? `PP:${id}` : null;
  }
  const id = normaliseMyKad(person.idNumber);
  return id.length === 12 ? `MY:${id}` : null;
}

export function validateRegistration(state, entries) {
  const results = {};
  for (const entry of entries) {
    results[entry.person.localId] = validatePerson(entry.person, {
      section: entry.section,
      fields: entry.fields,
    });
  }

  const seen = new Map();
  for (const entry of entries) {
    const key = idKey(entry.person);
    if (!key) continue;
    if (!seen.has(key)) {
      seen.set(key, entry.person);
      continue;
    }
    const other = seen.get(key);
    const message = "This IC or passport is already used for another person in this registration.";
    for (const person of [other, entry.person]) {
      const result = results[person.localId];
      if (!result.errors.idNumber) result.errors.idNumber = message;
      result.ok = false;
    }
  }

  const mode = modeById(state?.mode);
  const adultEntries = entries.filter((entry) => entry.section === "adult");
  const adultCount = adultEntries.length;
  const total = entries.length;
  const formErrors = [];
  if (adultCount < mode.minAdults) {
    formErrors.push(`This registration type needs at least ${mode.minAdults} adult${mode.minAdults === 1 ? "" : "s"}.`);
  }
  if (mode.adultCounts && !mode.adultCounts.includes(adultCount)) {
    formErrors.push(`A group of adult friends registers as 2 or 4 people. Add or remove adults to reach ${mode.adultCounts.join(" or ")} adults.`);
  }
  if (mode.maxTotal && total > mode.maxTotal) {
    formErrors.push(`This registration type allows up to ${mode.maxTotal} people. Remove someone before adding another.`);
  }
  if (mode.id === "couple" && adultCount === 2) {
    const males = adultEntries.filter((entry) => entry.person.gender === "male");
    const females = adultEntries.filter((entry) => entry.person.gender === "female");
    if (males.length !== 1 || females.length !== 1) {
      formErrors.push("A married couple must register as one male and one female adult. Check the genders you selected.");
      const duplicates = males.length > 1 ? males : females.length > 1 ? females : [];
      const message = "A married couple needs one male and one female adult.";
      for (const entry of duplicates) {
        const result = results[entry.person.localId];
        if (result && !result.errors.gender) result.errors.gender = message;
        if (result) result.ok = false;
      }
    }
  }

  if (mode.id === "friends" && adultCount >= 2) {
    const maleCount = adultEntries.filter((entry) => entry.person.gender === "male").length;
    const femaleCount = adultEntries.filter((entry) => entry.person.gender === "female").length;
    if (maleCount > 0 && femaleCount > 0) {
      formErrors.push("A group of adult friends must be all male or all female (same gender). Check the genders you selected.");
      const majority = maleCount > femaleCount ? "male" : femaleCount > maleCount ? "female" : null;
      for (const entry of adultEntries) {
        const gender = entry.person.gender;
        if (!gender) continue;
        if (majority && gender === majority) continue;
        const result = results[entry.person.localId];
        if (result && !result.errors.gender) result.errors.gender = "Everyone in a friends group must share the same gender.";
        if (result) result.ok = false;
      }
    }
  }

  const ok = formErrors.length === 0 && Object.values(results).every((result) => result.ok);
  return { ok, results, formErrors };
}

export const PROOF_MAX_BYTES = 10 * 1024 * 1024;
export const PROOF_MAX_FILES = 6;
export const PROOF_MAX_TOTAL_BYTES = 30 * 1024 * 1024;

function proofKind(proof) {
  const name = String(proof?.name || "");
  if (!name) return "";
  const ext = name.toLowerCase().split(".").pop();
  const mime = String(proof?.mimeType || "").toLowerCase();
  const mimeAllowsPdf = !mime || mime === "application/pdf";
  const mimeAllowsJpg = !mime || mime === "image/jpeg";
  if (ext === "pdf" && mimeAllowsPdf) return "pdf";
  if ((ext === "jpg" || ext === "jpeg") && mimeAllowsJpg) return "jpg";
  if (mime === "application/pdf" && ext === "pdf") return "pdf";
  if (mime === "image/jpeg" && (ext === "jpg" || ext === "jpeg")) return "jpg";
  return "";
}

export function validateProof(proof) {
  if (!proof || !proof.name) return "Missing file name. Remove the attachment and pick the file again.";
  if (!proofKind(proof)) return "The proof of payment must be a JPG or PDF file.";
  const size = Number(proof.size) || 0;
  if (size <= 0) return "This file looks empty. Remove it and pick a different file.";
  if (size > PROOF_MAX_BYTES) return "Each file must be 10 MB or smaller. Pick a smaller file.";
  if (proof.data !== undefined && !String(proof.data || "").length) return "This file could not be read. Remove it and pick it again.";
  return null;
}

export function validateProofList(proofs) {
  const list = Array.isArray(proofs) ? proofs : [];
  const files = list.filter((item) => item && (item.name || item.data));
  if (!files.length) return "Attach at least one proof of payment (JPG or PDF).";
  if (files.length > PROOF_MAX_FILES) return `Attach at most ${PROOF_MAX_FILES} files.`;
  for (const file of files) {
    const message = validateProof(file);
    if (message) {
      return `${file.name}: ${message}`;
    }
  }
  const total = files.reduce((sum, file) => sum + (Number(file.size) || 0), 0);
  if (total > PROOF_MAX_TOTAL_BYTES) return "The files together must be 30 MB or smaller. Remove a file or pick smaller ones.";
  return null;
}
