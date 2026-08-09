import type { EntityId } from "../common/types.js";

export type EffortStatus = "too_easy" | "on_target" | "too_hard" | "inconsistent";

export interface EffortExposure {
  id: EntityId;
  rir?: number;
}

export function classifyEffortStatus(exposures: readonly EffortExposure[], targetRir: number): EffortStatus {
  const values = exposures.map((exposure) => exposure.rir).filter((rir): rir is number => rir !== undefined);
  if (values.length < 2) return "inconsistent";

  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max - min > 2) return "inconsistent";

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (average <= targetRir - 0.75) return "too_hard";
  if (average >= targetRir + 1.5) return "too_easy";
  return "on_target";
}
