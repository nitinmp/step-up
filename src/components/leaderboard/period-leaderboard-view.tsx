import Link from "next/link";

import { ParticipantAvatar } from "@/components/app/participant-avatar";
import type { PeriodLeaderboardEntry } from "@/lib/period-leaderboard";
import { formatDisplayDate } from "@/lib/dates";
import { cn } from "@/lib/cn";

type PeriodLeaderboardViewProps = {
  title: string;
  subtitle: string;
  entries: PeriodLeaderboardEntry[];
  currentUserId: string;
  metricLabel?: string;
  showBasePoints?: boolean;
  periodEnded?: boolean;
  starPeriod?: "day" | "week";
  starBonusPoints?: number;
  backHref?: string;
  backLabel?: string;
  archiveHref?: string;
  archiveLabel?: string;
  embedded?: boolean;
};

export function getStarWinners(
  entries: PeriodLeaderboardEntry[],
): PeriodLeaderboardEntry[] {
  return entries.filter((row) => row.isStarWinner);
}

export function StarWinnerBanner({
  title,
  subtitle,
  winners,
  bonusPoints,
  currentUserId,
  detailHref,
  detailLabel,
  className,
}: {
  title: string;
  subtitle?: string;
  winners: PeriodLeaderboardEntry[];
  bonusPoints: number;
  currentUserId: string;
  detailHref?: string;
  detailLabel?: string;
  className?: string;
}) {
  if (winners.length === 0) {
    return null;
  }

  return (
    <section
      className={cn(
        "rounded-3xl border border-amber-300/40 bg-gradient-to-br from-amber-50 to-amber-100/70 p-5 shadow-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-amber-900/70">
            {title}
          </p>
          {subtitle ? (
            <p className="mt-1 text-sm text-amber-950/80">{subtitle}</p>
          ) : null}
        </div>
        {detailHref ? (
          <Link
            className="inline-flex shrink-0 rounded-full bg-amber-900/10 px-4 py-2 text-sm font-medium text-amber-950 transition hover:bg-amber-900/15"
            href={detailHref}
          >
            {detailLabel ?? "View board"}
          </Link>
        ) : null}
      </div>

      <ul className="mt-4 space-y-3">
        {winners.map((winner) => {
          const isCurrentUser = winner.userId === currentUserId;

          return (
            <li
              className="flex items-center gap-3 rounded-2xl bg-white/70 px-4 py-3"
              key={winner.userId}
            >
              <ParticipantAvatar
                name={winner.name}
                profileImageUrl={winner.profileImageUrl}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">
                  {winner.name}
                  {isCurrentUser ? (
                    <span className="ml-2 text-sm font-semibold text-brand">You</span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  {winner.steps.toLocaleString("en-IN")} steps
                  {winners.length > 1 ? " · tied for top" : ""}
                </p>
              </div>
              <p className="text-right text-sm font-semibold text-amber-900">
                +{bonusPoints} pts
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function PeriodLeaderboardView({
  title,
  subtitle,
  entries,
  currentUserId,
  metricLabel = "steps",
  showBasePoints = false,
  periodEnded = false,
  starPeriod,
  starBonusPoints = 0,
  backHref,
  backLabel = "Back to board",
  archiveHref,
  archiveLabel,
  embedded = false,
}: PeriodLeaderboardViewProps) {
  const hasScores = entries.some((row) => row.steps > 0);
  const topThree = entries.filter((row) => row.rank <= 3 && row.steps > 0);
  const starWinners = periodEnded ? getStarWinners(entries) : [];
  const starTitle =
    starPeriod === "week"
      ? "Star of the Week"
      : starPeriod === "day"
        ? "Star of the Day"
        : "Star winner";

  return (
    <div className="space-y-6">
      {!embedded ? (
        <header className="rounded-3xl bg-gradient-to-br from-brand to-brand-dark p-6 text-white shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-white/80">Leaderboard</p>
          <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
          <p className="mt-2 text-sm text-white/85">{subtitle}</p>
          {!periodEnded ? (
            <p className="mt-2 text-sm text-white/75">
              Live board — bonuses finalize after this period ends.
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {backHref ? (
              <Link
                className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/25"
                href={backHref}
              >
                {backLabel}
              </Link>
            ) : null}
            {archiveHref ? (
              <Link
                className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/25"
                href={archiveHref}
              >
                {archiveLabel}
              </Link>
            ) : null}
          </div>
        </header>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">{subtitle}</p>
            {!periodEnded ? (
              <p className="mt-1 text-sm text-muted">
                Live board — bonuses finalize after this period ends.
              </p>
            ) : null}
          </div>
          {archiveHref ? (
            <Link
              className="inline-flex shrink-0 rounded-full border border-black/10 bg-surface px-4 py-2 text-sm font-medium text-brand transition hover:border-brand/20 hover:bg-brand/5"
              href={archiveHref}
            >
              {archiveLabel}
            </Link>
          ) : null}
        </div>
      )}

      {starWinners.length > 0 && starBonusPoints > 0 ? (
        <StarWinnerBanner
          bonusPoints={starBonusPoints}
          currentUserId={currentUserId}
          subtitle={subtitle}
          title={starTitle}
          winners={starWinners}
        />
      ) : periodEnded && hasScores && starWinners.length === 0 ? (
        <section className="rounded-3xl border border-black/5 bg-surface px-4 py-3 text-sm text-muted">
          No {starTitle.toLowerCase()} this period — no steps were logged.
        </section>
      ) : null}

      {!hasScores ? (
        <section className="rounded-3xl border border-black/5 bg-surface p-8 text-center">
          <p className="text-lg font-medium text-foreground">No steps logged yet</p>
          <p className="mt-2 text-muted">Rankings will appear once activities are approved.</p>
        </section>
      ) : (
        <>
          {topThree.length > 0 ? (
            <section className="grid gap-3 sm:grid-cols-3">
              {topThree.map((row) => (
                <PeriodPodiumCard
                  currentUserId={currentUserId}
                  key={row.userId}
                  metricLabel={metricLabel}
                  row={row}
                  showBasePoints={showBasePoints}
                />
              ))}
            </section>
          ) : null}

          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-muted">
              Full rankings
            </h2>
            {entries.map((row) => (
              <PeriodLeaderboardRow
                currentUserId={currentUserId}
                key={row.userId}
                metricLabel={metricLabel}
                row={row}
                showBasePoints={showBasePoints}
              />
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function PeriodPodiumCard({
  row,
  currentUserId,
  metricLabel,
  showBasePoints,
}: {
  row: PeriodLeaderboardEntry;
  currentUserId: string;
  metricLabel: string;
  showBasePoints: boolean;
}) {
  const isCurrentUser = row.userId === currentUserId;
  const medalClass =
    row.rank === 1
      ? "bg-medal-gold"
      : row.rank === 2
        ? "bg-medal-silver"
        : "bg-medal-bronze";

  return (
    <article
      className={`rounded-3xl border border-black/5 p-4 ${medalClass} ${isCurrentUser ? "ring-2 ring-brand ring-offset-2 ring-offset-background" : ""}`}
    >
      <p className="text-sm font-semibold uppercase tracking-wide text-foreground/70">
        #{row.rank} {row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : "🥉"}
      </p>
      <div className="mt-3 flex justify-center">
        <ParticipantAvatar
          name={row.name}
          profileImageUrl={row.profileImageUrl}
          size="lg"
        />
      </div>
      <p className="mt-3 truncate text-lg font-semibold text-foreground">
        {row.name}
        {isCurrentUser ? " (You)" : ""}
      </p>
      <p className="mt-3 text-3xl font-semibold tabular-nums text-foreground">
        {row.steps.toLocaleString("en-IN")}
      </p>
      <p className="text-sm text-foreground/70">{metricLabel}</p>
      {showBasePoints ? (
        <p className="mt-1 text-sm text-foreground/70">+{row.basePoints} pts</p>
      ) : null}
      <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs text-foreground/80">
        {row.isStarWinner ? (
          <span className="rounded-full bg-amber-400/30 px-2 py-0.5 font-semibold text-amber-950">
            ⭐ Star winner
          </span>
        ) : null}
        {row.isBeast ? <span>🔥 Beast</span> : null}
        {row.targetMet ? <span>Target met</span> : null}
      </div>
    </article>
  );
}

function PeriodLeaderboardRow({
  row,
  currentUserId,
  metricLabel,
  showBasePoints,
}: {
  row: PeriodLeaderboardEntry;
  currentUserId: string;
  metricLabel: string;
  showBasePoints: boolean;
}) {
  const isCurrentUser = row.userId === currentUserId;
  const medalAccent =
    row.rank === 1
      ? "border-l-4 border-l-medal-gold"
      : row.rank === 2
        ? "border-l-4 border-l-medal-silver"
        : row.rank === 3
          ? "border-l-4 border-l-medal-bronze"
          : "border-l-4 border-l-transparent";

  return (
    <article
      className={`flex items-center gap-3 rounded-2xl border border-black/5 bg-surface px-4 py-3 ${medalAccent} ${isCurrentUser ? "bg-brand/5 ring-1 ring-brand/20" : ""}`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background text-sm font-bold text-foreground">
        {row.rank}
      </div>

      <ParticipantAvatar
        name={row.name}
        profileImageUrl={row.profileImageUrl}
        size="md"
      />

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">
          {row.name}
          {isCurrentUser ? (
            <span className="ml-2 text-sm font-semibold text-brand">You</span>
          ) : null}
        </p>
        <p className="mt-0.5 text-xs text-muted">
          {row.isStarWinner ? (
            <span className="font-semibold text-amber-800">⭐ Star winner · </span>
          ) : null}
          {row.isBeast ? "🔥 Beast · " : ""}
          {row.targetMet ? "Target met" : "Below target"}
          {showBasePoints ? ` · +${row.basePoints} pts` : ""}
        </p>
      </div>

      <div className="text-right">
        <p className="text-xl font-semibold tabular-nums text-foreground">
          {row.steps.toLocaleString("en-IN")}
        </p>
        <p className="text-xs text-muted">{metricLabel}</p>
      </div>
    </article>
  );
}

export function formatDayTitle(date: string): string {
  return formatDisplayDate(date);
}

export function formatWeekTitle(weekNo: number, startDate: string, endDate: string): string {
  return `Week ${weekNo} · ${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}`;
}
