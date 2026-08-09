import type { Clock } from "../ports/clock.js";
import type { IdGenerator } from "../ports/id-generator.js";
import type { ReadinessRepository } from "../ports/readiness-repository.js";
import type { SessionRepository } from "../ports/session-repository.js";
import { LiftPathV5Error } from "../../domain/common/errors.js";
import type { EntityId } from "../../domain/common/types.js";
import {
  validateReadinessEntry,
  type ReadinessEnergy,
  type ReadinessEntry,
  type ReadinessSoreness,
} from "../../domain/training/readiness.js";

export interface RecordReadinessInput {
  sessionId: EntityId;
  energy: ReadinessEnergy;
  soreness: ReadinessSoreness;
  painExerciseIds: EntityId[];
}

export interface RecordReadinessDependencies {
  readiness: ReadinessRepository;
  sessions: Pick<SessionRepository, "get">;
  clock: Clock;
  ids: IdGenerator;
}

export async function recordReadiness(
  input: RecordReadinessInput,
  dependencies: RecordReadinessDependencies,
): Promise<ReadinessEntry> {
  const session = await dependencies.sessions.get(input.sessionId);
  if (!session) {
    throw new LiftPathV5Error("VALIDATION_ERROR", "Readiness requires a known workout session");
  }
  if (session.status !== "active") {
    throw new LiftPathV5Error("VALIDATION_ERROR", "Readiness requires an active session");
  }

  const timestamp = dependencies.clock.now();
  const entry: ReadinessEntry = {
    id: dependencies.ids.next("readiness"),
    sessionId: input.sessionId,
    energy: input.energy,
    soreness: input.soreness,
    painExerciseIds: [...input.painExerciseIds],
    createdAt: timestamp,
    updatedAt: timestamp,
    revision: 1,
  };
  validateReadinessEntry(entry);
  await dependencies.readiness.save(entry);
  return entry;
}
