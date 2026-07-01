import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getAdminLoggableDateCandidates,
  isAdminLoggableDate,
  isLoggableChallengeDate,
} from "../src/lib/dates";

const window = { startDate: "2026-06-01", endDate: "2026-06-29" };

describe("isLoggableChallengeDate", () => {
  it("allows any in-window date when open logging is enabled", () => {
    assert.equal(
      isLoggableChallengeDate("2026-06-15", window.startDate, window.endDate, {
        allowOpenChallengeLogging: true,
        timezone: "Asia/Kolkata",
      }),
      true,
    );
    assert.equal(
      isLoggableChallengeDate("2026-06-30", window.startDate, window.endDate, {
        allowOpenChallengeLogging: true,
        timezone: "Asia/Kolkata",
      }),
      false,
    );
  });

  it("allows only today when open logging is disabled", () => {
    const todayOnly = isLoggableChallengeDate(
      "2026-06-01",
      window.startDate,
      window.endDate,
      {
        allowOpenChallengeLogging: false,
        timezone: "Asia/Kolkata",
      },
    );
    const today = isLoggableChallengeDate(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()),
      window.startDate,
      window.endDate,
      {
        allowOpenChallengeLogging: false,
        timezone: "Asia/Kolkata",
      },
    );

    assert.equal(todayOnly, false);
    assert.equal(today, true);
  });
});

describe("isAdminLoggableDate", () => {
  it("allows today and the previous two in-window days", () => {
    const today = "2026-06-30";
    const candidates = getAdminLoggableDateCandidates(today, 2);

    assert.deepEqual(candidates, ["2026-06-30", "2026-06-29", "2026-06-28"]);
    assert.equal(
      isAdminLoggableDate("2026-06-30", today, "2026-06-01", "2026-07-27"),
      true,
    );
    assert.equal(
      isAdminLoggableDate("2026-06-29", today, "2026-06-01", "2026-07-27"),
      true,
    );
    assert.equal(
      isAdminLoggableDate("2026-06-28", today, "2026-06-01", "2026-07-27"),
      true,
    );
    assert.equal(
      isAdminLoggableDate("2026-06-27", today, "2026-06-01", "2026-07-27"),
      false,
    );
  });
});
