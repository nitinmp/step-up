export function computeBasePoints(
  steps: number,
  target: number,
  dayRate: number,
): number {
  if (steps < target) {
    return 0;
  }

  return dayRate * (1 + Math.floor((steps - target) / 1000));
}

export function isBeastMode(
  steps: number,
  target: number,
  beastMultiplier: number,
): boolean {
  return steps >= beastMultiplier * target;
}
