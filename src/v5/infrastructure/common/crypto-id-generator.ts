import type { IdGenerator } from "../../application/ports/id-generator.js";
import type { EntityId } from "../../domain/common/types.js";

export class CryptoIdGenerator implements IdGenerator {
  next(prefix: string): EntityId {
    return `${prefix}_${crypto.randomUUID()}`;
  }
}
