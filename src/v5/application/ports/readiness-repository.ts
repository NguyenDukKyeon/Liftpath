import type { EntityId } from "../../domain/common/types.js";
import type { ReadinessEntry } from "../../domain/training/readiness.js";

export interface ReadinessRepository {
  save(entry: ReadinessEntry): Promise<void>;
  getForSession(sessionId: EntityId): Promise<ReadinessEntry | undefined>;
  listRecent(limit: number): Promise<ReadinessEntry[]>;
}
