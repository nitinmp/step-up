import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { sql } from "drizzle-orm";

import { createDb } from "../src/db";
import {
  challengeConfig,
  challengeDay,
} from "../src/db/schema";

const CHALLENGE_DAYS = [
  { date: "2026-06-29", weekNo: 1, dayRate: 5, targetSteps: 5000 },
  { date: "2026-06-30", weekNo: 1, dayRate: 5, targetSteps: 5000 },
  { date: "2026-07-01", weekNo: 1, dayRate: 5, targetSteps: 6000 },
  { date: "2026-07-02", weekNo: 1, dayRate: 5, targetSteps: 6000 },
  { date: "2026-07-03", weekNo: 1, dayRate: 5, targetSteps: 6000 },
  { date: "2026-07-04", weekNo: 1, dayRate: 5, targetSteps: 7000 },
  { date: "2026-07-05", weekNo: 1, dayRate: 5, targetSteps: 7000 },
  { date: "2026-07-06", weekNo: 2, dayRate: 10, targetSteps: 7000 },
  { date: "2026-07-07", weekNo: 2, dayRate: 10, targetSteps: 7000 },
  { date: "2026-07-08", weekNo: 2, dayRate: 10, targetSteps: 8000 },
  { date: "2026-07-09", weekNo: 2, dayRate: 10, targetSteps: 8000 },
  { date: "2026-07-10", weekNo: 2, dayRate: 10, targetSteps: 8000 },
  { date: "2026-07-11", weekNo: 2, dayRate: 10, targetSteps: 9000 },
  { date: "2026-07-12", weekNo: 2, dayRate: 10, targetSteps: 9000 },
  { date: "2026-07-13", weekNo: 3, dayRate: 15, targetSteps: 9000 },
  { date: "2026-07-14", weekNo: 3, dayRate: 15, targetSteps: 9000 },
  { date: "2026-07-15", weekNo: 3, dayRate: 15, targetSteps: 10000 },
  { date: "2026-07-16", weekNo: 3, dayRate: 15, targetSteps: 10000 },
  { date: "2026-07-17", weekNo: 3, dayRate: 15, targetSteps: 10000 },
  { date: "2026-07-18", weekNo: 3, dayRate: 15, targetSteps: 11000 },
  { date: "2026-07-19", weekNo: 3, dayRate: 15, targetSteps: 11000 },
  { date: "2026-07-20", weekNo: 4, dayRate: 20, targetSteps: 11000 },
  { date: "2026-07-21", weekNo: 4, dayRate: 20, targetSteps: 11000 },
  { date: "2026-07-22", weekNo: 4, dayRate: 20, targetSteps: 11000 },
  { date: "2026-07-23", weekNo: 4, dayRate: 20, targetSteps: 12000 },
  { date: "2026-07-24", weekNo: 4, dayRate: 20, targetSteps: 12000 },
  { date: "2026-07-25", weekNo: 4, dayRate: 20, targetSteps: 12000 },
  { date: "2026-07-26", weekNo: 4, dayRate: 20, targetSteps: 13000 },
  { date: "2026-07-27", weekNo: 4, dayRate: 20, targetSteps: 13000 },
] as const;

async function main() {
  const db = createDb();

  await db
    .insert(challengeConfig)
    .values({
      id: 1,
      starOfDayPoints: 50,
      starOfWeekPoints: 100,
      beastMultiplier: 2,
      consistency5: 10,
      consistency6: 20,
      consistency7: 35,
      startDate: "2026-06-29",
      endDate: "2026-07-27",
    })
    .onConflictDoUpdate({
      target: challengeConfig.id,
      set: {
        starOfDayPoints: 50,
        starOfWeekPoints: 100,
        beastMultiplier: 2,
        consistency5: 10,
        consistency6: 20,
        consistency7: 35,
        startDate: "2026-06-29",
        endDate: "2026-07-27",
      },
    });

  for (const day of CHALLENGE_DAYS) {
    await db
      .insert(challengeDay)
      .values(day)
      .onConflictDoUpdate({
        target: challengeDay.date,
        set: {
          weekNo: day.weekNo,
          dayRate: day.dayRate,
          targetSteps: day.targetSteps,
        },
      });
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(challengeDay);

  console.log(`Seeded challenge config and ${count} challenge days.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
