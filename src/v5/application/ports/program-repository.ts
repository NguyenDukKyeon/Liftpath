import type { EntityId } from "../../domain/common/types.js";
import type { ProgramVersion } from "../../domain/programming/program.js";

export interface ProgramRepository {
  save(program: ProgramVersion): Promise<void>;
  get(id: EntityId): Promise<ProgramVersion | undefined>;
}
