import type { MuscleId } from "../../exercises/exercise.js";
import type { PolicyVersion } from "../../common/types.js";
import type { PrimaryGoal, TrainingLevel } from "../goals.js";
import type { MusclePriority } from "../policy-constants.js";
import { generalFitnessGoalPolicy } from "./general-fitness.js";
import { hypertrophyGoalPolicy } from "./hypertrophy.js";
import { strengthGoalPolicy } from "./strength.js";

export type MusclePriorityMap = Record<MuscleId, MusclePriority>;

export interface GoalPolicy {
  id: PrimaryGoal;
  version: PolicyVersion;
  basePriorities(level: TrainingLevel): MusclePriorityMap;
}

export const ALL_MUSCLES: readonly MuscleId[] = [
  "lats", "side_delts", "rear_delts", "upper_back", "upper_chest", "chest",
  "biceps", "triceps", "quads", "hamstrings", "glutes", "calves", "core",
];

export function createUniformPriorities(priority: MusclePriority): MusclePriorityMap {
  return Object.fromEntries(ALL_MUSCLES.map((muscle) => [muscle, priority])) as MusclePriorityMap;
}

export function getGoalPolicy(goal: PrimaryGoal): GoalPolicy {
  if (goal === "hypertrophy") return hypertrophyGoalPolicy;
  if (goal === "strength") return strengthGoalPolicy;
  return generalFitnessGoalPolicy;
}
