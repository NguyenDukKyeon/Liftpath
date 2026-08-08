import type { Clock } from "../ports/clock.js";
import type { SessionRepository } from "../ports/session-repository.js";
import type { EntityId } from "../../domain/common/types.js";
import { LiftPathV5Error } from "../../domain/common/errors.js";
import type { TrainingSession } from "../../domain/training/session.js";

export interface CompleteWorkoutOptions {
  evaluateCoachAfterCommit?: (completed: TrainingSession) => Promise<void>;
  onCoachFailure?: (error: LiftPathV5Error) => void;
}

export async function completeWorkout(
  sessionId: EntityId,
  sessions: SessionRepository,
  clock: Clock,
  options: CompleteWorkoutOptions = {},
): Promise<TrainingSession> {
  const completed = await sessions.completeIfActive(sessionId, clock.now());

  if (options.evaluateCoachAfterCommit) {
    try {
      await options.evaluateCoachAfterCommit(completed);
    } catch (error) {
      if (error instanceof LiftPathV5Error && error.code === "COACH_POLICY_ERROR") {
        options.onCoachFailure?.(error);
      } else {
        throw error;
      }
    }
  }

  return completed;
}
