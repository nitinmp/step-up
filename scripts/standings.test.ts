import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeBasePoints } from "../src/lib/scoring";
import {
  computeStandingsFromData,
  type ChallengeDayInput,
  type StandingsInput,
} from "../src/lib/standings";

const SAMPLE_DAYS: ChallengeDayInput[] = [
  { date: "2026-06-29", weekNo: 1, dayRate: 5, targetSteps: 5000 },
  { date: "2026-06-30", weekNo: 1, dayRate: 5, targetSteps: 5000 },
  { date: "2026-07-06", weekNo: 2, dayRate: 10, targetSteps: 7000 },
  { date: "2026-07-07", weekNo: 2, dayRate: 10, targetSteps: 7000 },
];

const DEFAULT_CONFIG = {
  starOfDayPoints: 50,
  starOfWeekPoints: 100,
  beastMultiplier: 2,
  consistency5: 10,
  consistency6: 20,
  consistency7: 35,
};

function makeInput(
  overrides: Partial<StandingsInput> & Pick<StandingsInput, "users" | "activities">,
): StandingsInput {
  return {
    challengeDays: SAMPLE_DAYS,
    config: DEFAULT_CONFIG,
    ...overrides,
  };
}

describe("computeStandingsFromData", () => {
  it("sums approved base points only", () => {
    const base = computeBasePoints(10000, 5000, 5, "2026-06-29", "strider");
    const standings = computeStandingsFromData(
      makeInput({
        users: [
          { id: "u1", name: "Alice", createdAt: new Date("2026-06-01") },
          { id: "u2", name: "Bob", createdAt: new Date("2026-06-02") },
        ],
        activities: [
          {
            userId: "u1",
            activityDate: "2026-06-29",
            steps: 5000,
            basePoints: 5,
            status: "approved",
          },
          {
            userId: "u2",
            activityDate: "2026-06-29",
            steps: 10000,
            basePoints: base,
            status: "approved",
          },
          {
            userId: "u1",
            activityDate: "2026-06-30",
            steps: 1000,
            basePoints: 0,
            status: "disapproved",
          },
        ],
      }),
    );

    const alice = standings.find((row) => row.userId === "u1");
    assert.equal(alice?.breakdown.base, 5);
    assert.equal(alice?.breakdown.starDay, 0);
    assert.equal(alice?.breakdown.weekStar, 0);
    assert.equal(alice?.total, 5);
  });

  it("awards star of the day to all tied top steppers", () => {
    const standings = computeStandingsFromData(
      makeInput({
        users: [
          { id: "u1", name: "Alice", createdAt: new Date("2026-06-01") },
          { id: "u2", name: "Bob", createdAt: new Date("2026-06-02") },
        ],
        activities: [
          {
            userId: "u1",
            activityDate: "2026-06-29",
            steps: 12000,
            basePoints: 40,
            status: "approved",
          },
          {
            userId: "u2",
            activityDate: "2026-06-29",
            steps: 12000,
            basePoints: 40,
            status: "approved",
          },
        ],
      }),
    );

    const alice = standings.find((row) => row.userId === "u1");
    const bob = standings.find((row) => row.userId === "u2");

    assert.equal(alice?.breakdown.starDay, 50);
    assert.equal(bob?.breakdown.starDay, 50);
    assert.equal(alice?.starDayCount, 1);
    assert.equal(bob?.starDayCount, 1);
  });

  it("awards week star to highest weekly step total", () => {
    const standings = computeStandingsFromData(
      makeInput({
        users: [
          { id: "u1", name: "Alice", createdAt: new Date("2026-06-01") },
          { id: "u2", name: "Bob", createdAt: new Date("2026-06-02") },
        ],
        activities: [
          {
            userId: "u1",
            activityDate: "2026-07-06",
            steps: 8000,
            basePoints: 20,
            status: "approved",
          },
          {
            userId: "u1",
            activityDate: "2026-07-07",
            steps: 8000,
            basePoints: 20,
            status: "approved",
          },
          {
            userId: "u2",
            activityDate: "2026-07-06",
            steps: 7000,
            basePoints: 10,
            status: "approved",
          },
        ],
      }),
    );

    const alice = standings.find((row) => row.userId === "u1");
    const bob = standings.find((row) => row.userId === "u2");

    assert.equal(alice?.breakdown.weekStar, 100);
    assert.equal(alice?.weekStarCount, 1);
    assert.equal(bob?.breakdown.weekStar, 0);
  });

  it("applies consistency tiers per week", () => {
    const weekOneDays: ChallengeDayInput[] = [
      { date: "2026-06-29", weekNo: 1, dayRate: 5, targetSteps: 5000 },
      { date: "2026-06-30", weekNo: 1, dayRate: 5, targetSteps: 5000 },
      { date: "2026-07-01", weekNo: 1, dayRate: 5, targetSteps: 6000 },
      { date: "2026-07-02", weekNo: 1, dayRate: 5, targetSteps: 6000 },
      { date: "2026-07-03", weekNo: 1, dayRate: 5, targetSteps: 6000 },
      { date: "2026-07-04", weekNo: 1, dayRate: 5, targetSteps: 7000 },
    ];

    const activities = weekOneDays.map((day, index) => ({
      userId: "u1",
      activityDate: day.date,
      steps: day.targetSteps,
      basePoints: 5,
      status: "approved" as const,
      _index: index,
    }));

    const standings = computeStandingsFromData({
      users: [{ id: "u1", name: "Alice", createdAt: new Date("2026-06-01") }],
      activities: activities.slice(0, 6),
      challengeDays: weekOneDays,
      config: DEFAULT_CONFIG,
    });

    assert.equal(standings[0]?.daysMet, 6);
    assert.equal(standings[0]?.breakdown.consistency, 20);
  });

  it("counts beast badges without adding points", () => {
    const standings = computeStandingsFromData(
      makeInput({
        users: [
          { id: "u1", name: "Alice", createdAt: new Date("2026-06-01") },
          { id: "u2", name: "Bob", createdAt: new Date("2026-06-02") },
        ],
        activities: [
          {
            userId: "u1",
            activityDate: "2026-06-29",
            steps: 10000,
            basePoints: 30,
            status: "approved",
          },
          {
            userId: "u2",
            activityDate: "2026-06-29",
            steps: 9000,
            basePoints: 25,
            status: "approved",
          },
        ],
      }),
    );

    const alice = standings.find((row) => row.userId === "u1");
    assert.equal(alice?.beastCount, 1);
    assert.equal(
      alice?.total,
      (alice?.breakdown.base ?? 0) +
        (alice?.breakdown.starDay ?? 0) +
        (alice?.breakdown.weekStar ?? 0) +
        (alice?.breakdown.consistency ?? 0),
    );
  });

  it("withholds star of the day until the calendar day ends", () => {
    const standings = computeStandingsFromData(
      makeInput({
        today: "2026-06-29",
        users: [{ id: "u1", name: "Alice", createdAt: new Date("2026-06-01") }],
        activities: [
          {
            userId: "u1",
            activityDate: "2026-06-29",
            steps: 10000,
            basePoints: 30,
            status: "approved",
          },
        ],
      }),
    );

    assert.equal(standings[0]?.breakdown.base, 30);
    assert.equal(standings[0]?.breakdown.starDay, 0);
    assert.equal(standings[0]?.total, 30);
  });

  it("awards star of the day after the calendar day ends", () => {
    const standings = computeStandingsFromData(
      makeInput({
        today: "2026-06-30",
        users: [{ id: "u1", name: "Alice", createdAt: new Date("2026-06-01") }],
        activities: [
          {
            userId: "u1",
            activityDate: "2026-06-29",
            steps: 10000,
            basePoints: 30,
            status: "approved",
          },
        ],
      }),
    );

    assert.equal(standings[0]?.breakdown.starDay, 50);
    assert.equal(standings[0]?.total, 80);
  });

  it("withholds week star until the week ends", () => {
    const standings = computeStandingsFromData(
      makeInput({
        today: "2026-06-30",
        users: [{ id: "u1", name: "Alice", createdAt: new Date("2026-06-01") }],
        activities: [
          {
            userId: "u1",
            activityDate: "2026-06-29",
            steps: 10000,
            basePoints: 30,
            status: "approved",
          },
        ],
      }),
    );

    assert.equal(standings[0]?.breakdown.weekStar, 0);
    assert.equal(standings[0]?.breakdown.starDay, 50);
    assert.equal(standings[0]?.total, 80);
  });

  it("ranks by total, then steps, then earliest registration", () => {
    const standings = computeStandingsFromData(
      makeInput({
        users: [
          { id: "u1", name: "Alice", createdAt: new Date("2026-06-01") },
          { id: "u2", name: "Bob", createdAt: new Date("2026-06-02") },
          { id: "u3", name: "Cara", createdAt: new Date("2026-06-03") },
        ],
        activities: [
          {
            userId: "u1",
            activityDate: "2026-06-29",
            steps: 5000,
            basePoints: 5,
            status: "approved",
          },
          {
            userId: "u2",
            activityDate: "2026-06-29",
            steps: 8000,
            basePoints: 20,
            status: "approved",
          },
          {
            userId: "u3",
            activityDate: "2026-06-29",
            steps: 5000,
            basePoints: 5,
            status: "approved",
          },
        ],
      }),
    );

    assert.deepEqual(
      standings.map((row) => row.userId),
      ["u2", "u1", "u3"],
    );
    assert.equal(standings[0]?.rank, 1);
    assert.equal(standings[1]?.rank, 2);
    assert.equal(standings[2]?.rank, 3);
  });

  it("awards star of the day separately per division", () => {
    const standings = computeStandingsFromData(
      makeInput({
        today: "2026-06-30",
        users: [
          { id: "e1", name: "Elite Ace", createdAt: new Date("2026-06-01"), division: "elite" },
          { id: "s1", name: "Strider Ace", createdAt: new Date("2026-06-02"), division: "strider" },
        ],
        activities: [
          {
            userId: "e1",
            activityDate: "2026-06-29",
            steps: 9000,
            basePoints: 25,
            status: "approved",
          },
          {
            userId: "s1",
            activityDate: "2026-06-29",
            steps: 7000,
            basePoints: 15,
            status: "approved",
          },
        ],
      }),
    );

    const elite = standings.find((row) => row.userId === "e1");
    const strider = standings.find((row) => row.userId === "s1");

    assert.equal(elite?.breakdown.starDay, 50);
    assert.equal(strider?.breakdown.starDay, 50);
  });

  it("does not award a separate riser star pool before cutover", () => {
    const standings = computeStandingsFromData(
      makeInput({
        today: "2026-07-06",
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
          {
            userId: "riser-user",
            activityDate: "2026-06-29",
            steps: 12000,
            basePoints: 40,
            status: "approved",
          },
          {
            userId: "strider-user",
            activityDate: "2026-06-29",
            steps: 13000,
            basePoints: 45,
            status: "approved",
          },
        ],
      }),
    );

    const riserUser = standings.find((row) => row.userId === "riser-user");
    const striderUser = standings.find((row) => row.userId === "strider-user");

    assert.equal(riserUser?.breakdown.starDay, 0);
    assert.equal(striderUser?.breakdown.starDay, 50);
  });
});
