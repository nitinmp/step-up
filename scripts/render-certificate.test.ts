import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { renderStarDayCertificate } from "../src/lib/certificate-template";

const sampleInput = {
  recipientName: "Pushpa",
  steps: 31660,
  activityDate: "2026-07-19",
} as const;

function assertPng(buffer: ArrayBuffer) {
  assert.ok(buffer.byteLength > 1000);
  const bytes = new Uint8Array(buffer.slice(0, 8));
  assert.equal(bytes[0], 0x89);
  assert.equal(bytes[1], 0x50);
  assert.equal(bytes[2], 0x4e);
  assert.equal(bytes[3], 0x47);
}

describe("renderStarDayCertificate", () => {
  it("renders a PNG buffer for each division theme", async () => {
    for (const division of ["elite", "strider", "riser"] as const) {
      const buffer = await renderStarDayCertificate({
        ...sampleInput,
        division,
      });
      assertPng(buffer);
    }
  });
});
