import type { V5Database } from "../../application/ports/storage.js";
import type { EntityId, VersionedRecord } from "../../domain/common/types.js";

export interface MetadataRecord extends VersionedRecord {
  value: unknown;
}

export interface MetadataRepository {
  read(id: EntityId): Promise<MetadataRecord | undefined>;
  write(record: MetadataRecord): Promise<void>;
}

export function createMetadataRepository(database: V5Database): MetadataRepository {
  return {
    read(id) {
      return database.transaction(["metadata"], "readonly", (tx) => tx.get<MetadataRecord>("metadata", id));
    },
    write(record) {
      return database.transaction(["metadata"], "readwrite", (tx) => tx.put("metadata", record));
    },
  };
}
