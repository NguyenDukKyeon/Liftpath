import type { EntityId } from "../../domain/common/types.js";
import type { CompletedSet } from "../../domain/training/set.js";
import type { TrainingSession } from "../../domain/training/session.js";

export interface SessionRepository {
  create(session: TrainingSession): Promise<void>;
  get(id: EntityId): Promise<TrainingSession | undefined>;
  getActive(): Promise<TrainingSession | undefined>;
  listSets(sessionId: EntityId): Promise<CompletedSet[]>;
}
