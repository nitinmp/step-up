/**
 * Migrates legacy certificate tables into user_certificate + certificate_run.
 *
 * Run once BEFORE db:push drops the old tables, or immediately after push if old
 * tables still exist:
 *
 *   pnpm tsx scripts/migrate-unified-certificates.ts
 */
import { sql } from "drizzle-orm";

import { getDb } from "@/db";

async function tableExists(tableName: string): Promise<boolean> {
  const db = getDb();
  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
    ) AS exists
  `);

  const row = result.rows[0] as { exists?: boolean } | undefined;
  return Boolean(row?.exists);
}

async function main() {
  const db = getDb();

  if (!(await tableExists("user_certificate"))) {
    console.error(
      "user_certificate table not found. Run `pnpm db:push` first to create new tables.",
    );
    process.exit(1);
  }

  if (await tableExists("star_day_certificate_run")) {
    await db.execute(sql`
      INSERT INTO certificate_run (id, activity_date, generated_by, generated_at)
      SELECT id, activity_date, generated_by, generated_at
      FROM star_day_certificate_run
      ON CONFLICT (activity_date) DO NOTHING
    `);
    console.log("Migrated certificate runs.");
  }

  if (await tableExists("star_day_certificate")) {
    await db.execute(sql`
      INSERT INTO user_certificate (
        id,
        user_id,
        certificate_type,
        target,
        image_url,
        generated_at,
        run_id,
        recipient_name,
        division,
        steps
      )
      SELECT
        id,
        user_id,
        'star_day',
        activity_date,
        image_url,
        NOW(),
        run_id,
        recipient_name,
        division,
        steps
      FROM star_day_certificate
      ON CONFLICT (user_id, certificate_type, target) DO NOTHING
    `);
    console.log("Migrated star day certificates.");
  }

  if (await tableExists("week_progress_certificate")) {
    await db.execute(sql`
      INSERT INTO user_certificate (
        id,
        user_id,
        certificate_type,
        target,
        image_url,
        generated_at
      )
      SELECT
        id,
        user_id,
        'week_progress',
        week_no::text,
        image_url,
        generated_at
      FROM week_progress_certificate
      ON CONFLICT (user_id, certificate_type, target) DO NOTHING
    `);
    console.log("Migrated week progress certificates.");
  }

  if (await tableExists("star_week_certificate")) {
    await db.execute(sql`
      INSERT INTO user_certificate (
        id,
        user_id,
        certificate_type,
        target,
        image_url,
        generated_at
      )
      SELECT
        id,
        user_id,
        'star_week',
        week_no::text,
        image_url,
        generated_at
      FROM star_week_certificate
      ON CONFLICT (user_id, certificate_type, target) DO NOTHING
    `);
    console.log("Migrated star week certificates.");
  }

  console.log("Migration complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
