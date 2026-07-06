import Link from "next/link";

import { AchievementBadgeGrid } from "@/components/badges/achievement-badge-grid";
import { ParticipantAvatar } from "@/components/app/participant-avatar";
import { DivisionBadge, DivisionRankLabel } from "@/components/app/division-badge";
import { achievementsToDisplay } from "@/lib/achievement-display";
import type { ParticipantBadgesPageData } from "@/lib/participant-badges-service";

type ParticipantBadgesViewProps = {
  data: ParticipantBadgesPageData;
  currentUserId: string;
  backHref?: string;
  backLabel?: string;
};

export function ParticipantBadgesView({
  data,
  currentUserId,
  backHref = "/leaderboard",
  backLabel = "Back to board",
}: ParticipantBadgesViewProps) {
  const { user, standing, participantCountInDivision, achievements, badgeEarnedCount, badgeTotalCount } = data;
  const isCurrentUser = user.id === currentUserId;
  const achievementDisplays = achievementsToDisplay(achievements);

  return (
    <div className="space-y-6">
      <header className="rounded-3xl bg-gradient-to-br from-brand to-brand-dark p-6 text-white shadow-sm">
        <Link
          className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/25"
          href={backHref}
        >
          {backLabel}
        </Link>

        <div className="mt-5 flex items-start gap-4">
          <ParticipantAvatar
            name={user.name}
            profileImageUrl={user.profileImageUrl}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">
                {user.name}
                {isCurrentUser ? (
                  <span className="ml-2 text-base font-medium text-white/85">
                    (You)
                  </span>
                ) : null}
              </h1>
              <DivisionBadge division={user.division} />
            </div>
            {standing ? (
              <>
                <p className="mt-2 text-sm text-white/85">
                  {standing.total} total points · {standing.totalSteps.toLocaleString("en-IN")}{" "}
                  steps
                </p>
                <DivisionRankLabel
                  className="mt-1 text-sm text-white/80"
                  division={standing.division}
                  participantCount={participantCountInDivision}
                  rank={standing.rank}
                />
              </>
            ) : (
              <p className="mt-2 text-sm text-white/85">No scored activity yet.</p>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 text-center text-sm">
          <BadgeStat label="Earned" value={badgeEarnedCount} />
          <BadgeStat label="Series" value={badgeTotalCount} />
          <BadgeStat
            label="In progress"
            value={achievements.filter((entry) => entry.earnedTierIndex === null).length}
          />
        </div>
      </header>

      <AchievementBadgeGrid
        achievements={achievementDisplays}
        emptyMessage="No badges yet."
        title="Earned badges"
      />
    </div>
  );
}

function BadgeStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/10 px-3 py-2">
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-white/75">{label}</p>
    </div>
  );
}
