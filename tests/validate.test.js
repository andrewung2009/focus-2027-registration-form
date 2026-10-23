import test from "node:test";
import assert from "node:assert/strict";
import {
  fieldError,
  formatDate,
  formatMyKadTyping,
  normaliseMyKad,
  sectionMismatchFor,
  toE164,
  validateChtbbAge,
  validateDietNotes,
  validateEmail,
  validateDietType,
  validateDob,
  validateDobDisplay,
  validateGender,
  validateId,
  validateMyKad,
  validateName,
  validatePassport,
  validatePassportCountry,
  validatePerson,
  validatePhone,
  validateProof,
  validateProofList,
  validateProgram,
  validateRegistration,
  validateStay,
} from "../src/validate.js";
import { blankPerson } from "../src/model.js";
import { fieldsForMode, modeById, sectionById } from "../src/schema.js";

function adult(overrides = {}) {
  return {
    ...blankPerson("adult"),
    name: "Siti Nurhaliza",
    idType: "mykad",
    idNumber: "900101145678",
    dob: "1990-01-01",
    dobDisplay: "01/01/1990",
    gender: "female",
    phone: "012-345 6789",
    phoneCountry: "MY",
    dietType: "none",
    ...overrides,
  };
}

function youth(overrides = {}) {
  return {
    ...blankPerson("youth"),
    name: "Amir Hakim",
    idType: "mykad",
    idNumber: "120101145678",
    dob: "2012-01-01",
    dobDisplay: "01/01/2012",
    gender: "male",
    phone: "012-345 6789",
    phoneCountry: "MY",
    dietType: "none",
    youthProgram: "yes",
    stayWith: "other_youths",
    ...overrides,
  };
}

function child(overrides = {}) {
  return {
    ...blankPerson("child"),
    name: "Baby Tan",
    idType: "mykad",
    idNumber: "200505145678",
    dob: "2020-05-05",
    dobDisplay: "05/05/2020",
    gender: "male",
    dietType: "none",
    chtbbProgram: "yes",
    ...overrides,
  };
}

const ADULT_FIELDS = ["name", "id", "dob", "gender", "phone", "diet"];

function makeAdults(count) {
  const letters = ["A", "B", "C", "D"];
  return Array.from({ length: count }, (_, index) => adult({
    name: `Person ${letters[index]}`,
    idNumber: `90010114${String(5600 + index)}`,
  }));
}

function entry(person, overrides = {}) {
  const fields = person.section === "adult"
    ? ["name", "id", "dob", "gender", "phone", "diet"]
    : sectionById(person.section).fields;
  return { person, section: person.section, fields, ...overrides };
}

function completeEntries(people) {
  return people.map((person) => entry(person));
}

test("names are required, length-limited and letters only", () => {
  assert.match(validateName(""), /required/i);
  assert.match(validateName("A"), /2 characters/i);
  assert.match(validateName("x".repeat(81)), /80 characters/i);
  assert.match(validateName("Ahmad 87"), /numbers/i);
  assert.match(validateName("Ahmad <A>"), /characters that are not allowed/i);
  assert.equal(validateName("Siti Nurhaliza binti Omar"), null);
  assert.equal(validateName("Mary-Jane O'Neil"), null);
});

test("MyKad requires 12 digits with a valid state code", () => {
  assert.match(validateMyKad("", "1990-01-01"), /required/i);
  assert.match(validateMyKad("900101-14567", "1990-01-01"), /12 digits/i);
  assert.match(validateMyKad("900101175678", "1990-01-01"), /state code/i);
  assert.match(validateMyKad("901301145678", "1990-01-01"), /not a valid birth date/i);
  assert.equal(validateMyKad("900101-14-5678", "1990-01-01"), null);
});

test("MyKad birth date must match the person's date of birth", () => {
  assert.match(validateMyKad("900101145678", "1990-01-02"), /does not match the date of birth/i);
  assert.equal(validateMyKad("900101145678", "1990-01-01"), null);
});

test("MyKad values are normalised without spaces or dashes", () => {
  assert.equal(normaliseMyKad("900101-14-5678"), "900101145678");
  assert.equal(normaliseMyKad(" 900101 145678 "), "900101145678");
});

