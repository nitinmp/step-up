"use client";

import { useEffect } from "react";

import type { UserAchievementState } from "@/lib/achievement-badges";
import { fireActivityLogConfetti } from "@/lib/confetti";

type AchievementUnlockedModalProps = {
  achievement: UserAchievementState;
  onClose: () => void;
};

export function AchievementUnlockedModal({
  achievement,
  onClose,
}: AchievementUnlockedModalProps) {
  useEffect(() => {
    fireActivityLogConfetti();
  }, []);

  const title =
    achievement.earnedTierName ?? achievement.seriesName ?? "Achievement";

  async function handleShare() {
    const text = `I just unlocked ${title} on Step Up! 🔥`;
    if (navigator.share) {
      try {
        await navigator.share({ text, title: "Step Up" });
      } catch {
        // user cancelled
      }
      return;
    }
    await navigator.clipboard.writeText(text);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        className="w-full max-w-sm rounded-3xl bg-surface p-6 shadow-xl"
        role="dialog"
        aria-labelledby="unlock-title"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
          Achievement unlocked
        </p>
        <div className="mt-4 flex flex-col items-center text-center">
          <div className="flex size-20 items-center justify-center rounded-2xl bg-brand/10 text-4xl">
            {achievement.emoji}
          </div>
          <h2 className="mt-4 text-xl font-bold text-foreground" id="unlock-title">
            {title}
          </h2>
          {achievement.rarityPercent !== null ? (
            <p className="mt-1 text-sm text-muted">
              {achievement.rarityPercent}% of participants earned this
            </p>
          ) : null}
        </div>
        <div className="mt-6 flex gap-2">
          <button
            className="flex-1 rounded-full border border-black/10 px-4 py-3 text-sm font-medium"
            onClick={onClose}
            type="button"
          >
            Nice!
          </button>
          <button
            className="flex-1 rounded-full bg-brand px-4 py-3 text-sm font-semibold text-white"
            onClick={() => {
              void handleShare();
              onClose();
            }}
            type="button"
          >
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
