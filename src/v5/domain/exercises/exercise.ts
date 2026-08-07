import type { VersionedRecord } from "../common/types.js";

export type ExerciseKind = "resistance" | "bodyweight" | "duration" | "distance";

export interface ExerciseDefinition extends VersionedRecord {
  name: string;
  kind: ExerciseKind;
  equipment: string[];
}
