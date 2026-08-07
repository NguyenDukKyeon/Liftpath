import type { Clock } from "../ports/clock.js";
import type { IdGenerator } from "../ports/id-generator.js";
import type { SessionRepository } from "../ports/session-repository.js";
import { LiftPathV5Error } from "../../domain/common/errors.js";
import type { ProgramVersion } from "../../domain/programming/program.js";
import { buildTrainingSession, type TrainingSession } from "../../domain/training/session.js";

export async function startWorkout(input: {
  programVersion: ProgramVersion;
  sessionKey: string;
  sessions: SessionRepository;
  ids: IdGenerator;
  clock: Clock;
}): Promise<TrainingSession> {
  const active = await input.sessions.getActive();
  if (active) {
    throw new LiftPathV5Error(
      "VALIDATION_ERROR",
      "An active workout already exists; resume or cancel it before starting another",
    );
  }

  const session = buildTrainingSession(
    input.programVersion,
    input.sessionKey,
    input.ids,
    input.clock,
  );
  await input.sessions.create(session);
  return session;
}
