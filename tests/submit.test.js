import test from "node:test";
import assert from "node:assert/strict";
import { buildPayload, buildProofPayload } from "../src/submit.js";
import { blankPerson } from "../src/model.js";

const entries = [{ person: { ...blankPerson("adult"), name: "Siti" }, section: "adult" }];

test("payload carries the proof of payment when attached", () => {
  const proof = {
    name: "receipt.PDF",
    mimeType: "",
    size: 2048,
    data: "SGVsbG8=",
  };
  const payload = buildPayload({ mode: "family", proof }, entries);
  assert.deepEqual(payload.proof, {
    name: "receipt.PDF",
    mimeType: "application/pdf",
    size: 2048,
    data: "SGVsbG8=",
  });
});

test("payload without a proof sends null and never a partial file", () => {
  const missing = buildPayload({ mode: "family", proof: null }, entries);
  assert.equal(missing.proof, null);
  const emptyData = buildPayload({ mode: "family", proof: { name: "a.jpg", mimeType: "", size: 1, data: "" } }, entries);
  assert.equal(emptyData.proof, null);
  assert.equal(buildProofPayload(null), null);
});

test("proof mime type falls back to the file extension", () => {
  const jpg = buildProofPayload({ name: "shot.JPG", mimeType: "", size: 10, data: "AA==" });
  assert.equal(jpg.mimeType, "image/jpeg");
});
