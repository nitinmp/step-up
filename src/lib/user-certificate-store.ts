import { and, desc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import { certificateRun, userCertificate } from "@/db/schema";
import type { CertificateMetadata, CertificateType } from "@/lib/certificate-types";
import { parseDivision, type Division } from "@/lib/divisions";

export type UserCertificateRow = {
  id: string;
  userId: string;
  certificateType: CertificateType;
  target: string;
  imageUrl: string;
  generatedAt: Date;
  generatedBy: string | null;
  runId: string | null;
  recipientName: string | null;
  division: string | null;
  steps: number | null;
  metadata: CertificateMetadata | null;
};

export type InsertUserCertificateInput = {
  userId: string;
  certificateType: CertificateType;
  target: string;
  imageUrl: string;
  generatedBy?: string | null;
  runId?: string | null;
  recipientName?: string | null;
  division?: Division | null;
  steps?: number | null;
  metadata?: CertificateMetadata | null;
};

function parseMetadata(value: string | null): CertificateMetadata | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as CertificateMetadata;
  } catch {
    return null;
  }
}

function serializeMetadata(metadata: CertificateMetadata | null | undefined) {
  if (!metadata) {
    return null;
  }

  return JSON.stringify(metadata);
}

function mapRow(row: typeof userCertificate.$inferSelect): UserCertificateRow {
  return {
    id: row.id,
    userId: row.userId,
    certificateType: row.certificateType as CertificateType,
    target: row.target,
    imageUrl: row.imageUrl,
    generatedAt: row.generatedAt,
    generatedBy: row.generatedBy,
    runId: row.runId,
    recipientName: row.recipientName,
    division: row.division,
    steps: row.steps,
    metadata: parseMetadata(row.metadata),
  };
}

export async function insertUserCertificate(input: InsertUserCertificateInput) {
  const db = getDb();
  const [record] = await db
    .insert(userCertificate)
    .values({
      userId: input.userId,
      certificateType: input.certificateType,
      target: input.target,
      imageUrl: input.imageUrl,
      generatedBy: input.generatedBy ?? null,
      runId: input.runId ?? null,
      recipientName: input.recipientName ?? null,
      division: input.division ?? null,
      steps: input.steps ?? null,
      metadata: serializeMetadata(input.metadata),
    })
    .returning();

  if (!record) {
    return null;
  }

  return mapRow(record);
}

export async function updateUserCertificate(
  id: string,
  input: {
    imageUrl: string;
    recipientName?: string | null;
    division?: Division | null;
    steps?: number | null;
    metadata?: CertificateMetadata | null;
  },
) {
  const db = getDb();
  const [record] = await db
    .update(userCertificate)
    .set({
      imageUrl: input.imageUrl,
      recipientName: input.recipientName ?? null,
      division: input.division ?? null,
      steps: input.steps ?? null,
      metadata: serializeMetadata(input.metadata),
      generatedAt: new Date(),
    })
    .where(eq(userCertificate.id, id))
    .returning();

  return record ? mapRow(record) : null;
}

export async function findUserCertificate(
  userId: string,
  certificateType: CertificateType,
  target: string,
): Promise<UserCertificateRow | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(userCertificate)
    .where(
      and(
        eq(userCertificate.userId, userId),
        eq(userCertificate.certificateType, certificateType),
        eq(userCertificate.target, target),
      ),
    )
    .limit(1);

  return row ? mapRow(row) : null;
}

export async function findUserCertificateById(
  userId: string,
  certificateId: string,
): Promise<UserCertificateRow | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(userCertificate)
    .where(
      and(
        eq(userCertificate.userId, userId),
        eq(userCertificate.id, certificateId),
      ),
    )
    .limit(1);

  return row ? mapRow(row) : null;
}

export async function listUserCertificatesByType(
  userId: string,
  certificateType: CertificateType,
): Promise<UserCertificateRow[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(userCertificate)
    .where(
      and(
        eq(userCertificate.userId, userId),
        eq(userCertificate.certificateType, certificateType),
      ),
    )
    .orderBy(desc(userCertificate.generatedAt));

  return rows.map(mapRow);
}

export async function listStarDayCertificatesByTargets(
  targets: string[],
): Promise<UserCertificateRow[]> {
  if (targets.length === 0) {
    return [];
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(userCertificate)
    .where(
      and(
        eq(userCertificate.certificateType, "star_day"),
        inArray(userCertificate.target, targets),
      ),
    );

  return rows.map(mapRow);
}

export async function listGeneratedWeekTargets(
  userId: string,
  certificateType: CertificateType,
): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ target: userCertificate.target })
    .from(userCertificate)
    .where(
      and(
        eq(userCertificate.userId, userId),
        eq(userCertificate.certificateType, certificateType),
      ),
    );

  return rows.map((row) => row.target);
}

export async function createCertificateRun(input: {
  activityDate: string;
  generatedBy: string;
}) {
  const db = getDb();
  const [run] = await db
    .insert(certificateRun)
    .values({
      activityDate: input.activityDate,
      generatedBy: input.generatedBy,
    })
    .returning();

  return run ?? null;
}

export async function findCertificateRunByDate(activityDate: string) {
  const db = getDb();
  const [run] = await db
    .select()
    .from(certificateRun)
    .where(eq(certificateRun.activityDate, activityDate))
    .limit(1);

  return run ?? null;
}

export async function listCertificateRuns() {
  const db = getDb();
  return db
    .select()
    .from(certificateRun)
    .orderBy(desc(certificateRun.generatedAt));
}

export async function deleteStarDayCertificatesForTarget(
  target: string,
): Promise<string[]> {
  const db = getDb();
  const existing = await db
    .select({ imageUrl: userCertificate.imageUrl })
    .from(userCertificate)
    .where(
      and(
        eq(userCertificate.certificateType, "star_day"),
        eq(userCertificate.target, target),
      ),
    );

  await db
    .delete(userCertificate)
    .where(
      and(
        eq(userCertificate.certificateType, "star_day"),
        eq(userCertificate.target, target),
      ),
    );

  await db
    .delete(certificateRun)
    .where(eq(certificateRun.activityDate, target));

  return existing.map((row) => row.imageUrl);
}

export function rowDivision(row: UserCertificateRow): Division {
  return parseDivision(row.division);
}
