import type { Clock } from "../ports/clock.js";
import type { SessionRepository } from "../ports/session-repository.js";
import { LiftPathV5Error } from "../../domain/common/errors.js";
import type { EntityId } from "../../domain/common/types.js";
import type { TrainingSession } from "../../domain/training/session.js";

export async function completeWorkout(
  sessionId: EntityId,
  sessions: SessionRepository,
  clock: Clock,
): Promise<TrainingSession> {
  const session = await sessions.get(sessionId);
  if (!session || session.status !== "active") {
    throw new LiftPathV5Error("VALIDATION_ERROR", "Workout completion requires an active session");
  }

  const now = clock.now();
  const completed: TrainingSession = {
    ...session,
    status: "completed",
    completedAt: now,
    updatedAt: now,
    revision: session.revision + 1,
  };

  await sessions.update(completed);
  return completed;
}
