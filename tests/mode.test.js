import test from "node:test";
import assert from "node:assert/strict";
import {
  allEntries,
  blankPerson,
  createState,
  ensureMode,
  pruneBlank,
  visiblePeople,
} from "../src/model.js";

test("family mode shows all sections with one adult", () => {
  const state = createState();
  assert.equal(visiblePeople(state, "adult").length, 1);
  assert.equal(visiblePeople(state, "youth").length, 0);
  assert.equal(visiblePeople(state, "child").length, 0);
  assert.equal(allEntries(state).length, 1);
});

test("married couple seeds two adults and keeps all sections", () => {
  const state = createState();
  state.mode = "couple";
  pruneBlank(state);
  ensureMode(state);
  assert.equal(visiblePeople(state, "adult").length, 2);
  assert.equal(visiblePeople(state, "youth").length, 0);
  assert.equal(visiblePeople(state, "child").length, 0);
});

test("just myself hides youth and children and caps adults at one", () => {
  const state = createState();
  state.people.adult.push(blankPerson("adult"));
  state.people.youth.push({ ...blankPerson("youth"), name: "Teen" });
  state.mode = "self";
  assert.equal(visiblePeople(state, "adult").length, 1);
  assert.equal(visiblePeople(state, "youth").length, 0);
  assert.equal(visiblePeople(state, "child").length, 0);
  assert.equal(allEntries(state).length, 1);
});

test("friends requires two visible adults and hides other sections", () => {
  const state = createState();
  state.mode = "friends";
  pruneBlank(state);
  ensureMode(state);
  assert.equal(visiblePeople(state, "adult").length, 2);
  assert.equal(visiblePeople(state, "child").length, 0);
  assert.equal(allEntries(state).length, 2);
});

test("switching modes preserves filled people and prunes blanks", () => {
  const state = createState();
  state.people.youth.push({ ...blankPerson("youth"), name: "Teen", dob: "2012-02-02" });
  state.people.child.push(blankPerson("child"));
  state.mode = "family";
  pruneBlank(state);
  assert.equal(state.people.youth.length, 1);
  assert.equal(state.people.child.length, 0);

  state.mode = "couple";
  pruneBlank(state);
  ensureMode(state);
  assert.equal(visiblePeople(state, "youth").length, 0);

  state.mode = "self";
  assert.equal(visiblePeople(state, "youth").length, 0);

  state.mode = "family";
  assert.equal(visiblePeople(state, "youth").length, 1);
});

test("mode seeding never removes existing adults", () => {
  const state = createState();
  state.people.adult.push({ ...blankPerson("adult"), name: "Second" });
  state.mode = "couple";
  ensureMode(state);
  assert.equal(state.people.adult.length, 2);
  state.mode = "friends";
  ensureMode(state);
  assert.equal(state.people.adult.length, 2);
  state.people.adult.push({ ...blankPerson("adult"), name: "Third" });
  ensureMode(state);
  assert.equal(state.people.adult.length, 3);
});

test("self registrations collect room preferences", () => {
  const state = createState();
  state.mode = "self";
  const entries = allEntries(state);
  assert.equal(entries.length, 1);
  assert.ok(entries[0].fields.includes("rooming"));
});

test("family and couple registrations do not collect room preferences", () => {
  const state = createState();
  const familyEntries = allEntries(state);
  assert.ok(!familyEntries[0].fields.includes("rooming"));

  state.mode = "couple";
  assert.ok(!allEntries(state)[0].fields.includes("rooming"));
});