test("typing a MyKad auto-inserts dashes", () => {
  assert.equal(formatMyKadTyping("900101145678"), "900101-14-5678");
  assert.equal(formatMyKadTyping("9001011"), "900101-1");
  assert.equal(formatMyKadTyping("90010114"), "900101-14");
  assert.equal(formatMyKadTyping("9001011456789001"), "900101-14-5678");
});

test("passport numbers are 6 to 12 letters or digits", () => {
  assert.match(validatePassport("A1B2"), /6 to 12/i);
  assert.match(validatePassport("AB 1234"), /6 to 12/i);
  assert.match(validatePassport("AB1234!"), /6 to 12/i);
  assert.equal(validatePassport("ab12345z"), null);
});

test("passport issuing country is required and validated", () => {
  assert.match(validatePassportCountry(""), /issuing country|select/i);
  assert.match(validatePassportCountry("ZZ"), /valid country/i);
  assert.equal(validatePassportCountry("MY"), null);
});

test("validateId dispatches on the ID type", () => {
  assert.equal(validateId({ idType: "mykad", idNumber: "900101145678", dob: "1990-01-01" }), null);
  assert.equal(validateId({ idType: "passport", idNumber: "AB123456", dob: "1990-01-01" }), null);
  assert.match(validateId({ idType: "passport", idNumber: "", dob: "1990-01-01" }), /Passport number is required/i);
});

test("date of birth range is enforced", () => {
  assert.match(validateDob(""), /required/i);
  assert.match(validateDob("1990-13-40"), /valid date/i);
  assert.match(validateDob("1899-12-31"), /1900/i);
  assert.match(validateDob("2028-01-02"), /on or before/i);
  assert.equal(validateDob("2028-01-01"), null);
  assert.equal(validateDob("1900-01-01"), null);
});

test("date of birth display needs full dd/mm/yyyy", () => {
  assert.match(validateDobDisplay({ dob: "", dobDisplay: "" }), /required/i);
  assert.match(validateDobDisplay({ dob: "", dobDisplay: "1/1/1990" }), /dd\/mm\/yyyy/i);
  assert.match(validateDobDisplay({ dob: "", dobDisplay: "31/02/1990" }), /real date/i);
  assert.equal(validateDobDisplay({ dob: "1990-01-01", dobDisplay: "01/01/1990" }), null);
});

test("form dates render as dd/mm/yyyy", () => {
  assert.equal(formatDate("1990-01-01"), "01/01/1990");
  assert.equal(formatDate(""), "");
});

test("genders, programs and stay choices must come from the lists", () => {
  assert.match(validateGender(""), /gender/i);
  assert.equal(validateGender("female"), null);
  assert.match(validateProgram(""), /yes or no/i);
  assert.equal(validateProgram("no"), null);
  assert.match(validateStay(""), /accommodation/i);
  assert.equal(validateStay("family_room"), null);
});

test("contact numbers are normalised for the selected country", () => {
  assert.equal(toE164("012-345 6789", "MY"), "+60123456789");
  assert.equal(toE164("+6591231234", "OT"), "+6591231234");
  assert.equal(toE164("", "MY"), "");
});

test("Malaysian numbers accept mobile and landline formats", () => {
  assert.equal(validatePhone("012-345 6789", "MY"), null);
  assert.equal(validatePhone("03-1234 5678", "MY"), null);
  assert.match(validatePhone("12345", "MY"), /Malaysian mobile/i);
  assert.match(validatePhone("abc", "MY"), /digits/i);
  assert.match(validatePhone("", "MY"), /required/i);
});

test("other countries require a + country code and 7 to 15 digits", () => {
  assert.match(validatePhone("91231234", "OT"), /its \+ country code/i);
  assert.match(validatePhone("+912312", "OT"), /7 to 15 digits/i);
  assert.equal(validatePhone("+65 9123 1234", "OT"), null);
  assert.equal(validatePhone("+65 9123 1234", "SG"), null);
  assert.equal(validatePhone("0412345678", "AU"), null);
  assert.equal(validatePhone("412345678", "AU"), null);
});

test("dietary notes are required for “Other” and length-limited", () => {
  assert.match(validateDietType(""), /dietary requirement/i);
  assert.equal(validateDietType("none"), null);
  assert.match(validateDietNotes("", "other"), /describe/i);
  assert.equal(validateDietNotes("", "none"), null);
  assert.match(validateDietNotes("x".repeat(301), "other"), /300 characters/i);
});

