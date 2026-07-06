import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DIVISION_BEFORE_CUTOVER,
  DIVISION_CUTOVER_DATE,
  getDivisionForDate,
} from "../src/lib/division-as-of-cutover";

const MOHIT_MENON_ID = "afafd81d-8624-47d4-a621-9b42dc5ccffd";
const VARSHALI_KHAMETE_ID = "fd92914b-9d1a-4f72-a66e-05aa34067fc3";
const PUSHPA_ID = "65689836-b8da-4abe-94b7-c9556fcc160e";
const ANU_ID = "4669b36d-d4cb-45a6-8b87-98d72591ca8e";

describe("getDivisionForDate", () => {
  it("uses historical map before cutover", () => {
    assert.equal(
      getDivisionForDate(MOHIT_MENON_ID, "elite", "2026-07-05"),
      "strider",
    );
    assert.equal(
      getDivisionForDate(VARSHALI_KHAMETE_ID, "strider", "2026-07-05"),
      "elite",
    );
    assert.equal(getDivisionForDate(PUSHPA_ID, "riser", "2026-07-05"), "strider");
    assert.equal(getDivisionForDate(ANU_ID, "elite", "2026-07-05"), "elite");
  });

  it("uses current division from cutover onward", () => {
    assert.equal(
      getDivisionForDate(MOHIT_MENON_ID, "elite", DIVISION_CUTOVER_DATE),
      "elite",
    );
    assert.equal(
      getDivisionForDate(VARSHALI_KHAMETE_ID, "strider", DIVISION_CUTOVER_DATE),
      "strider",
    );
    assert.equal(getDivisionForDate(PUSHPA_ID, "riser", DIVISION_CUTOVER_DATE), "riser");
  });

  it("maps every participant to elite or strider before cutover", () => {
    assert.equal(Object.keys(DIVISION_BEFORE_CUTOVER).length, 65);
    const eliteCount = Object.values(DIVISION_BEFORE_CUTOVER).filter(
      (division) => division === "elite",
    ).length;
    assert.equal(eliteCount, 8);
  });
});
