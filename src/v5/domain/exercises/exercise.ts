import type { VersionedRecord } from "../common/types.js";

export type ExerciseKind = "resistance" | "bodyweight" | "duration" | "distance";

export interface ExerciseDefinition extends VersionedRecord {
  name: string;
  kind: ExerciseKind;
  equipment: string[];
}

export type MuscleId =
  | "lats"
  | "side_delts"
  | "rear_delts"
  | "upper_back"
  | "upper_chest"
  | "chest"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core";

export interface RepRange {
  min: number;
  max: number;
}

export interface ExerciseMetadata extends ExerciseDefinition {
  primaryMuscles: MuscleId[];
  secondaryMuscles: MuscleId[];
  movementPattern: string;
  stability: "high" | "medium" | "low";
  skillDemand: "low" | "medium" | "high";
  fatigueClass: "low" | "medium" | "high";
  supportedRepRanges: RepRange[];
  substitutionGroup: string;
}
