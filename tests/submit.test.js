import test from "node:test";
import assert from "node:assert/strict";
import { buildPayload, buildProofPayload, buildProofPayloads } from "../src/submit.js";
import { modeById } from "../src/schema.js";
import { blankPerson } from "../src/model.js";

const entries = [{ person: { ...blankPerson("adult"), name: "Siti" }, section: "adult" }];

function file(name, mimeType, size, data) {
  return { name, mimeType, size, data };
}

test("payload carries the proof of payment files when attached", () => {
  const payload = buildPayload({
    mode: "family",
    proof: [
      file("receipt.PDF", "", 2048, "SGVsbG8="),
      file("shot.jpg", "image/jpeg", 512, "AA=="),
    ],
  }, entries);
  assert.deepEqual(payload.proof, [
    { name: "receipt.PDF", mimeType: "application/pdf", size: 2048, data: "SGVsbG8=" },
    { name: "shot.jpg", mimeType: "image/jpeg", size: 512, data: "AA==" },
  ]);
});

test("payload without proofs sends null and never a partial file", () => {
  const missing = buildPayload({ mode: "family", proof: [] }, entries);
  assert.equal(missing.proof, null);
  const emptyData = buildPayload({ mode: "family", proof: [file("a.jpg", "", 1, "")] }, entries);
  assert.equal(emptyData.proof, null);
  assert.equal(buildProofPayloads(null), null);
  assert.equal(buildProofPayload(null), null);
});

test("youth-only payloads carry the parent or legal guardian", () => {
  const guardian = {
    ...blankPerson("adult"),
    name: "Lim Ah Kow",
    email: "guardian@example.com",
    idType: "passport",
    idCountry: "OT",
    idCountryOther: "South Korea",
    idNumber: "ab123456",
    phone: "+821012345678",
    phoneCountry: "OT",
  };
  const youthEntries = [{
    person: { ...blankPerson("youth"), name: "Teen", youthProgram: "yes", stayWith: "other_youths" },
    section: "youth",
  }];
  const payload = buildPayload({ mode: "youths", guardian, proof: [] }, youthEntries);
  assert.deepEqual(payload.guardian, {
    name: "Lim Ah Kow",
    email: "guardian@example.com",
    idType: "passport",
    idCountry: "South Korea",
    idNumber: "AB123456",
    phoneE164: "+821012345678",
  });
  const family = buildPayload({ mode: "family", guardian, proof: [] }, youthEntries);
  assert.equal(family.guardian, null);
  assert.equal(modeById("youths").guardian, true);
});

test("proof mime type falls back to the file extension", () => {
  const jpg = buildProofPayload({ name: "shot.JPG", mimeType: "", size: 10, data: "AA==" });
  assert.equal(jpg.mimeType, "image/jpeg");
});
