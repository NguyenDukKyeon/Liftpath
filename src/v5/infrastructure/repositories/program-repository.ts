import type { ProgramRepository } from "../../application/ports/program-repository.js";
import type { V5Database } from "../../application/ports/storage.js";
import type { EntityId } from "../../domain/common/types.js";
import type { ProgramVersion } from "../../domain/programming/program.js";
import { createIndexedDbDatabase } from "./indexed-db-database.js";

export function createProgramRepository(
  database: V5Database = createIndexedDbDatabase(),
): ProgramRepository {
  return {
    async save(program: ProgramVersion): Promise<void> {
      await database.transaction(["programVersions"], "readwrite", async (tx) => {
        await tx.put("programVersions", program);
      });
    },
    async get(id: EntityId): Promise<ProgramVersion | undefined> {
      return database.transaction(["programVersions"], "readonly", (tx) =>
        tx.get<ProgramVersion>("programVersions", id),
      );
    },
  };
}