test("CHTBB ages are bounded", () => {
  assert.match(validateChtbbAge("2017-01-01"), /1½ to 10/i);
  assert.equal(validateChtbbAge("2020-05-05"), null);
  assert.match(validateChtbbAge("2026-07-02"), /1½ to 10/i);
});

test("email addresses are required for the lead adult and format-checked", () => {
  assert.match(validateEmail(""), /required/i);
  assert.match(validateEmail("not-an-email"), /valid email/i);
  assert.match(validateEmail("no-tld@example"), /valid email/i);
  assert.equal(validateEmail("ali.ishak@example.com"), null);
});

test("fieldError maps shorthand fields to their error slots", () => {
  assert.equal(fieldError(adult({ idNumber: "900101-14-567x" }), "idType").key, "idNumber");
  assert.equal(fieldError(adult({ idNumber: "" }), "idNumber").key, "idNumber");
  assert.equal(fieldError(adult({ email: "" }), "email").key, "email");
  assert.equal(fieldError(adult({ idCountry: "MY", idType: "mykad" }), "idCountry").message, null);
  assert.match(fieldError(adult({ idCountry: "", idType: "passport" }), "idCountry").message, /issuing country|select/i);
  assert.equal(fieldError(adult({ rooming: "twin", roomingPref: "assign" }), "roomingPref").message, null);
  assert.equal(fieldError(adult({ rooming: "single" }), "roommateName").message, null);
  assert.equal(fieldError(child({ chtbbProgram: "no" }), "chtbbProgram").message, null);
  assert.match(fieldError(child({ chtbbProgram: "yes", dob: "2017-01-01" }), "chtbbProgram").message, /1½ to 10/i);
});

test("a complete family member validates cleanly", () => {
  assert.equal(validatePerson(adult({ email: "siti@example.com" }), { section: "adult", fields: ["name", "email", ...ADULT_FIELDS] }).ok, true);
  assert.equal(validatePerson(youth(), { section: "youth" }).ok, true);
  assert.equal(validatePerson(child(), { section: "child" }).ok, true);
});

test("each missing adult field produces its own error", () => {
  const { errors } = validatePerson(adult({ name: "", idNumber: "", dob: "", dobDisplay: "", gender: "", phone: "", dietType: "" }), {
    section: "adult",
    fields: ADULT_FIELDS,
  });
  assert.deepEqual(Object.keys(errors).sort(), ["dietType", "dob", "gender", "idNumber", "name", "phone"]);
});

test("passport adults must pick an issuing country before checking", () => {
  const { errors } = validatePerson(adult({ idType: "passport", idNumber: "AB123456", idCountry: "", dob: "1990-01-01", dobDisplay: "01/01/1990" }), {
    section: "adult",
    fields: ADULT_FIELDS,
  });
  assert.match(errors.idCountry, /issuing country|select/i);
  assert.ok(!errors.idNumber);
});

test("self mode adults must answer the room selection", () => {
  const { errors } = validatePerson(adult({ rooming: "", roomingPref: "", roommateName: "" }), {
    section: "adult",
    fields: [...ADULT_FIELDS, "rooming"],
  });
  assert.match(errors.rooming, /room option/i);

  const twin = validatePerson(adult({ rooming: "twin", roomingPref: "", roommateName: "" }), {
    section: "adult",
    fields: [...ADULT_FIELDS, "rooming"],
  });
  assert.match(twin.errors.roomingPref, /room with/i);

  const specify = validatePerson(adult({ rooming: "twin", roomingPref: "specify", roommateName: "" }), {
    section: "adult",
    fields: [...ADULT_FIELDS, "rooming"],
  });
  assert.match(specify.errors.roommateName, /name of the person/i);

  const filled = validatePerson(adult({ rooming: "twin", roomingPref: "specify", roommateName: "Lim Wei" }), {
    section: "adult",
    fields: [...ADULT_FIELDS, "rooming"],
  });
  assert.equal(filled.ok, true);

  const assigned = validatePerson(adult({ rooming: "twin", roomingPref: "assign", roommateName: "" }), {
    section: "adult",
    fields: [...ADULT_FIELDS, "rooming"],
  });
  assert.equal(assigned.ok, true);
});

