import { desc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import {
  starDayCertificate,
  starDayCertificateRun,
  users,
} from "@/db/schema";
import { ActivityError } from "@/lib/activities-service";
import { deleteBlobUrl, uploadBlob } from "@/lib/blob-storage";
import { renderStarDayCertificate } from "@/lib/certificate-template";
import type { Division } from "@/lib/divisions";
import { parseDivision } from "@/lib/divisions";
import { divisionsActiveOnDate } from "@/lib/group-rules";
import {
  computeDailyLeaderboard,
} from "@/lib/period-leaderboard";
import { loadScoringDataset } from "@/lib/scoring-dataset";

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

  const db = getDb();
  const rows = await db
    .select({
      id: starDayCertificate.id,
      activityDate: starDayCertificate.activityDate,
      userId: starDayCertificate.userId,
      recipientName: starDayCertificate.recipientName,
      division: starDayCertificate.division,
      steps: starDayCertificate.steps,
      imageUrl: starDayCertificate.imageUrl,
    })
    .from(starDayCertificate)
    .where(inArray(starDayCertificate.activityDate, dates));

  for (const row of rows) {
    const list = map.get(row.activityDate) ?? [];
    list.push({
      id: row.id,
      userId: row.userId,
      recipientName: row.recipientName,
      division: parseDivision(row.division),
      steps: row.steps,
      imageUrl: row.imageUrl,
    });
    map.set(row.activityDate, list);
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
  const runs = await db
    .select({
      activityDate: starDayCertificateRun.activityDate,
      generatedAt: starDayCertificateRun.generatedAt,
      generatedByName: users.name,
    })
    .from(starDayCertificateRun)
    .leftJoin(users, eq(starDayCertificateRun.generatedBy, users.id))
    .orderBy(desc(starDayCertificateRun.generatedAt));

  const map = new Map<
    string,
    {
      generatedAt: string;
      generatedByName: string | null;
    }
  >();

  for (const run of runs) {
    if (!dates.includes(run.activityDate) || map.has(run.activityDate)) {
      continue;
    }
    map.set(run.activityDate, {
      generatedAt: run.generatedAt.toISOString(),
      generatedByName: run.generatedByName,
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

async function removeExistingCertificatesForDate(date: string) {
  const db = getDb();
  const existing = await db
    .select({ imageUrl: starDayCertificate.imageUrl })
    .from(starDayCertificate)
    .where(eq(starDayCertificate.activityDate, date));

  await Promise.all(existing.map((row) => deleteBlobUrl(row.imageUrl)));

  await db
    .delete(starDayCertificateRun)
    .where(eq(starDayCertificateRun.activityDate, date));
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

  const db = getDb();
  const [existingRun] = await db
    .select({ id: starDayCertificateRun.id })
    .from(starDayCertificateRun)
    .where(eq(starDayCertificateRun.activityDate, input.date))
    .limit(1);

  if (existingRun) {
    await removeExistingCertificatesForDate(input.date);
  }

  const [run] = await db
    .insert(starDayCertificateRun)
    .values({
      activityDate: input.date,
      generatedBy: input.adminUserId,
    })
    .returning({
      id: starDayCertificateRun.id,
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
    const blob = await uploadBlob(pathname, png, "image/png");

    const [record] = await db
      .insert(starDayCertificate)
      .values({
        runId: run.id,
        activityDate: input.date,
        userId: winner.userId,
        division: winner.division,
        recipientName: winner.name,
        steps: winner.steps,
        imageUrl: blob.url,
      })
      .returning({
        id: starDayCertificate.id,
        userId: starDayCertificate.userId,
        recipientName: starDayCertificate.recipientName,
        division: starDayCertificate.division,
        steps: starDayCertificate.steps,
        imageUrl: starDayCertificate.imageUrl,
      });

    if (!record) {
      throw new ActivityError("Could not save certificate.", 500);
    }

    certificates.push({
      id: record.id,
      userId: record.userId,
      recipientName: record.recipientName,
      division: parseDivision(record.division),
      steps: record.steps,
      imageUrl: record.imageUrl,
    });
  }

  certificates.sort((a, b) => a.recipientName.localeCompare(b.recipientName));

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
