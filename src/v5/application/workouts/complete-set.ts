import type { Clock } from "../ports/clock.js";
import type { IdGenerator } from "../ports/id-generator.js";
import type { SessionRepository } from "../ports/session-repository.js";
import { LiftPathV5Error } from "../../domain/common/errors.js";
import type { EntityId } from "../../domain/common/types.js";
import {
  validateCompletedSetInput,
  type CompletedSet,
} from "../../domain/training/set.js";

export interface CompleteSetInput {
  sessionId: EntityId;
  exerciseId: EntityId;
  setOrdinal: number;
  loadKg?: number;
  reps?: number;
  rir?: number;
}

export async function completeSet(input: {
  input: CompleteSetInput;
  sessions: SessionRepository;
  ids: IdGenerator;
  clock: Clock;
}): Promise<CompletedSet> {
  if (!input.input.sessionId || !input.input.exerciseId) {
    throw new LiftPathV5Error("VALIDATION_ERROR", "sessionId and exerciseId are required");
  }
  if (!Number.isInteger(input.input.setOrdinal) || input.input.setOrdinal < 1) {
    throw new LiftPathV5Error("VALIDATION_ERROR", "setOrdinal must be a positive integer");
  }
  validateCompletedSetInput(input.input);

  const session = await input.sessions.get(input.input.sessionId);
  if (!session || session.status !== "active") {
    throw new LiftPathV5Error("VALIDATION_ERROR", "Set completion requires an active workout session");
  }

  const now = input.clock.now();
  const completed: CompletedSet = {
    id: input.ids.next("set"),
    sessionId: input.input.sessionId,
    exerciseId: input.input.exerciseId,
    setOrdinal: input.input.setOrdinal,
    loadKg: input.input.loadKg,
    reps: input.input.reps,
    rir: input.input.rir,
    completedAt: now,
    createdAt: now,
    updatedAt: now,
    revision: 1,
  };

  await input.sessions.saveSet(completed);
  return completed;
}
