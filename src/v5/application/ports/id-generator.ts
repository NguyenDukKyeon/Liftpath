import type { EntityId } from "../../domain/common/types.js";

export interface IdGenerator {
  next(prefix: string): EntityId;
}
