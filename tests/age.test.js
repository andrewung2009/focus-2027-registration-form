import test from "node:test";
import assert from "node:assert/strict";
import {
  addMonths,
  ageInYears,
  ageLabel,
  displayToISO,
  fitsBand,
  formatDisplayDate,
  formatDobTyping,
  fullMonthsBetween,
  parseDate,
  paysYouthFee,
  sectionForDob,
  toISO,
} from "../src/age.js";
import { AGE_BANDS, CHTBB_BAND } from "../config.js";

const CUTOFF = "2028-01-01";

test("adult boundary is born 2009 and earlier", () => {
  assert.equal(sectionForDob("2009-12-31", CUTOFF, AGE_BANDS), "adult");
  assert.equal(sectionForDob("2010-01-01", CUTOFF, AGE_BANDS), "youth");
  assert.equal(sectionForDob("2000-06-15", CUTOFF, AGE_BANDS), "adult");
});

test("youth covers birth years 2010 to 2016", () => {
  assert.equal(sectionForDob("2010-01-01", CUTOFF, AGE_BANDS), "youth");
  assert.equal(sectionForDob("2016-12-31", CUTOFF, AGE_BANDS), "youth");
  assert.equal(sectionForDob("2009-12-31", CUTOFF, AGE_BANDS), "adult");
  assert.equal(sectionForDob("2017-01-01", CUTOFF, AGE_BANDS), "child");
  assert.equal(sectionForDob("2013-09-09", CUTOFF, AGE_BANDS), "youth");
});

test("child covers birth years 2017 onwards", () => {
  assert.equal(sectionForDob("2017-01-01", CUTOFF, AGE_BANDS), "child");
  assert.equal(sectionForDob("2026-07-01", CUTOFF, AGE_BANDS), "child");
  assert.equal(sectionForDob("2027-12-31", CUTOFF, AGE_BANDS), "child");
  assert.equal(sectionForDob("2016-12-31", CUTOFF, AGE_BANDS), "youth");
});

test("youth camp fee only applies to adults born 19-30 September 2009", () => {
  assert.equal(paysYouthFee("2009-09-19"), true);
  assert.equal(paysYouthFee("2009-09-30"), true);
  assert.equal(paysYouthFee("2009-09-18"), false);
  assert.equal(paysYouthFee("2009-10-01"), false);
  assert.equal(paysYouthFee("2009-09-01"), false);
  assert.equal(paysYouthFee("2009-12-31"), false);
  assert.equal(paysYouthFee(""), false);
  assert.equal(sectionForDob("2009-09-25", CUTOFF, AGE_BANDS), "adult");
});

test("the year bands switch exactly at 31 December 2016", () => {
  assert.equal(sectionForDob("2016-12-31", CUTOFF, AGE_BANDS), "youth");
  assert.equal(sectionForDob("2017-01-01", CUTOFF, AGE_BANDS), "child");
  assert.equal(sectionForDob("2009-12-31", CUTOFF, AGE_BANDS), "adult");
  assert.equal(sectionForDob("2010-01-01", CUTOFF, AGE_BANDS), "youth");
});

test("nobody falls outside the defined bands between child and adult", () => {
  const end = parseDate("2027-12-31");
  for (let date = parseDate("2009-01-01"); date <= end; date = new Date(date.getTime() + 86400000)) {
    const iso = toISO(date);
    assert.ok(sectionForDob(iso, CUTOFF, AGE_BANDS), `no section for ${iso}`);
  }
});

test("dates after the cutoff are rejected", () => {
  assert.equal(sectionForDob("2028-01-02", CUTOFF, AGE_BANDS), null);
});

test("CHTBB keeps the 1½ to 10 year old age rule", () => {
  const cutoff = parseDate(CUTOFF);
  assert.equal(fitsBand(parseDate("2017-01-01"), cutoff, CHTBB_BAND), false);
  assert.equal(fitsBand(parseDate("2017-01-02"), cutoff, CHTBB_BAND), true);
  assert.equal(fitsBand(parseDate("2020-05-05"), cutoff, CHTBB_BAND), true);
  assert.equal(fitsBand(parseDate("2026-07-01"), cutoff, CHTBB_BAND), true);
  assert.equal(fitsBand(parseDate("2026-07-02"), cutoff, CHTBB_BAND), false);
  assert.equal(fitsBand(parseDate("2017-01-01"), cutoff, AGE_BANDS.child), true);
  assert.equal(fitsBand(parseDate("2016-12-31"), cutoff, AGE_BANDS.child), false);
});

test("age labels are human readable", () => {
  assert.equal(ageLabel("2010-01-02", CUTOFF), "17 yrs");
  assert.equal(ageLabel("2010-01-01", CUTOFF), "18 yrs");
  assert.equal(ageLabel("2026-07-01", CUTOFF), "1 yr 6 mo");
  assert.equal(ageLabel("2026-12-01", CUTOFF), "1 yr 1 mo");
  assert.equal(ageLabel("2027-12-01", CUTOFF), "1 month");
  assert.equal(ageLabel("2026-01-01", CUTOFF), "2 yrs");
  assert.equal(ageLabel("", CUTOFF), "—");
});

test("age in years floors partial years", () => {
  assert.equal(ageInYears("2010-01-02", CUTOFF), 17);
  assert.equal(ageInYears("2026-07-01", CUTOFF), 1);
});

test("addMonths clamps to the end of shorter months", () => {
  assert.equal(toISO(addMonths(parseDate("2020-01-31"), 1)), "2020-02-29");
  assert.equal(toISO(addMonths(parseDate("2021-01-31"), 1)), "2021-02-28");
  assert.equal(toISO(addMonths(parseDate("2026-07-01"), 18)), "2028-01-01");
});

test("fullMonthsBetween only counts complete months", () => {
  assert.equal(fullMonthsBetween(parseDate("2027-12-02"), parseDate(CUTOFF)), 0);
  assert.equal(fullMonthsBetween(parseDate("2027-12-01"), parseDate(CUTOFF)), 1);
});

test("parseDate rejects impossible dates", () => {
  assert.equal(parseDate("2023-02-29"), null);
  assert.equal(parseDate("2023-13-01"), null);
  assert.equal(parseDate("2023-00-10"), null);
  assert.equal(parseDate(""), null);
  assert.equal(parseDate("01-01-2023"), null);
  assert.equal(toISO(parseDate("2024-02-29")), "2024-02-29");
});

test("display dates use dd/mm/yyyy", () => {
  assert.equal(formatDisplayDate("1990-01-02"), "02/01/1990");
  assert.equal(formatDisplayDate("2024-02-29"), "29/02/2024");
  assert.equal(formatDisplayDate(""), "");
  assert.equal(displayToISO("02/01/1990"), "1990-01-02");
  assert.equal(displayToISO("29/02/2024"), "2024-02-29");
  assert.equal(displayToISO("31/02/2024"), "");
  assert.equal(displayToISO("01/01/90"), "");
  assert.equal(displayToISO("1990-01-02"), "");
});

test("typing a date auto-inserts slashes", () => {
  assert.equal(formatDobTyping(""), "");
  assert.equal(formatDobTyping("0"), "0");
  assert.equal(formatDobTyping("01"), "01");
  assert.equal(formatDobTyping("011"), "01/1");
  assert.equal(formatDobTyping("0101"), "01/01");
  assert.equal(formatDobTyping("01011990"), "01/01/1990");
  assert.equal(formatDobTyping("01/01/1990"), "01/01/1990");
  assert.equal(formatDobTyping("01-01-1990"), "01/01/1990");
  assert.equal(formatDobTyping("010119901234"), "01/01/1990");
});
