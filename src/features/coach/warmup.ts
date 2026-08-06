import type { MovementPattern, TrackingMode } from "../../types.js";

export type WarmupInput = {
  workingWeightKg: number;
  movementPattern: MovementPattern;
  barWeightKg: number;
  trackingMode: TrackingMode;
  loadIncrementKg?: number;
};

export type WarmupSet = {
  weightKg: number;
  reps: number;
  percentage: number;
  optional: boolean;
};

const isolationLike = new Set<MovementPattern>(["isolation", "core", "carry"]);

const roundLoad = (value: number, increment: number) => {
  const step = increment > 0 ? increment : 0.5;
  return Math.max(0, Math.round(value / step) * step);
};

export const calculateWarmupSets = ({
  workingWeightKg,
  movementPattern,
  barWeightKg,
  trackingMode,
  loadIncrementKg = 2.5,
}: WarmupInput): WarmupSet[] => {
  if (trackingMode !== "weight-reps" || !Number.isFinite(workingWeightKg) || workingWeightKg <= 0) return [];

  if (isolationLike.has(movementPattern)) {
    const weightKg = roundLoad(workingWeightKg * 0.5, loadIncrementKg);
    if (weightKg <= 0 || weightKg >= workingWeightKg) return [];
    return [{ weightKg, reps: 8, percentage: 0.5, optional: true }];
  }

  const proposals: WarmupSet[] = [];
  if (barWeightKg > 0 && barWeightKg < workingWeightKg) {
    proposals.push({ weightKg: roundLoad(barWeightKg, loadIncrementKg), reps: 8, percentage: barWeightKg / workingWeightKg, optional: false });
  }

  const stages = barWeightKg > 0
    ? [
        { percentage: 0.5, reps: 5 },
        { percentage: 0.7, reps: 3 },
        { percentage: 0.85, reps: 2 },
      ]
    : [
        { percentage: 0.5, reps: 8 },
        { percentage: 0.7, reps: 5 },
        { percentage: 0.85, reps: 3 },
      ];

  stages.forEach(({ percentage, reps }) => {
    const weightKg = roundLoad(workingWeightKg * percentage, loadIncrementKg);
    if (weightKg > 0 && weightKg < workingWeightKg) {
      proposals.push({ weightKg, reps, percentage, optional: false });
    }
  });

  const unique = new Map<number, WarmupSet>();
  proposals.forEach((set) => {
    if (!unique.has(set.weightKg)) unique.set(set.weightKg, set);
  });
  return [...unique.values()].sort((a, b) => a.weightKg - b.weightKg);
};
