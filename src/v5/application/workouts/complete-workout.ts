import type { Clock } from "../ports/clock.js";
import type { SessionRepository } from "../ports/session-repository.js";
import type { EntityId } from "../../domain/common/types.js";
import type { TrainingSession } from "../../domain/training/session.js";

export async function completeWorkout(
  sessionId: EntityId,
  sessions: SessionRepository,
  clock: Clock,
): Promise<TrainingSession> {
  return sessions.completeIfActive(sessionId, clock.now());
}
