import type { EntityId, ISODateTime } from "../../domain/common/types.js";
import type { CompletedSet } from "../../domain/training/set.js";
import type { TrainingSession } from "../../domain/training/session.js";

export interface SessionRepository {
  create(session: TrainingSession): Promise<void>;
  createIfNoActive(session: TrainingSession): Promise<void>;
  update(session: TrainingSession): Promise<void>;
  completeIfActive(sessionId: EntityId, completedAt: ISODateTime): Promise<TrainingSession>;
  get(id: EntityId): Promise<TrainingSession | undefined>;
  getActive(): Promise<TrainingSession | undefined>;
  listSets(sessionId: EntityId): Promise<CompletedSet[]>;
  saveSet(set: CompletedSet): Promise<void>;
}
