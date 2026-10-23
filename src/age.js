import { AGE_BANDS, CUTOFF_DATE, YOUTH_FEE_BAND } from "../config.js";

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86400000;

export function buildDate(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

export function parseDate(value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return buildDate(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  }
  const match = ISO_RE.exec(String(value ?? "").trim());
  if (!match) return null;
  return buildDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

export function toISO(date) {
  const year = String(date.getUTCFullYear()).padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addMonths(date, months) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const target = new Date(Date.UTC(year, month + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target;
}

export function fullMonthsBetween(from, to) {
  let months = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
  if (to.getUTCDate() < from.getUTCDate()) months -= 1;
  return months;
}

export function ageInYears(dobValue, cutoffValue = CUTOFF_DATE) {
  const dob = parseDate(dobValue);
  const cutoff = parseDate(cutoffValue);
  if (!dob || !cutoff) return null;
  const months = fullMonthsBetween(dob, cutoff);
  if (months < 0) return null;
  return Math.floor(months / 12);
}

export function ageLabel(dobValue, cutoffValue = CUTOFF_DATE) {
  const dob = parseDate(dobValue);
  const cutoff = parseDate(cutoffValue);
  if (!dob || !cutoff) return "—";
  const months = fullMonthsBetween(dob, cutoff);
  if (months < 0) return "—";
  if (months < 24) {
    const years = Math.floor(months / 12);
    const rest = months % 12;
    if (!years) return `${months} month${months === 1 ? "" : "s"}`;
    const yearText = `${years} yr${years === 1 ? "" : "s"}`;
    return rest ? `${yearText} ${rest} mo` : yearText;
  }
  const years = Math.floor(months / 12);
  return `${years} yrs`;
}

export function fitsBand(dob, cutoff, band) {
  if (!dob || !cutoff || dob.getTime() > cutoff.getTime()) return false;
  if (band.dobFrom !== undefined || band.dobTo !== undefined) {
    const from = band.dobFrom ? parseDate(band.dobFrom) : null;
    const to = band.dobTo ? parseDate(band.dobTo) : null;
    if (from && dob.getTime() < from.getTime()) return false;
    if (to && dob.getTime() > to.getTime()) return false;
    return true;
  }
  if (band.minYears !== null && band.minYears !== undefined) {
    const earliest = addMonths(dob, Math.round(band.minYears * 12));
    if (earliest.getTime() > cutoff.getTime()) return false;
  }
  if (band.maxYearsExclusive !== null && band.maxYearsExclusive !== undefined) {
    const limit = addMonths(dob, Math.round(band.maxYearsExclusive * 12));
    if (limit.getTime() <= cutoff.getTime()) return false;
  }
  return true;
}

export function sectionForDob(dobValue, cutoffValue = CUTOFF_DATE, bands = AGE_BANDS) {
  const dob = parseDate(dobValue);
  const cutoff = parseDate(cutoffValue);
  if (!dob || !cutoff || dob.getTime() > cutoff.getTime()) return null;
  for (const [id, band] of Object.entries(bands)) {
    if (fitsBand(dob, cutoff, band)) return id;
  }
  return null;
}

export function daysBetween(from, to) {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

export function paysYouthFee(dobValue, band = YOUTH_FEE_BAND) {
  const dob = parseDate(dobValue);
  if (!dob) return false;
  const from = band.dobFrom ? parseDate(band.dobFrom) : null;
  const to = band.dobTo ? parseDate(band.dobTo) : null;
  if (from && dob.getTime() < from.getTime()) return false;
  if (to && dob.getTime() > to.getTime()) return false;
  return true;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

export function formatDisplayDate(value) {
  const date = parseDate(value);
  if (!date) return "";
  return `${pad2(date.getUTCDate())}/${pad2(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`;
}

export function displayToISO(display) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(display ?? "").trim());
  if (!match) return "";
  const date = buildDate(Number(match[3]), Number(match[2]), Number(match[1]));
  return date ? toISO(date) : "";
}

export function formatDobTyping(value) {
  const digits = String(value ?? "").replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}
