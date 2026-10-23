import { CAMP } from "../config.js";
import { COUNTRIES } from "./data.js";

export const SECTIONS = [
  {
    id: "adult",
    label: "Adult",
    plural: "Adults",
    ages: "Age 18 and above in the year 2027",
    note: "Thank you for completing this registration! You will be the main contact for this registration. Please ensure that the email address that you are providing below is one you check regularly, as most future camp communications will be sent there. To prevent duplicate submissions, please ensure you are the only person who submits this form on behalf of your group.",
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
      label: "Will this youth be participating in the Youth Program?",
    },
  },
  {
    id: "child",
    label: "Child",
    heading: "Child",
    plural: "Children",
    ages: "Born in 2017 or later",
    addLabel: "Add another child",
    firstAddLabel: "Add Child",
    fields: ["name", "id", "dob", "gender", "diet", "program"],
    program: {
      field: "chtbbProgram",
      label: "Will this child be participating in the CHTBB Program?",
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
    hint: "2 pax or 4 pax (same gender)",
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
  { value: "family_room", label: "With family" },
  { value: "other_youths", label: "With other youths" },
];

export const STAY_ROOM_OPTIONS = [
  { value: "specify", label: "I would like to room with" },
  { value: "none", label: "No preference" },
];

export const ROOM_OPTIONS = [
  { value: "twin", label: "Studio Twin: 2 Super Single Bed", short: "Studio Twin" },
  { value: "single", label: "Studio King: 1 King Size Bed", short: "Studio King" },
];

export const ROOM_IMAGES = {
  twin: {
    src: "https://drive.google.com/thumbnail?id=1ttbu9d0LZHdw-zANSeMPPWADfZHhGxeR&sz=w1200",
    alt: "Studio Twin room with two super single beds",
  },
  single: {
    src: "https://drive.google.com/thumbnail?id=1II8xPjoZo90pajPgxnXwnE5oAiYaDKHn&sz=w1200",
    alt: "Studio King room with one king size bed",
  },
};

export const CAMP_LABEL = `${CAMP.name} ${CAMP.year}`;

export { COUNTRIES };
