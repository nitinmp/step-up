import { AchievementBadge } from "@/components/ui/achievement-badge";
import type { BadgeAchievementDisplay } from "@/lib/participant-badge-display";
import { cn } from "@/lib/cn";

type AchievementBadgeGridProps = {
  achievements: BadgeAchievementDisplay[];
  emptyMessage?: string;
  showLockedCatalogWhenEmpty?: boolean;
  lockedCatalog?: BadgeAchievementDisplay[];
  title?: string;
  hideHeader?: boolean;
  className?: string;
};

export function AchievementBadgeGrid({
  achievements,
  emptyMessage = "No badges earned yet.",
  showLockedCatalogWhenEmpty = false,
  lockedCatalog = [],
  title = "Your badges",
  hideHeader = false,
  className,
}: AchievementBadgeGridProps) {
  const showCatalog = showLockedCatalogWhenEmpty && achievements.length === 0;

  return (
    <section className={cn("space-y-3", className)}>
      {!hideHeader ? (
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-muted">
            {title}
          </h2>
          {achievements.length > 0 ? (
            <p className="text-xs text-muted">{achievements.length} earned</p>
          ) : null}
        </div>
      ) : null}

      {achievements.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {achievements.map((achievement) => (
            <li key={achievement.id}>
              <AchievementBadge achievement={achievement} />
            </li>
          ))}
        </ul>
      ) : showCatalog && lockedCatalog.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted">{emptyMessage}</p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {lockedCatalog.map((achievement) => (
              <li key={achievement.id}>
                <AchievementBadge achievement={achievement} />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-3xl border border-black/5 bg-surface p-6 text-center">
          <p className="text-sm text-muted">{emptyMessage}</p>
        </div>
      )}
    </section>
  );
}
