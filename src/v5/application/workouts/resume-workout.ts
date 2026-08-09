import type { SessionRepository } from "../ports/session-repository.js";
import type { CompletedSet } from "../../domain/training/set.js";
import type { TrainingSession } from "../../domain/training/session.js";

export async function resumeWorkout(sessions: SessionRepository): Promise<{
  session: TrainingSession;
  sets: CompletedSet[];
} | null> {
  const session = await sessions.getActive();
  if (!session) return null;

  return {
    session,
    sets: await sessions.listSets(session.id),
  };
}
