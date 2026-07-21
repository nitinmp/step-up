import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { renderWeekProgressCertificate } from "../src/lib/week-progress-template";

function assertPng(buffer: ArrayBuffer) {
  assert.ok(buffer.byteLength > 1000);
  const bytes = new Uint8Array(buffer.slice(0, 8));
  assert.equal(bytes[0], 0x89);
  assert.equal(bytes[1], 0x50);
  assert.equal(bytes[2], 0x4e);
  assert.equal(bytes[3], 0x47);
}

describe("renderWeekProgressCertificate", () => {
  it("renders a PNG buffer for each division theme", async () => {
    for (const division of ["elite", "strider", "riser"] as const) {
      const buffer = await renderWeekProgressCertificate({
        recipientName: "Nitin Padmawar",
        division,
        weekNo: 2,
        dateRange: "Mon, 13 Jul – Sun, 19 Jul",
        targetLabel: "8k–10k",
        daysMet: 5,
        totalDays: 7,
        totalSteps: 84210,
        totalDistanceKm: 64.17,
        dailySteps: [
          { label: "Mon", steps: 10200, targetSteps: 8000, metTarget: true },
          { label: "Tue", steps: 9800, targetSteps: 8000, metTarget: true },
          { label: "Wed", steps: 12100, targetSteps: 8000, metTarget: true },
          { label: "Thu", steps: 7600, targetSteps: 8000, metTarget: false },
          { label: "Fri", steps: 11500, targetSteps: 10000, metTarget: true },
          { label: "Sat", steps: 14210, targetSteps: 10000, metTarget: true },
          { label: "Sun", steps: 18800, targetSteps: 10000, metTarget: true },
        ],
      });
      assertPng(buffer);
    }
  });
});
