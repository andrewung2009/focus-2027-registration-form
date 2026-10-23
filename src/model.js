import { SECTIONS, fieldsForMode, modeById } from "./schema.js";

let sequence = 0;

export function blankPerson(section) {
  sequence += 1;
  return {
    localId: `${section}-${sequence}`,
    section,
    name: "",
    email: "",
    idType: "mykad",
    idCountry: "",
    idCountryOther: "",
    idNumber: "",
    dob: "",
    dobDisplay: "",
    gender: "",
    phoneCountry: "MY",
    phone: "",
    dietType: "",
    dietNotes: "",
    youthProgram: "",
    chtbbProgram: "",
    stayWith: "",
    stayRoomPref: "",
    stayRoommateName: "",
    rooming: "",
    roomingPref: "",
    roommateName: "",
  };
}

export function createState() {
  return {
    mode: "family",
    proof: [],
    people: {
      adult: [blankPerson("adult")],
      youth: [],
      child: [],
    },
  };
}

export function isBlank(person) {
  return [
    person.name,
    person.email,
    person.idNumber,
    person.dob,
    person.gender,
    person.phone,
    person.dietType,
    person.dietNotes,
    person.youthProgram,
    person.chtbbProgram,
    person.stayWith,
    person.stayRoomPref,
    person.stayRoommateName,
    person.rooming,
    person.roomingPref,
    person.roommateName,
  ].every((value) => !value);
}

export function ensureMode(state) {
  const mode = modeById(state.mode);
  while (state.people.adult.length < mode.startAdults) {
    state.people.adult.push(blankPerson("adult"));
  }
  if (!state.people.adult.length) state.people.adult.push(blankPerson("adult"));
}

export function pruneBlank(state) {
  for (const section of SECTIONS) {
    if (section.id === "adult") continue;
    state.people[section.id] = state.people[section.id].filter((person) => !isBlank(person));
  }
  if (!state.people.adult.length) state.people.adult.push(blankPerson("adult"));
}

export function findPerson(state, localId) {
  for (const list of Object.values(state.people)) {
    const found = list.find((person) => person.localId === localId);
    if (found) return found;
  }
  return null;
}

export function visiblePeople(state, sectionId) {
  const mode = modeById(state.mode);
  if (!mode.sections.includes(sectionId)) return [];
  const list = state.people[sectionId] || [];
  if (sectionId === "adult" && mode.maxAdults) return list.slice(0, mode.maxAdults);
  return list;
}

export function allEntries(state) {
  const mode = modeById(state.mode);
  const entries = [];
  for (const section of SECTIONS) {
    for (const [index, person] of visiblePeople(state, section.id).entries()) {
      const isLead = section.id === "adult" && index === 0;
      entries.push({ person, section: section.id, fields: fieldsForMode(section, mode, isLead) });
    }
  }
  return entries;
}

export function counts(state) {
  return {
    adult: visiblePeople(state, "adult").length,
    youth: visiblePeople(state, "youth").length,
    child: visiblePeople(state, "child").length,
  };
}
