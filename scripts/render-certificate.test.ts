import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { renderStarDayCertificate } from "../src/lib/certificate-template";

describe("renderStarDayCertificate", () => {
  it("renders a PNG buffer for a sample winner", async () => {
    const buffer = await renderStarDayCertificate({
      recipientName: "Pushpa",
      steps: 31660,
      activityDate: "2026-07-19",
      division: "riser",
    });

    assert.ok(buffer.byteLength > 1000);
    const bytes = new Uint8Array(buffer.slice(0, 8));
    assert.equal(bytes[0], 0x89);
    assert.equal(bytes[1], 0x50);
    assert.equal(bytes[2], 0x4e);
    assert.equal(bytes[3], 0x47);
  });
});
