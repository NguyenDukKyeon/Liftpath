import type { EntityId } from "../common/types.js";

export type AdherenceStatus = "complete" | "partial" | "missed";

export interface AdherenceExposure {
  sessionId: EntityId;
  prescribedSets: number;
  completedSets: number;
}

export function classifyAdherence(exposures: readonly AdherenceExposure[]): AdherenceStatus {
  if (exposures.length === 0) return "partial";
  if (exposures.every((exposure) => exposure.completedSets === 0)) return "missed";
  if (exposures.every((exposure) => exposure.completedSets >= exposure.prescribedSets)) return "complete";
  return "partial";
}
