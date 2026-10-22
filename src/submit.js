import { CAMP } from "../config.js";
import { modeById } from "./schema.js";
import { normaliseMyKad, normalisePassport, toE164 } from "./validate.js";

const ID_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const DEFAULT_TIMEOUT_MS = 20000;

function randomCode(length) {
  const bytes = new Uint8Array(length);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else {
    for (let index = 0; index < length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (byte) => ID_ALPHABET[byte % ID_ALPHABET.length]).join("");
}

export function buildRegistrationId(now = new Date(), random = randomCode) {
  return `F27-${now.getTime().toString(36).toUpperCase()}-${random(4)}`;
}

const clean = (value) => String(value ?? "").trim();

export function buildPayload(state, entries, options = {}) {
  const now = options.now || new Date();
  const registrationId = options.registrationId || buildRegistrationId(now);
  const mode = modeById(state.mode);
  const counts = { adult: 0, youth: 0, child: 0 };

  const people = entries.map(({ person, section }) => {
    counts[section] += 1;
    const isPassport = person.idType === "passport";
    return {
      section,
      name: clean(person.name),
      idType: isPassport ? "passport" : "mykad",
      idCountry: isPassport ? clean(person.idCountry) : "",
      idNumber: isPassport ? normalisePassport(person.idNumber) : normaliseMyKad(person.idNumber),
      dob: person.dob || "",
      gender: person.gender || "",
      phoneCountry: person.phoneCountry || "",
      phone: clean(person.phone),
      phoneE164: toE164(person.phone, person.phoneCountry),
      email: section === "adult" ? clean(person.email) : "",
      dietType: person.dietType || "",
      dietNotes: clean(person.dietNotes),
      youthProgram: section === "youth" ? person.youthProgram || "" : "",
      chtbbProgram: section === "child" ? person.chtbbProgram || "" : "",
      stayWith: section === "youth" ? person.stayWith || "" : "",
      rooming: section === "adult" ? person.rooming || "" : "",
      roomingPref: section === "adult" && person.rooming === "twin" ? person.roomingPref || "" : "",
      roommateName: section === "adult" && person.rooming === "twin" && person.roomingPref === "specify"
        ? clean(person.roommateName)
        : "",
    };
  });

  return {
    registrationId,
    submittedAt: now.toISOString(),
    formVersion: CAMP.formVersion,
    camp: `${CAMP.name} ${CAMP.year}`,
    mode: mode.id,
    modeLabel: mode.label,
    counts,
    people,
  };
}

export async function sendRegistration(payload, options = {}) {
  const endpoint = options.endpoint ?? CAMP.endpoint;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const count = payload.people.length;

  if (!endpoint) {
    return {
      ok: false,
      error: "Online submission is not set up yet. Please contact the church office.",
    };
  }
  if (typeof fetchImpl !== "function") {
    return { ok: false, error: "This browser cannot submit the form. Please contact the church office." };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false, error: `The registration server replied with status ${response.status}. Please try again.` };
    }

    let data;
    try {
      data = await response.json();
    } catch {
      return { ok: false, error: "The registration server sent an unexpected reply. Please try again." };
    }

    if (!data || data.ok !== true) {
      return {
        ok: false,
        error: clean(data?.error) || "The registration server could not save this registration. Please try again.",
      };
    }

    return {
      ok: true,
      registrationId: clean(data.registrationId) || payload.registrationId,
      count: Number.isFinite(Number(data.count)) && Number(data.count) > 0 ? Number(data.count) : count,
    };
  } catch (error) {
    if (error?.name === "AbortError") {
      return { ok: false, error: "The registration server took too long to respond. Check your connection and try again." };
    }
    return { ok: false, error: "We could not reach the registration server. Check your connection and try again." };
  } finally {
    clearTimeout(timeout);
  }
}
