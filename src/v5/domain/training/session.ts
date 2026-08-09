import type { Clock } from "../../application/ports/clock.js";
import type { IdGenerator } from "../../application/ports/id-generator.js";
import { LiftPathV5Error } from "../common/errors.js";
import type { EntityId, ISODateTime, VersionedRecord } from "../common/types.js";
import type { ProgramVersion } from "../programming/program.js";

export interface TrainingSession extends VersionedRecord {
  programVersionId: EntityId;
  sessionKey: string;
  status: "active" | "completed" | "cancelled";
  startedAt: ISODateTime;
  completedAt?: ISODateTime;
}

export function buildTrainingSession(
  programVersion: ProgramVersion,
  sessionKey: string,
  ids: IdGenerator,
  clock: Clock,
): TrainingSession {
  if (!programVersion.sessions.some((session) => session.key === sessionKey)) {
    throw new LiftPathV5Error("VALIDATION_ERROR", `Unknown session key: ${sessionKey}`);
  }

  const now = clock.now();
  return {
    id: ids.next("session"),
    programVersionId: programVersion.id,
    sessionKey,
    status: "active",
    startedAt: now,
    createdAt: now,
    updatedAt: now,
    revision: 1,
  };
}