test("date of birth mismatches send the person to the right section", () => {
  const baby = sectionMismatchFor(adult({ dob: "2020-05-05", dobDisplay: "05/05/2020" }));
  assert.equal(baby.section, "child");
  assert.match(baby.message, /Child section/i);

  const tooOld = sectionMismatchFor(adult({ dob: "1898-05-05", dobDisplay: "05/05/1898" }));
  assert.equal(tooOld, null);

  const outOfRange = sectionMismatchFor(adult({ dob: "2028-03-05", dobDisplay: "05/03/2028" }));
  assert.equal(outOfRange, null);
});

test("adult 1 carries the email field and adult 2 does not", () => {
  const adultSection = sectionById("adult");
  const leadFields = fieldsForMode(adultSection, modeById("family"), true);
  assert.ok(leadFields.includes("email"));
  assert.deepEqual(leadFields.slice(0, 2), ["name", "email"]);
  assert.ok(!fieldsForMode(adultSection, modeById("family"), false).includes("email"));
  assert.ok(fieldsForMode(adultSection, modeById("self"), true).includes("rooming"));
});

test("validateRegistration accepts clean couples and requires at least one adult", () => {
  const clean = validateRegistration(
    { mode: "couple" },
    completeEntries([adult({ gender: "male", phone: "019-876 5432", idNumber: "900101145679" }), adult({ gender: "female" })]),
  );
  assert.equal(clean.ok, true);
  assert.deepEqual(clean.formErrors, []);

  const empty = validateRegistration({ mode: "self" }, []);
  assert.equal(empty.ok, false);
  assert.match(empty.formErrors[0], /needs at least 1 adult/i);
});

test("married couples must be one male and one female", () => {
  const state = { mode: "couple" };
  const people = makeAdults(2).map((person) => ({ ...person, gender: "male" }));
  const result = validateRegistration(state, completeEntries(people));
  assert.equal(result.ok, false);
  assert.ok(result.formErrors.some((message) => /one male and one female/i.test(message)));
  assert.ok(result.results[people[0].localId].errors.gender, "first adult flags gender");
  assert.ok(result.results[people[1].localId].errors.gender, "second adult flags gender");
  Object.keys(result.results).forEach((localId) => assert.equal(result.results[localId].ok, false));
});

test("mixed-gender couples can still fail on individual field errors", () => {
  const people = [adult({ gender: "male" }), adult({ gender: "female", phone: "12" })];
  const result = validateRegistration({ mode: "couple" }, completeEntries(people));
  assert.equal(result.ok, false);
  assert.ok(!result.formErrors.some((message) => /one male and one female/i.test(message)));
  assert.ok(result.results[people[1].localId].errors.phone);
});

test("groups of friends register as 2 or 4 adults", () => {
  const two = validateRegistration({ mode: "friends" }, completeEntries(makeAdults(2)));
  assert.equal(two.ok, true);
  const four = validateRegistration({ mode: "friends" }, completeEntries(makeAdults(4)));
  assert.equal(four.ok, true);
  const three = validateRegistration({ mode: "friends" }, completeEntries(makeAdults(3)));
  assert.equal(three.ok, false);
  assert.ok(three.formErrors.some((message) => /2 or 4 people/i.test(message)));
  const five = validateRegistration({ mode: "friends" }, completeEntries(makeAdults(5)));
  assert.equal(five.ok, false);
  assert.ok(five.formErrors.some((message) => /5 or fewer|2 or 4/i.test(message)));
});

test("families cap at six people", () => {
  const people = [adult()];
  for (let n = 0; n < 6; n += 1) people.push(youth({ name: `Youth ${n}`, idNumber: `20010${n}14567${n}` }));
  const result = validateRegistration({ mode: "family" }, completeEntries(people));
  assert.equal(result.ok, false);
  assert.ok(result.formErrors.some((message) => /up to 6 people/i.test(message)));
});

test("families of six validate cleanly", () => {
  const people = [adult()];
  people.push(youth({ name: "Youth Amir" }));
  people.push(youth({ name: "Youth Aina", gender: "female", idNumber: "120101145679" }));
  for (let n = 0; n < 3; n += 1) {
    people.push(child({
      name: ["Child Alpha", "Child Beta", "Child Gamma"][n],
      idNumber: `20050514567${n + 2}`,
    }));
  }
  const result = validateRegistration({ mode: "family" }, completeEntries(people));
  assert.equal(result.ok, true);
  assert.deepEqual(result.formErrors, []);
});

