import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import { parseDivision } from "@/lib/divisions";
import {
  computeParticipantBadges,
  countBadgesByKind,
  type ParticipantBadge,
} from "@/lib/participant-badges";
import { loadScoringDataset } from "@/lib/scoring-dataset";
import {
  computeStandingsFromData,
  filterStandingsByDivision,
  getStandingForUser,
  type UserStanding,
} from "@/lib/standings";

export type ParticipantBadgesPageData = {
  user: {
    id: string;
    name: string;
    profileImageUrl: string | null;
    division: ReturnType<typeof parseDivision>;
  };
  standing: UserStanding | null;
  participantCountInDivision: number;
  badges: ParticipantBadge[];
  badgeCounts: ReturnType<typeof countBadgesByKind>;
};

export async function getParticipantBadgesPage(
  userId: string,
): Promise<ParticipantBadgesPageData | null> {
  const db = getDb();
  const [userRow] = await db
    .select({
      id: users.id,
      name: users.name,
      profileImageUrl: users.profileImageUrl,
      division: users.division,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!userRow) {
    return null;
  }

  const dataset = await loadScoringDataset();
  const standings = computeStandingsFromData(dataset);
  const standing = getStandingForUser(standings, userId) ?? null;
  const division = parseDivision(userRow.division);
  const participantCountInDivision = standing
    ? filterStandingsByDivision(standings, standing.division).length
    : filterStandingsByDivision(standings, division).length;
  const badges = computeParticipantBadges(userId, {
    users: dataset.users,
    activities: dataset.activities,
    challengeDays: dataset.challengeDays,
    config: dataset.config,
    today: dataset.calendarToday,
  });

  return {
    user: {
      id: userRow.id,
      name: userRow.name,
      profileImageUrl: userRow.profileImageUrl,
      division: parseDivision(userRow.division),
    },
    standing,
    participantCountInDivision,
    badges,
    badgeCounts: countBadgesByKind(badges),
  };
}
