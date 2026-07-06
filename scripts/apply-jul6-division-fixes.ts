import { eq } from "drizzle-orm";

import { getDb } from "../src/db";
import { users } from "../src/db/schema";

/** Varshali Khambete: Elite through 5 Jul, Strider from 6 Jul (DB was still elite). */
const VARSHALI_USER_ID = "fd92914b-9d1a-4f72-a66e-05aa34067fc3";

async function main() {
  const db = getDb();

  const [updated] = await db
    .update(users)
    .set({ division: "strider" })
    .where(eq(users.id, VARSHALI_USER_ID))
    .returning({ id: users.id, name: users.name, division: users.division });

  if (!updated) {
    console.error("Varshali Khambete not found in database.");
    process.exit(1);
  }

  console.log(`Updated ${updated.name} → ${updated.division}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
