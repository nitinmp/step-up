import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeParticipantBadges } from "../src/lib/participant-badges";
import type { StandingsInput } from "../src/lib/standings";

const DEFAULT_CONFIG = {
  starOfDayPoints: 50,
  starOfWeekPoints: 100,
  beastMultiplier: 2,
  consistency5: 10,
  consistency6: 20,
  consistency7: 35,
};

const DAYS = [
  { date: "2026-07-01", weekNo: 1, dayRate: 5, targetSteps: 6000 },
  { date: "2026-07-02", weekNo: 1, dayRate: 5, targetSteps: 6000 },
  { date: "2026-07-03", weekNo: 1, dayRate: 5, targetSteps: 6000 },
  { date: "2026-07-04", weekNo: 1, dayRate: 5, targetSteps: 7000 },
  { date: "2026-07-05", weekNo: 1, dayRate: 5, targetSteps: 7000 },
];

function makeInput(
  overrides: Partial<StandingsInput> & Pick<StandingsInput, "users" | "activities">,
): StandingsInput {
  return {
    challengeDays: DAYS,
    config: DEFAULT_CONFIG,
    today: "2026-07-06",
    ...overrides,
  };
}

describe("computeParticipantBadges", () => {
  it("awards star of the day for ended days within division", () => {
    const badges = computeParticipantBadges(
      "u1",
      makeInput({
        users: [
          { id: "u1", name: "Alice", createdAt: new Date("2026-06-01"), division: "strider" },
          { id: "u2", name: "Bob", createdAt: new Date("2026-06-02"), division: "strider" },
        ],
        activities: [
          { userId: "u1", activityDate: "2026-07-01", steps: 9000, basePoints: 20, status: "approved" },
          { userId: "u2", activityDate: "2026-07-01", steps: 7000, basePoints: 10, status: "approved" },
        ],
      }),
    );

    const starDay = badges.find((badge) => badge.kind === "star_day");
    assert.ok(starDay);
    assert.equal(starDay.kind === "star_day" ? starDay.date : "", "2026-07-01");
  });

  it("awards week star and consistency after week ends", () => {
    const badges = computeParticipantBadges(
      "u1",
      makeInput({
        users: [{ id: "u1", name: "Alice", createdAt: new Date("2026-06-01"), division: "strider" }],
        activities: DAYS.map((day) => ({
          userId: "u1",
          activityDate: day.date,
          steps: day.targetSteps,
          basePoints: 5,
          status: "approved" as const,
        })),
      }),
    );

    assert.ok(badges.some((badge) => badge.kind === "star_week"));
    assert.ok(badges.some((badge) => badge.kind === "consistency" && badge.tier === 5));
  });

  it("does not award week star when another user has more weekly steps", () => {
    const badges = computeParticipantBadges(
      "u1",
      makeInput({
        users: [
          { id: "u1", name: "Alice", createdAt: new Date("2026-06-01"), division: "strider" },
          { id: "u2", name: "Bob", createdAt: new Date("2026-06-02"), division: "strider" },
        ],
        activities: [
          ...DAYS.map((day) => ({
            userId: "u1",
            activityDate: day.date,
            steps: day.targetSteps,
            basePoints: 5,
            status: "approved" as const,
          })),
          ...DAYS.map((day) => ({
            userId: "u2",
            activityDate: day.date,
            steps: day.targetSteps + 1000,
            basePoints: 5,
            status: "approved" as const,
          })),
        ],
      }),
    );

    assert.equal(badges.some((badge) => badge.kind === "star_week"), false);
    assert.ok(badges.some((badge) => badge.kind === "consistency"));
  });

  it("uses two-division star pools before cutover even if user is now riser", () => {
    const badges = computeParticipantBadges(
      "riser-user",
      makeInput({
        users: [
          {
            id: "riser-user",
            name: "Ravi",
            createdAt: new Date("2026-06-01"),
            division: "riser",
          },
          {
            id: "strider-user",
            name: "Sam",
            createdAt: new Date("2026-06-02"),
            division: "strider",
          },
        ],
        activities: [
          ...DAYS.map((day) => ({
            userId: "riser-user",
            activityDate: day.date,
            steps: day.targetSteps + 500,
            basePoints: 5,
            status: "approved" as const,
          })),
          ...DAYS.map((day) => ({
            userId: "strider-user",
            activityDate: day.date,
            steps: day.targetSteps + 1000,
            basePoints: 5,
            status: "approved" as const,
          })),
        ],
      }),
    );

    assert.equal(badges.some((badge) => badge.kind === "star_week"), false);
  });
});
