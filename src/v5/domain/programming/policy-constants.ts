import type { PolicyVersion } from "../common/types.js";
import type { PrimaryGoal, TrainingLevel } from "./goals.js";

/**
 * V1 programming heuristics. These values are bounded prescription policy,
 * not claims of universal physiological set requirements.
 */
export const PROGRAMMING_POLICY_VERSION: PolicyVersion = "1.0.0";
export const INDIRECT_SET_CREDIT = 0.5;
export const BEGINNER_SPECIALIZATION_SET_CEILING = 14;

export type MusclePriority = "maintenance" | "normal" | "high" | "specialization";

export interface WorkloadBand {
  minDirectEquivalentSets: number;
  targetDirectEquivalentSets: number;
  maxDirectEquivalentSets: number;
}

type PriorityBands = Record<MusclePriority, WorkloadBand>;
type LevelBands = Record<TrainingLevel, PriorityBands>;

function bands(
  maintenance: [number, number, number],
  normal: [number, number, number],
  high: [number, number, number],
  specialization: [number, number, number],
): PriorityBands {
  const toBand = ([minDirectEquivalentSets, targetDirectEquivalentSets, maxDirectEquivalentSets]: [number, number, number]): WorkloadBand => ({
    minDirectEquivalentSets,
    targetDirectEquivalentSets,
    maxDirectEquivalentSets,
  });
  return {
    maintenance: toBand(maintenance),
    normal: toBand(normal),
    high: toBand(high),
    specialization: toBand(specialization),
  };
}

export const WORKLOAD_BANDS: Record<PrimaryGoal, LevelBands> = {
  hypertrophy: {
    beginner: bands([4, 4, 6], [6, 8, 10], [8, 10, 12], [10, 12, 14]),
    intermediate: bands([4, 6, 8], [8, 10, 14], [10, 12, 16], [12, 14, 18]),
  },
  strength: {
    beginner: bands([3, 4, 6], [4, 6, 8], [5, 7, 10], [6, 8, 12]),
    intermediate: bands([3, 5, 7], [5, 7, 10], [6, 9, 12], [8, 10, 14]),
  },
  general_fitness: {
    beginner: bands([3, 4, 6], [5, 7, 9], [6, 8, 10], [8, 10, 12]),
    intermediate: bands([3, 5, 7], [6, 8, 10], [8, 10, 12], [10, 12, 14]),
  },
};
