"use client";

import Link from "next/link";

import type { DashboardDay } from "@/lib/activities-service";
import type { UserStanding } from "@/lib/standings";
import { formatDisplayDate } from "@/lib/dates";

type ActivitiesSummaryProps = {
  standing?: UserStanding;
  participantCount: number;
};

export function ActivitiesSummary({
  standing,
  participantCount,
}: ActivitiesSummaryProps) {
  const breakdown = standing?.breakdown;

  return (
    <section className="rounded-3xl bg-gradient-to-br from-brand to-brand-dark p-6 text-white shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-white/80">
            Your score
          </p>
          <p className="mt-2 text-5xl font-semibold tabular-nums">
            {standing?.total ?? 0}
          </p>
          <p className="mt-2 text-sm text-white/85">
            Rank #{standing?.rank ?? "–"} of {participantCount || "–"}
          </p>
        </div>
        <div className="rounded-2xl bg-white/10 px-3 py-2 text-right text-sm">
          <p>⭐ {standing?.starDayCount ?? 0}</p>
          <p className="mt-1">🔥 {standing?.beastCount ?? 0}</p>
        </div>
      </div>

      {breakdown ? (
        <div className="mt-5 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <BreakdownPill label="Base" value={breakdown.base} />
          <BreakdownPill label="Stars" value={breakdown.starDay} />
          <BreakdownPill label="Week" value={breakdown.weekStar} />
          <BreakdownPill label="Streak" value={breakdown.consistency} />
        </div>
      ) : null}
    </section>
  );
}

function BreakdownPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/10 px-3 py-2">
      <p className="text-white/70">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  );
}

type ActivityDayListProps = {
  days: DashboardDay[];
};

export function ActivityDayList({ days }: ActivityDayListProps) {
  if (days.length === 0) {
    return (
      <section className="rounded-3xl border border-black/5 bg-surface p-6 text-muted">
        Challenge days are not loaded yet.
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Target vs achievement</h2>
      {days.map((day) => (
        <ActivityDayRow day={day} key={day.date} />
      ))}
    </section>
  );
}

function ActivityDayRow({ day }: { day: DashboardDay }) {
  const activity = day.activity;
  const progress = activity
    ? Math.min(100, Math.round((activity.steps / day.targetSteps) * 100))
    : 0;
  const metTarget = !!activity && activity.steps >= day.targetSteps;

  return (
    <article className="rounded-3xl border border-black/5 bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground">
              {formatDisplayDate(day.date)}
            </p>
            <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
              W{day.weekNo}
            </span>
            {activity?.isStarOfDay ? (
              <span className="rounded-full bg-gold/20 px-2 py-0.5 text-xs font-semibold text-foreground">
                ⭐ Star
              </span>
            ) : null}
            {activity?.isBeast ? (
              <span className="text-xs font-semibold">🔥</span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted">
            Target {day.targetSteps.toLocaleString("en-IN")} steps
          </p>
        </div>

        {activity ? (
          <div className="text-right">
            <p className="text-2xl font-semibold tabular-nums text-foreground">
              {activity.steps.toLocaleString("en-IN")}
            </p>
            <p className="text-sm text-muted">+{activity.basePoints} pts</p>
          </div>
        ) : day.state === "future" ? (
          <p className="text-sm text-muted">Upcoming</p>
        ) : day.canLog ? (
          <Link
            className="rounded-full bg-brand px-3 py-1.5 text-sm font-medium text-white"
            href="/log"
          >
            Log steps
          </Link>
        ) : (
          <p className="text-sm text-muted">Not logged</p>
        )}
      </div>

      {activity ? (
        <>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-background">
            <div
              className={`h-full rounded-full ${metTarget ? "bg-success" : "bg-warning"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          {day.state === "disapproved" ? (
            <p className="mt-3 rounded-2xl bg-danger/10 px-3 py-2 text-sm text-danger">
              Disapproved{activity.adminNote ? `: ${activity.adminNote}` : ""}
            </p>
          ) : null}
        </>
      ) : day.canLog ? (
        <p className="mt-3 text-sm text-muted">Not logged yet.</p>
      ) : null}
    </article>
  );
}