test("the same IC number cannot be used twice", () => {
  const people = [adult(), adult({ name: "Ali Ishak", gender: "male" })];
  const result = validateRegistration({ mode: "family" }, completeEntries(people));
  assert.equal(result.ok, false);
  const flagged = Object.values(result.results).filter((person) => /already used/i.test(person.errors.idNumber || ""));
  assert.equal(flagged.length, 2);
});

test("youth and child entries validate through the same pipeline", () => {
  const teen = youth({ stayWith: "" });
  const kid = child({ chtbbProgram: "" });
  const result = validateRegistration({ mode: "family" }, completeEntries([adult(), teen, kid]));
  assert.equal(result.ok, false);
  assert.ok(result.results[teen.localId].errors.stayWith);
  assert.ok(result.results[kid.localId].errors.chtbbProgram);
});

test("proof of payment is validated per file", () => {
  assert.match(validateProof(null), /missing file name|remove the attachment/i);
  assert.match(validateProof({ name: "", mimeType: "image/jpeg", size: 100 }), /missing file name/i);
  assert.match(validateProof({ name: "receipt.png", mimeType: "image/png", size: 100 }), /must be a JPG or PDF/i);
  assert.match(validateProof({ name: "receipt.pdf", mimeType: "image/png", size: 100 }), /must be a JPG or PDF/i);
  assert.match(validateProof({ name: "receipt.jpg", mimeType: "image/png", size: 100 }), /must be a JPG or PDF/i);
  assert.match(validateProof({ name: "receipt.jpg", mimeType: "image/jpeg", size: 11 * 1024 * 1024 }), /10 MB or smaller/i);
  assert.match(validateProof({ name: "receipt.jpg", mimeType: "image/jpeg", size: 0 }), /looks empty/i);
  assert.match(validateProof({ name: "a.jpg", mimeType: "image/jpeg", size: 10, data: "" }), /could not be read/i);
});

test("proof of payment accepts jpeg and pdf files up to 10 MB", () => {
  assert.equal(validateProof({ name: "receipt.jpg", mimeType: "image/jpeg", size: 1024, data: "AA==" }), null);
  assert.equal(validateProof({ name: "receipt.jpeg", mimeType: "", size: 1024, data: "AA==" }), null);
  assert.equal(validateProof({ name: "receipt.PDF", mimeType: "application/pdf", size: 500, data: "AA==" }), null);
  assert.equal(validateProof({ name: "bank slip.pdf", mimeType: "application/pdf", size: 10 * 1024 * 1024, data: "AA==" }), null);
  assert.equal(validateProof({ name: "receipt.png", mimeType: "image/png", size: 10, data: "AA==" }), "The proof of payment must be a JPG or PDF file.");
});

test("proof of payment list requires something attached and caps the count", () => {
  assert.match(validateProofList([]), /attach at least one/i);
  assert.match(validateProofList(null), /attach at least one/i);
  const many = [];
  for (let n = 0; n < 7; n += 1) many.push({ name: `r${n}.jpg`, mimeType: "image/jpeg", size: 100, data: "AA==" });
  assert.match(validateProofList(many), /at most 6/i);
  assert.match(validateProofList([null, { name: "r.png", mimeType: "image/png", size: 100, data: "AA==" }]), /must be a JPG or PDF/i);
});

test("proof of payment list allows six files under the total cap", () => {
  const six = [];
  for (let n = 0; n < 6; n += 1) six.push({ name: `r${n}.jpg`, mimeType: "image/jpeg", size: 1024 * 1024, data: "AA==" });
  assert.equal(validateProofList(six), null);
  const tooBig = [];
  for (let n = 0; n < 6; n += 1) tooBig.push({ name: `r${n}.jpg`, mimeType: "image/jpeg", size: 6 * 1024 * 1024, data: "AA==" });
  assert.match(validateProofList(tooBig), /30 MB or smaller/i);
  const mixed = [
    { name: "a.pdf", mimeType: "application/pdf", size: 2048, data: "AA==" },
    { name: "b.jpeg", mimeType: "", size: 100, data: "AA==" },
  ];
  assert.equal(validateProofList(mixed), null);
});
