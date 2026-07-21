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

const mockReport = {
  recipientName: "Nitin Padmawar",
  division: "riser" as const,
  weekNo: 2,
  weekLabel: "Week 2 of 4",
  dateRange: "Mon, 6 Jul – Sun, 12 Jul",
  targetLabel: "7k–9k",
  targetLow: 7000,
  targetHigh: 9000,
  daysMet: 7,
  totalDays: 7,
  totalSteps: 69227,
  totalDistanceKm: 53.7,
  peakSteps: 11219,
  peakDayLabel: "S",
  weekPoints: 185,
  basePoints: 70,
  pushPoints: 80,
  consistencyPoints: 35,
  starPoints: 0,
  badgesUnlocked: [
    { name: "Perfect Week", type: "perfect" as const },
    { name: "14-Day Streak", type: "streak" as const },
    { name: "Beast ×1", type: "beast" as const },
  ],
  rank: 4,
  rankDelta: 2,
  currentStreak: 14,
  headline: "Perfect week — 7 for 7.",
  headlineSubline:
    "Every target hit, and a new personal best of 11,219 steps.",
  pushNote:
    "Riser bonus: every step past 10,000 counted 2× this week — that's your +80 push points.",
  dailySteps: [
    { label: "M", steps: 9200, targetSteps: 7000, metTarget: true },
    { label: "T", steps: 8800, targetSteps: 7000, metTarget: true },
    { label: "W", steps: 10100, targetSteps: 8000, metTarget: true },
    { label: "T", steps: 9600, targetSteps: 8000, metTarget: true },
    { label: "F", steps: 9900, targetSteps: 9000, metTarget: true },
    { label: "S", steps: 10400, targetSteps: 9000, metTarget: true },
    { label: "S", steps: 11219, targetSteps: 9000, metTarget: true },
  ],
};

describe("renderWeekProgressCertificate", () => {
  it("renders a square PNG buffer for each division theme", async () => {
    for (const division of ["elite", "strider", "riser"] as const) {
      const buffer = await renderWeekProgressCertificate({
        ...mockReport,
        division,
      });
      assertPng(buffer);
    }
  });
});
