import { and, eq } from "drizzle-orm";

import { getDb } from "../src/db";
import { activities, challengeDay, users } from "../src/db/schema";
import { uploadBlob } from "../src/lib/blob-storage";
import { distanceKmToStorage } from "../src/lib/distance";
import { parseDivision } from "../src/lib/divisions";
import { computeBasePoints } from "../src/lib/scoring";
import { computeStandingsFromData } from "../src/lib/standings";
import { loadScoringDataset } from "../src/lib/scoring-dataset";
import { getStandingForUser } from "../src/lib/standings";

const NITIN_PADMAWAR_USER_ID = "3cc81dcf-5853-42cd-ae70-bb48043a5d28";

const RESTORED_LOGS = [
  { date: "2026-06-29", steps: 9344, distanceKm: 7.1 },
  { date: "2026-06-30", steps: 10315, distanceKm: 7.9 },
  { date: "2026-07-01", steps: 14191, distanceKm: 10.8 },
  { date: "2026-07-02", steps: 9738, distanceKm: 6.7 },
  { date: "2026-07-03", steps: 6695, distanceKm: 5.3 },
  { date: "2026-07-04", steps: 9316, distanceKm: 7.2 },
  { date: "2026-07-05", steps: 10138, distanceKm: 10.4 },
] as const;

/** Smallest valid JPEG (1×1), used as a restored-entry placeholder photo. */
const PLACEHOLDER_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEABj8Cf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8hf//Z",
  "base64",
);

async function main() {
  const db = getDb();

  const [user] = await db
    .select({ id: users.id, name: users.name, division: users.division })
    .from(users)
    .where(eq(users.id, NITIN_PADMAWAR_USER_ID))
    .limit(1);

  if (!user) {
    throw new Error("Nitin Padmawar not found.");
  }

  const division = parseDivision(user.division);
  const challengeDays = await db
    .select({
      date: challengeDay.date,
      targetSteps: challengeDay.targetSteps,
      dayRate: challengeDay.dayRate,
    })
    .from(challengeDay);

  const dayMap = new Map(challengeDays.map((day) => [day.date, day]));

  const uploaded = await uploadBlob(
    `activities/${user.id}/restored-placeholder-${Date.now()}.jpg`,
    PLACEHOLDER_JPEG,
    "image/jpeg",
  );

  let inserted = 0;

  for (const log of RESTORED_LOGS) {
    const day = dayMap.get(log.date);
    if (!day) {
      throw new Error(`Missing challenge day for ${log.date}`);
    }

    const [existing] = await db
      .select({ id: activities.id })
      .from(activities)
      .where(
        and(
          eq(activities.userId, user.id),
          eq(activities.activityDate, log.date),
        ),
      )
      .limit(1);

    if (existing) {
      console.log(`${log.date}: skipped (already exists)`);
      continue;
    }

    const basePoints = computeBasePoints(
      log.steps,
      day.targetSteps,
      day.dayRate,
      log.date,
      division,
    );

    await db.insert(activities).values({
      userId: user.id,
      activityDate: log.date,
      steps: log.steps,
      distanceKm: distanceKmToStorage(log.distanceKm),
      photoUrl: uploaded.url,
      status: "approved",
      basePoints,
    });

    console.log(
      `${log.date}: ${log.steps.toLocaleString("en-IN")} steps · ${log.distanceKm} km · ${basePoints} pts`,
    );
    inserted += 1;
  }

  const dataset = await loadScoringDataset();
  const standings = computeStandingsFromData(dataset);
  const standing = getStandingForUser(standings, user.id);

  console.log(`\nRestored ${inserted} approved activities for ${user.name}.`);
  if (standing) {
    console.log(
      `Standing: ${standing.total} total (${standing.breakdown.base} base + ${standing.breakdown.starDay + standing.breakdown.weekStar + standing.breakdown.consistency} bonus) · rank #${standing.rank}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
