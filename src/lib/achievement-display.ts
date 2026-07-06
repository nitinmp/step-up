import type { UserAchievementState } from "@/lib/achievement-badges";
import type { BadgeAchievementDisplay } from "@/lib/participant-badge-display";

export function achievementToDisplay(
  achievement: UserAchievementState,
): BadgeAchievementDisplay {
  const isUnlocked = achievement.earnedTierIndex !== null;
  const displayName =
    isUnlocked && achievement.earnedTierName
      ? achievement.earnedTierName
      : achievement.nextTierName ?? achievement.seriesName;

  let subtitle = isUnlocked ? "Earned" : "Locked";
  if (!isUnlocked && achievement.progressLabel) {
    subtitle = achievement.progressLabel;
  } else if (isUnlocked && achievement.seriesId === "beast_mode") {
    subtitle = `Earned ×${achievement.currentValue}`;
  } else if (isUnlocked && achievement.seriesId === "perfect_week") {
    subtitle = `×${achievement.currentValue} done`;
  } else if (isUnlocked && achievement.seriesId === "personal_best") {
    subtitle = achievement.progressLabel ?? "New record";
  } else if (
    isUnlocked &&
    (achievement.seriesId === "star_day" || achievement.seriesId === "star_week")
  ) {
    subtitle = `×${achievement.currentValue}`;
  }

  let detail: string | undefined;
  if (!isUnlocked && achievement.progress > 0) {
    detail = `${achievement.progress}% to next`;
  }
  if (achievement.isRare && !isUnlocked) {
    detail = "RARE";
  }
  if (achievement.rarityPercent !== null && isUnlocked) {
    detail = `${achievement.rarityPercent}% of users`;
  }

  const accent = achievement.isRare
    ? "gold"
    : isUnlocked
      ? "brand"
      : "muted";

  return {
    id: achievement.seriesId,
    name: displayName,
    subtitle,
    detail,
    emoji: achievement.emoji,
    achievedAt: isUnlocked ? achievement.earnedAt : null,
    accent,
    progress: isUnlocked ? undefined : achievement.progress,
    isRare: achievement.isRare,
  };
}

export function achievementsToDisplay(
  achievements: UserAchievementState[],
): BadgeAchievementDisplay[] {
  return achievements.map(achievementToDisplay);
}
