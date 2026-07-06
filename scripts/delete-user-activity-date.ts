import { and, eq } from "drizzle-orm";

import { getDb } from "../src/db";
import { activities } from "../src/db/schema";
import { deleteBlobUrl } from "../src/lib/blob-storage";
import { getTodayDateString } from "../src/lib/dates";

const NITIN_PADMAWAR_USER_ID = "3cc81dcf-5853-42cd-ae70-bb48043a5d28";

async function main() {
  const date = process.argv[2] ?? getTodayDateString();
  const db = getDb();

  const rows = await db
    .select({
      id: activities.id,
      activityDate: activities.activityDate,
      status: activities.status,
      photoUrl: activities.photoUrl,
    })
    .from(activities)
    .where(
      and(
        eq(activities.userId, NITIN_PADMAWAR_USER_ID),
        eq(activities.activityDate, date),
      ),
    );

  if (rows.length === 0) {
    console.log(`No activity for ${date}.`);
    return;
  }

  for (const row of rows) {
    await deleteBlobUrl(row.photoUrl);
    await db.delete(activities).where(eq(activities.id, row.id));
    console.log(`Deleted ${row.activityDate} (${row.status})`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
