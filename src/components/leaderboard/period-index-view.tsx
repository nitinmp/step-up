import Link from "next/link";

import { formatDisplayDate } from "@/lib/dates";
import type { ChallengeDayInput } from "@/lib/standings";
import type { ChallengeWeekSummary } from "@/lib/period-leaderboard";
import { formatWeekTitle } from "@/components/leaderboard/period-leaderboard-view";

type PeriodIndexViewProps = {
  title: string;
  subtitle: string;
  emptyMessage: string;
  backHref: string;
  items: Array<
    | {
        kind: "day";
        day: ChallengeDayInput;
        href: string;
      }
    | {
        kind: "week";
        week: ChallengeWeekSummary;
        href: string;
      }
  >;
};

export function PeriodIndexView({
  title,
  subtitle,
  emptyMessage,
  backHref,
  items,
}: PeriodIndexViewProps) {
  return (
    <div className="space-y-6">
      <header className="rounded-3xl bg-gradient-to-br from-brand to-brand-dark p-6 text-white shadow-sm">
        <p className="text-sm uppercase tracking-[0.2em] text-white/80">Leaderboard</p>
        <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-white/85">{subtitle}</p>
        <Link
          className="mt-4 inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/25"
          href={backHref}
        >
          Back to board
        </Link>
      </header>

      {items.length === 0 ? (
        <section className="rounded-3xl border border-black/5 bg-surface p-8 text-center">
          <p className="text-muted">{emptyMessage}</p>
        </section>
      ) : (
        <section className="grid gap-3 sm:grid-cols-2">
          {items.map((item) =>
            item.kind === "day" ? (
              <Link
                className="rounded-3xl border border-black/5 bg-surface p-5 transition hover:border-brand/20 hover:bg-brand/5"
                href={item.href}
                key={item.day.date}
              >
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-brand">
                  Day board
                </p>
                <p className="mt-2 text-xl font-semibold text-foreground">
                  {formatDisplayDate(item.day.date)}
                </p>
                <p className="mt-1 text-sm text-muted">
                  Week {item.day.weekNo} · Target {item.day.targetSteps.toLocaleString("en-IN")} steps
                </p>
              </Link>
            ) : (
              <Link
                className="rounded-3xl border border-black/5 bg-surface p-5 transition hover:border-brand/20 hover:bg-brand/5"
                href={item.href}
                key={item.week.weekNo}
              >
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-brand">
                  Week board
                </p>
                <p className="mt-2 text-xl font-semibold text-foreground">
                  {formatWeekTitle(
                    item.week.weekNo,
                    item.week.startDate,
                    item.week.endDate,
                  )}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {item.week.dates.length} challenge days
                </p>
              </Link>
            ),
          )}
        </section>
      )}
    </div>
  );
}
