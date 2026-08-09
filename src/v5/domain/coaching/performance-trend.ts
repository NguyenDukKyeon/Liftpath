import type { EntityId } from "../common/types.js";

export type PerformanceTrend = "insufficient_data" | "improving" | "stable" | "declining";

export interface PerformanceExposure {
  id: EntityId;
  loadKg: number;
  reps: number;
  rir?: number;
}

export function classifyPerformanceTrend(exposures: readonly PerformanceExposure[]): PerformanceTrend {
  if (exposures.length < 3) return "insufficient_data";

  const first = exposures[0];
  const last = exposures[exposures.length - 1];
  if (!first || !last) return "insufficient_data";

  if (first.rir !== undefined && last.rir !== undefined && Math.abs(first.rir - last.rir) > 1) {
    return "stable";
  }

  const firstWork = first.loadKg * first.reps;
  const lastWork = last.loadKg * last.reps;
  if (firstWork <= 0 || lastWork <= 0) return "stable";

  const ratio = lastWork / firstWork;
  if (ratio > 1.02) return "improving";
  if (ratio < 0.98) return "declining";
  return "stable";
}
