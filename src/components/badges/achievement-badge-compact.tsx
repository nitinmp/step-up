"use client";

import type { BadgeAchievementDisplay } from "@/lib/participant-badge-display";
import { cn } from "@/lib/cn";

type AchievementBadgeCompactProps = {
  achievement: BadgeAchievementDisplay;
  className?: string;
};

export function AchievementBadgeCompact({
  achievement,
  className,
}: AchievementBadgeCompactProps) {
  const isUnlocked = achievement.achievedAt !== null;

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-2xl border border-black/5 bg-surface p-2 text-center",
        !isUnlocked && "opacity-60",
        className,
      )}
    >
      <div
        className={cn(
          "flex size-12 items-center justify-center rounded-xl text-xl",
          isUnlocked
            ? achievement.isRare
              ? "bg-gold/20"
              : "bg-brand/10"
            : "bg-black/[0.04]",
          !isUnlocked && "grayscale",
        )}
      >
        <span aria-hidden="true">{achievement.emoji}</span>
      </div>
      <p className="line-clamp-2 text-[10px] font-semibold leading-tight text-foreground">
        {achievement.name}
      </p>
      <p className="line-clamp-2 text-[9px] leading-tight text-muted">
        {achievement.subtitle}
      </p>
      {!isUnlocked && typeof achievement.progress === "number" ? (
        <div className="h-1 w-full overflow-hidden rounded-full bg-black/[0.06]">
          <div
            className="h-full rounded-full bg-brand/50"
            style={{ width: `${achievement.progress}%` }}
          />
        </div>
      ) : null}
      {achievement.detail === "RARE" ? (
        <span className="rounded-full bg-gold/20 px-1.5 py-0.5 text-[8px] font-bold uppercase text-foreground">
          Rare
        </span>
      ) : null}
    </div>
  );
}
