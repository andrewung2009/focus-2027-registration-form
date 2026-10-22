import { CAMP } from "../config.js";
import { COUNTRIES } from "./data.js";

export const SECTIONS = [
  {
    id: "adult",
    label: "Adult",
    plural: "Adults",
    ages: "Age 18 and above at Focus 2027",
    addLabel: "Add another adult",
    fields: ["name", "id", "dob", "gender", "phone", "diet"],
    program: null,
  },
  {
    id: "youth",
    label: "Youth",
    plural: "Youth",
    ages: "Born between 2010 to 2016",
    addLabel: "Add another youth",
    firstAddLabel: "Add Youth",
    fields: ["name", "id", "dob", "gender", "phone", "diet", "program", "stay"],
    program: {
      field: "youthProgram",
      label: "Are you joining the youth program?",
    },
  },
  {
    id: "child",
    label: "Child",
    plural: "Children",
    ages: "Born in 2017 or later",
    addLabel: "Add another child",
    firstAddLabel: "Add Child",
    fields: ["name", "id", "dob", "gender", "diet", "program"],
    program: {
      field: "chtbbProgram",
      label: "Are you joining the CHTBB program?",
      hint: "CHTBB is for children aged 1½ to 10 at Focus 2027.",
    },
  },
];

export function sectionById(id) {
  return SECTIONS.find((section) => section.id === id);
}

export const MODES = [
  {
    id: "self",
    label: "Just myself",
    hint: "Adult 18+",
    sections: ["adult"],
    startAdults: 1,
    minAdults: 1,
    maxAdults: 1,
    addAdults: false,
    removeAdults: false,
  },
  {
    id: "couple",
    label: "Married couple",
    hint: "2 adults · 1 male, 1 female",
    sections: ["adult"],
    startAdults: 2,
    minAdults: 2,
    maxAdults: 2,
    addAdults: false,
    removeAdults: false,
  },
  {
    id: "family",
    label: "Family",
    hint: "Up to 6 pax",
    sections: ["adult", "youth", "child"],
    startAdults: 1,
    minAdults: 1,
    maxAdults: null,
    addAdults: true,
    removeAdults: true,
    maxTotal: 6,
  },
  {
    id: "friends",
    label: "A group of adult friends rooming together",
    hint: "2 pax or 4 pax",
    sections: ["adult"],
    startAdults: 2,
    minAdults: 2,
    maxAdults: 4,
    addAdults: true,
    removeAdults: true,
    adultCounts: [2, 4],
  },
];

export function modeById(id) {
  return MODES.find((mode) => mode.id === id) || MODES[2];
}

export function fieldsForMode(section, mode, isLead = false) {
  let fields = section.fields;
  if (section.id === "adult" && isLead) {
    fields = ["name", "email", ...fields.filter((field) => field !== "name")];
  }
  if (section.id === "adult" && mode.id === "self") {
    fields = [...fields, "rooming"];
  }
  return fields;
}

export const ID_TYPES = [
  { value: "mykad", label: "MyKad (Malaysian IC)" },
  { value: "passport", label: "Passport" },
];

export const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

export const DIET_OPTIONS = [
  { value: "none", label: "None" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "gluten_free", label: "Gluten Free" },
  { value: "other", label: "Other" },
];

export const DIET_NOTES_REQUIRED = new Set(["other"]);

export const STAY_OPTIONS = [
  { value: "family_room", label: "Family room" },
  { value: "other_youths", label: "With other youths" },
];

export const CAMP_LABEL = `${CAMP.name} ${CAMP.year}`;

export { COUNTRIES };
