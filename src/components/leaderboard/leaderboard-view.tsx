import type { UserStanding } from "@/lib/standings";
import { ParticipantAvatar } from "@/components/app/participant-avatar";
import { ParticipantProfileLink } from "@/components/app/participant-profile-link";

type LeaderboardViewProps = {
  standings: UserStanding[];
  currentUserId: string;
  embedded?: boolean;
};

export function LeaderboardView({
  standings,
  currentUserId,
  embedded = false,
}: LeaderboardViewProps) {
  const hasScores = standings.some((row) => row.total > 0 || row.totalSteps > 0);
  const topThree = standings.filter((row) => row.rank <= 3);

  return (
    <div className="space-y-6">
      {!embedded ? (
        <header className="rounded-3xl bg-gradient-to-br from-brand to-brand-dark p-6 text-white shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-white/80">
            Overall standings
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Leaderboard</h1>
          <p className="mt-2 text-sm text-white/85">
            {standings.length} participants · ranked by total points
          </p>
        </header>
      ) : null}

      {standings.length === 0 ? (
        <section className="rounded-3xl border border-black/5 bg-surface p-8 text-center">
          <p className="text-lg font-medium text-foreground">No participants yet</p>
          <p className="mt-2 text-muted">
            Once people join the challenge, they will appear here.
          </p>
        </section>
      ) : (
        <>
          {hasScores && topThree.length > 0 ? (
            <section className="grid gap-3 sm:grid-cols-3">
              {topThree.map((row) => (
                <PodiumCard
                  currentUserId={currentUserId}
                  key={row.userId}
                  row={row}
                />
              ))}
            </section>
          ) : null}

          <section className="space-y-2">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-muted">
                {hasScores ? "Full rankings" : "Participants"}
              </h2>
              {!hasScores ? (
                <p className="mt-1 text-sm text-muted">
                  Everyone in the challenge · scores update as people log activity
                </p>
              ) : null}
            </div>
            {standings.map((row) => (
              <LeaderboardRow
                currentUserId={currentUserId}
                key={row.userId}
                row={row}
              />
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function PodiumCard({
  row,
  currentUserId,
}: {
  row: UserStanding;
  currentUserId: string;
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
      className={`rounded-3xl border border-black/5 p-4 ${medalClass} ${isCurrentUser ? "ring-2 ring-brand ring-offset-2 ring-offset-background" : ""} ${row.rank === 1 ? "sm:-translate-y-1 sm:shadow-md" : ""}`}
    >
      <p className="text-sm font-semibold uppercase tracking-wide text-foreground/70">
        #{row.rank} {row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : "🥉"}
      </p>
      <div className="mt-3 flex justify-center">
        <ParticipantProfileLink userId={row.userId}>
          <ParticipantAvatar
            name={row.name}
            profileImageUrl={row.profileImageUrl}
            size="lg"
          />
        </ParticipantProfileLink>
      </div>
      <ParticipantProfileLink className="block" userId={row.userId}>
        <p className="mt-3 truncate text-lg font-semibold text-foreground">
          {row.name}
          {isCurrentUser ? " (You)" : ""}
        </p>
      </ParticipantProfileLink>
      <p className="mt-3 text-3xl font-semibold tabular-nums text-foreground">
        {row.total}
      </p>
      <p className="text-sm text-foreground/70">points</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-foreground/80">
        <span>{row.daysMet} days met</span>
        <span>⭐ {row.starDayCount}</span>
        <span>🔥 {row.beastCount}</span>
      </div>
    </article>
  );
}

function LeaderboardRow({
  row,
  currentUserId,
}: {
  row: UserStanding;
  currentUserId: string;
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

      <ParticipantProfileLink userId={row.userId}>
        <ParticipantAvatar
          name={row.name}
          profileImageUrl={row.profileImageUrl}
          size="md"
        />
      </ParticipantProfileLink>

      <div className="min-w-0 flex-1">
        <ParticipantProfileLink className="block" userId={row.userId}>
          <p className="truncate font-medium text-foreground">
            {row.name}
            {isCurrentUser ? (
              <span className="ml-2 text-sm font-semibold text-brand">You</span>
            ) : null}
          </p>
        </ParticipantProfileLink>
        <p className="mt-0.5 text-xs text-muted">
          {row.daysMet} days met · ⭐ {row.starDayCount} · 🔥 {row.beastCount}
        </p>
      </div>

      <div className="text-right">
        <p className="text-xl font-semibold tabular-nums text-foreground">
          {row.total}
        </p>
        <p className="text-xs text-muted">pts</p>
      </div>
    </article>
  );
}
