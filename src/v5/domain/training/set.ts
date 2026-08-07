import type { EntityId, ISODateTime, VersionedRecord } from "../common/types.js";
import { LiftPathV5Error } from "../common/errors.js";
import { assertFiniteNonNegative } from "../common/validation.js";

export interface CompletedSetInput {
  loadKg?: number;
  reps?: number;
  rir?: number;
}

export interface CompletedSet extends VersionedRecord {
  sessionId: EntityId;
  exerciseId: EntityId;
  setOrdinal: number;
  loadKg?: number;
  reps?: number;
  rir?: number;
  completedAt: ISODateTime;
}

export function validateCompletedSetInput(input: CompletedSetInput): void {
  if (input.loadKg !== undefined) assertFiniteNonNegative("loadKg", input.loadKg);
  if (input.reps !== undefined) {
    assertFiniteNonNegative("reps", input.reps);
    if (!Number.isInteger(input.reps)) {
      throw new LiftPathV5Error("VALIDATION_ERROR", "reps must be an integer");
    }
  }
  if (input.rir !== undefined) {
    assertFiniteNonNegative("rir", input.rir);
    if (!Number.isInteger(input.rir) || input.rir > 10) {
      throw new LiftPathV5Error("VALIDATION_ERROR", "rir must be an integer between 0 and 10");
    }
  }
}
