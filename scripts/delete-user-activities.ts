import { eq } from "drizzle-orm";

import { getDb } from "../src/db";
import { activities, users } from "../src/db/schema";
import { deleteBlobUrl } from "../src/lib/blob-storage";

const NITIN_PADMAWAR_USER_ID = "3cc81dcf-5853-42cd-ae70-bb48043a5d28";

async function main() {
  const db = getDb();

  const [user] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.id, NITIN_PADMAWAR_USER_ID))
    .limit(1);

  if (!user) {
    console.error("Nitin Padmawar not found.");
    process.exit(1);
  }

  const rows = await db
    .select({
      id: activities.id,
      activityDate: activities.activityDate,
      status: activities.status,
      photoUrl: activities.photoUrl,
    })
    .from(activities)
    .where(eq(activities.userId, user.id));

  if (rows.length === 0) {
    console.log(`No activities to delete for ${user.name}.`);
    return;
  }

  for (const row of rows) {
    await deleteBlobUrl(row.photoUrl);
  }

  await db.delete(activities).where(eq(activities.userId, user.id));

  console.log(`Deleted ${rows.length} activit${rows.length === 1 ? "y" : "ies"} for ${user.name}:`);
  for (const row of rows) {
    console.log(`  - ${row.activityDate} (${row.status})`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
