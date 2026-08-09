import { LiftPathV5Error } from "../common/errors.js";
import type { EntityId, VersionedRecord } from "../common/types.js";

export type ReadinessEnergy = "low" | "normal" | "high";
export type ReadinessSoreness = "none" | "mild" | "high";

export interface ReadinessEntry extends VersionedRecord {
  sessionId: EntityId;
  energy: ReadinessEnergy;
  soreness: ReadinessSoreness;
  painExerciseIds: EntityId[];
}

const ENERGY_VALUES = new Set<ReadinessEnergy>(["low", "normal", "high"]);
const SORENESS_VALUES = new Set<ReadinessSoreness>(["none", "mild", "high"]);

export function validateReadinessEntry(entry: ReadinessEntry): void {
  if (!entry.id.trim() || !entry.sessionId.trim()) {
    throw new LiftPathV5Error("VALIDATION_ERROR", "Readiness requires stable record and session ids");
  }
  if (!ENERGY_VALUES.has(entry.energy)) {
    throw new LiftPathV5Error("VALIDATION_ERROR", "Readiness energy is invalid");
  }
  if (!SORENESS_VALUES.has(entry.soreness)) {
    throw new LiftPathV5Error("VALIDATION_ERROR", "Readiness soreness is invalid");
  }
  if (entry.revision < 1 || !Number.isInteger(entry.revision)) {
    throw new LiftPathV5Error("VALIDATION_ERROR", "Readiness revision must be a positive integer");
  }

  const painIds = entry.painExerciseIds.map((id) => id.trim());
  if (painIds.some((id) => id.length === 0)) {
    throw new LiftPathV5Error("VALIDATION_ERROR", "Pain exercise ids cannot be empty");
  }
  if (new Set(painIds).size !== painIds.length) {
    throw new LiftPathV5Error("VALIDATION_ERROR", "Duplicate pain exercise ids are not allowed");
  }
}
