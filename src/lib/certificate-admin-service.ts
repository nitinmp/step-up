import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import { ActivityError } from "@/lib/activities-service";
import { deleteBlobUrl, uploadBlob } from "@/lib/blob-storage";
import { renderStarDayCertificate } from "@/lib/certificate-template";
import { CERTIFICATE_TYPES } from "@/lib/certificate-types";
import type { Division } from "@/lib/divisions";
import { divisionsActiveOnDate } from "@/lib/group-rules";
import { computeDailyLeaderboard } from "@/lib/period-leaderboard";
import { loadScoringDataset } from "@/lib/scoring-dataset";
import {
  createCertificateRun,
  deleteStarDayCertificatesForTarget,
  findCertificateRunByDate,
  insertUserCertificate,
  listCertificateRuns,
  listStarDayCertificatesByTargets,
  rowDivision,
} from "@/lib/user-certificate-store";

export type AdminCertificateRecord = {
  id: string;
  userId: string;
  recipientName: string;
  division: Division;
  steps: number;
  imageUrl: string;
};

export type AdminCertificateDayRow = {
  date: string;
  weekNo: number;
  targetSteps: number;
  status: "pending" | "generated" | "incomplete";
  generatedAt: string | null;
  generatedByName: string | null;
  winnerCount: number;
  winners: Array<{
    userId: string;
    name: string;
    division: Division;
    steps: number;
  }>;
  certificates: AdminCertificateRecord[];
};

export type AdminCertificateSnapshot = {
  calendarToday: string;
  days: AdminCertificateDayRow[];
};

type StarWinner = {
  userId: string;
  name: string;
  division: Division;
  steps: number;
};

function getStarWinnersForDate(
  dataset: Awaited<ReturnType<typeof loadScoringDataset>>,
  date: string,
): StarWinner[] {
  const winners: StarWinner[] = [];

  for (const division of divisionsActiveOnDate(date)) {
    const entries = computeDailyLeaderboard({
      date,
      division,
      users: dataset.users,
      activities: dataset.activities,
      challengeDays: dataset.challengeDays,
      config: dataset.config,
      calendarToday: dataset.calendarToday,
    });

    for (const entry of entries.filter((row) => row.isStarWinner)) {
      winners.push({
        userId: entry.userId,
        name: entry.name,
        division,
        steps: entry.steps,
      });
    }
  }

  return winners;
}

async function loadCertificatesByDate(
  dates: string[],
): Promise<Map<string, AdminCertificateRecord[]>> {
  const map = new Map<string, AdminCertificateRecord[]>();
  for (const date of dates) {
    map.set(date, []);
  }

  if (dates.length === 0) {
    return map;
  }

  const rows = await listStarDayCertificatesByTargets(dates);

  for (const row of rows) {
    const list = map.get(row.target) ?? [];
    list.push({
      id: row.id,
      userId: row.userId,
      recipientName: row.recipientName ?? "Participant",
      division: rowDivision(row),
      steps: row.steps ?? 0,
      imageUrl: row.imageUrl,
    });
    map.set(row.target, list);
  }

  for (const [date, list] of map) {
    list.sort((a, b) => a.recipientName.localeCompare(b.recipientName));
    map.set(date, list);
  }

  return map;
}

async function loadRunsByDate(
  dates: string[],
): Promise<
  Map<
    string,
    {
      generatedAt: string;
      generatedByName: string | null;
    }
  >
> {
  const db = getDb();
  const runRows = await listCertificateRuns();
  const adminNames = await db
    .select({ id: users.id, name: users.name })
    .from(users);
  const nameById = new Map(adminNames.map((row) => [row.id, row.name]));

  const map = new Map<
    string,
    {
      generatedAt: string;
      generatedByName: string | null;
    }
  >();

  for (const run of runRows) {
    if (!dates.includes(run.activityDate) || map.has(run.activityDate)) {
      continue;
    }
    map.set(run.activityDate, {
      generatedAt: run.generatedAt.toISOString(),
      generatedByName: run.generatedBy
        ? (nameById.get(run.generatedBy) ?? null)
        : null,
    });
  }

  return map;
}

