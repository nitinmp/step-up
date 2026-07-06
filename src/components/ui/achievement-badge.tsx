"use client";

import { cn } from "@/lib/cn";
import type { BadgeAchievementDisplay } from "@/lib/participant-badge-display";

type AchievementBadgeProps = {
  achievement: BadgeAchievementDisplay;
  badgeSize?: "sm" | "default" | "lg";
  className?: string;
  onAchievementClick?: (achievement: BadgeAchievementDisplay) => void;
};

const badgeSizeMap = {
  sm: "h-12 w-12 text-xl",
  default: "h-16 w-16 text-2xl",
  lg: "h-20 w-20 text-3xl",
} as const;

export function AchievementBadge({
  achievement,
  badgeSize = "default",
  className,
  onAchievementClick,
}: AchievementBadgeProps) {
  const isUnlocked = achievement.achievedAt !== null;
  const statusLabel = isUnlocked ? "Earned" : "Locked";

  const accentClass =
    achievement.accent === "gold"
      ? isUnlocked
        ? "bg-gradient-to-br from-amber-100 to-amber-200 text-amber-950 ring-amber-300/60"
        : "bg-amber-50 text-amber-900/40 ring-amber-200/40"
      : achievement.accent === "brand"
        ? isUnlocked
          ? "bg-gradient-to-br from-brand/15 to-brand/25 text-brand ring-brand/20"
          : "bg-brand/5 text-brand/30 ring-brand/10"
        : "bg-black/[0.04] text-muted ring-black/5";

  return (
    <div
      aria-label={`${achievement.name} - ${statusLabel}`}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-2xl border border-black/5 bg-surface p-4 text-center shadow-sm",
        !isUnlocked && "opacity-55",
        onAchievementClick && "cursor-pointer transition hover:border-brand/20 hover:shadow-md",
        className,
      )}
      onClick={() => onAchievementClick?.(achievement)}
      onKeyDown={
        onAchievementClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onAchievementClick(achievement);
              }
            }
          : undefined
      }
      role={onAchievementClick ? "button" : "listitem"}
      tabIndex={onAchievementClick ? 0 : undefined}
    >
      <div
        className={cn(
          "relative flex items-center justify-center rounded-full ring-2",
          badgeSizeMap[badgeSize],
          accentClass,
          !isUnlocked && "grayscale",
        )}
      >
        <span aria-hidden="true">{achievement.emoji}</span>
        {isUnlocked ? (
          <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white ring-2 ring-surface">
            ✓
          </span>
        ) : null}
      </div>

      <div className="min-w-0 space-y-1">
        <p
          className={cn(
            "text-sm font-bold leading-tight text-foreground",
            !isUnlocked && "text-muted",
          )}
        >
          {achievement.name}
        </p>
        <p className="text-xs text-muted">{achievement.subtitle}</p>
        {achievement.detail ? (
          <p className="text-[11px] leading-snug text-muted">{achievement.detail}</p>
        ) : null}
        {!isUnlocked && typeof achievement.progress === "number" ? (
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]">
            <div
              className="h-full rounded-full bg-brand/50"
              style={{ width: `${achievement.progress}%` }}
            />
          </div>
        ) : null}
        {isUnlocked && typeof achievement.points === "number" ? (
          <p className="text-xs font-semibold tabular-nums text-brand">
            +{achievement.points} pts
          </p>
        ) : null}
      </div>
    </div>
  );
}
