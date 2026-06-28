import Link from "next/link";

import { ParticipantAvatar } from "@/components/app/participant-avatar";
import type { PeriodLeaderboardEntry } from "@/lib/period-leaderboard";
import { formatDisplayDate } from "@/lib/dates";

type PeriodLeaderboardViewProps = {
  title: string;
  subtitle: string;
  entries: PeriodLeaderboardEntry[];
  currentUserId: string;
  metricLabel?: string;
  showBasePoints?: boolean;
  periodEnded?: boolean;
  backHref?: string;
  backLabel?: string;
  archiveHref?: string;
  archiveLabel?: string;
  embedded?: boolean;
};

export function PeriodLeaderboardView({
  title,
  subtitle,
  entries,
  currentUserId,
  metricLabel = "steps",
  showBasePoints = false,
  periodEnded = false,
  backHref,
  backLabel = "Back to board",
  archiveHref,
  archiveLabel,
  embedded = false,
}: PeriodLeaderboardViewProps) {
  const hasScores = entries.some((row) => row.steps > 0);
  const topThree = entries.filter((row) => row.rank <= 3 && row.steps > 0);

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
        {row.isStarWinner ? <span>⭐ Star winner</span> : null}
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
          {row.isStarWinner ? "⭐ Star winner · " : ""}
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