export async function getAdminCertificateSnapshot(): Promise<AdminCertificateSnapshot> {
  const dataset = await loadScoringDataset();
  const endedDays = dataset.challengeDays
    .filter((day) => day.date < dataset.calendarToday)
    .sort((a, b) => b.date.localeCompare(a.date));

  const dates = endedDays.map((day) => day.date);
  const [certificatesByDate, runsByDate] = await Promise.all([
    loadCertificatesByDate(dates),
    loadRunsByDate(dates),
  ]);

  const days: AdminCertificateDayRow[] = endedDays.map((day) => {
    const winners = getStarWinnersForDate(dataset, day.date);
    const certificates = certificatesByDate.get(day.date) ?? [];
    const run = runsByDate.get(day.date);

    return {
      date: day.date,
      weekNo: day.weekNo,
      targetSteps: day.targetSteps,
      status:
        certificates.length > 0
          ? "generated"
          : run
            ? "incomplete"
            : "pending",
      generatedAt: run?.generatedAt ?? null,
      generatedByName: run?.generatedByName ?? null,
      winnerCount: winners.length,
      winners,
      certificates,
    };
  });

  return {
    calendarToday: dataset.calendarToday,
    days,
  };
}

export async function generateStarDayCertificates(input: {
  date: string;
  adminUserId: string;
  regenerate?: boolean;
}): Promise<AdminCertificateDayRow> {
  const dataset = await loadScoringDataset();
  const day = dataset.challengeDays.find((entry) => entry.date === input.date);

  if (!day) {
    throw new ActivityError("Challenge day not found.", 404);
  }

  if (input.date >= dataset.calendarToday) {
    throw new ActivityError(
      "Certificates can only be generated after the day has ended.",
      400,
    );
  }

  const winners = getStarWinnersForDate(dataset, input.date);
  if (winners.length === 0) {
    throw new ActivityError(
      "No star winners for this day. Approve activities first.",
      400,
    );
  }

  const existingRun = await findCertificateRunByDate(input.date);
  if (existingRun) {
    const imageUrls = await deleteStarDayCertificatesForTarget(input.date);
    await Promise.all(imageUrls.map((url) => deleteBlobUrl(url)));
  }

  const run = await createCertificateRun({
    activityDate: input.date,
    generatedBy: input.adminUserId,
  });

  if (!run) {
    throw new ActivityError("Could not create certificate run.", 500);
  }

  const certificates: AdminCertificateRecord[] = [];

  for (const winner of winners) {
    const png = await renderStarDayCertificate({
      recipientName: winner.name,
      steps: winner.steps,
      activityDate: input.date,
      division: winner.division,
    });

    const pathname = `certificates/star-day/${input.date}/${winner.userId}.png`;
    const blob = await uploadBlob(pathname, png, "image/png", {
      allowOverwrite: true,
    });

    const record = await insertUserCertificate({
      userId: winner.userId,
      certificateType: CERTIFICATE_TYPES.STAR_DAY,
      target: input.date,
      imageUrl: blob.url,
      generatedBy: input.adminUserId,
      runId: run.id,
      recipientName: winner.name,
      division: winner.division,
      steps: winner.steps,
    });

    if (!record) {
      throw new ActivityError("Could not save certificate.", 500);
    }

    certificates.push({
      id: record.id,
      userId: record.userId,
      recipientName: winner.name,
      division: winner.division,
      steps: winner.steps,
      imageUrl: record.imageUrl,
    });
  }

  certificates.sort((a, b) => a.recipientName.localeCompare(b.recipientName));

  const db = getDb();
  const [generatedBy] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, input.adminUserId))
    .limit(1);

  return {
    date: input.date,
    weekNo: day.weekNo,
    targetSteps: day.targetSteps,
    status: "generated",
    generatedAt: new Date().toISOString(),
    generatedByName: generatedBy?.name ?? null,
    winnerCount: winners.length,
    winners,
    certificates,
  };
}
