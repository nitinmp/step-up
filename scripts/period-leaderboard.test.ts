import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeDailyLeaderboard } from "../src/lib/period-leaderboard";

const PUSHPA_ID = "65689836-b8da-4abe-94b7-c9556fcc160e";

const config = {
  starOfDayPoints: 50,
  starOfWeekPoints: 100,
  beastMultiplier: 2,
  consistency5: 25,
  consistency6: 50,
  consistency7: 75,
};

describe("computeDailyLeaderboard", () => {
  it("uses divisionBeforeStage4 for dates before the stage 4 cutover", () => {
    const users = [
      {
        id: PUSHPA_ID,
        name: "Pushpa",
        createdAt: new Date("2026-06-01"),
        division: "elite" as const,
        divisionBeforeStage4: "riser" as const,
      },
    ];
    const challengeDays = [
      { date: "2026-07-19", weekNo: 3, dayRate: 10, targetSteps: 9000 },
    ];
    const activities = [
      {
        userId: PUSHPA_ID,
        activityDate: "2026-07-19",
        steps: 31660,
        basePoints: 100,
        status: "approved",
      },
    ];
    const baseInput = {
      date: "2026-07-19",
      users,
      activities,
      challengeDays,
      config,
      calendarToday: "2026-07-20",
    };

    const riserBoard = computeDailyLeaderboard({
      ...baseInput,
      division: "riser",
    });
    const eliteBoard = computeDailyLeaderboard({
      ...baseInput,
      division: "elite",
    });

    assert.equal(
      riserBoard.some((entry) => entry.userId === PUSHPA_ID),
      true,
    );
    assert.equal(
      eliteBoard.some((entry) => entry.userId === PUSHPA_ID),
      false,
    );
  });
});
