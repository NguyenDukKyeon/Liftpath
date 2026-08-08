import type { ProgramRepository } from "../../application/ports/program-repository.js";
import type { V5Database } from "../../application/ports/storage.js";
import { LiftPathV5Error } from "../../domain/common/errors.js";
import type { EntityId, VersionedRecord } from "../../domain/common/types.js";
import type { CoachRecommendation } from "../../domain/coaching/recommendation.js";
import type { TrainingProfile } from "../../domain/programming/profile.js";
import type { ProgramVersion } from "../../domain/programming/program.js";
import { createIndexedDbDatabase } from "./indexed-db-database.js";

const ACTIVE_PROGRAM_METADATA_ID = "active-program";

interface ActiveProgramPointer extends VersionedRecord {
  value: {
    profileId: EntityId;
    programVersionId: EntityId;
  };
}

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

    async activateInitial(profile: TrainingProfile, program: ProgramVersion): Promise<void> {
      await database.transaction(
        ["profiles", "programVersions", "metadata"],
        "readwrite",
        async (tx) => {
          const existing = await tx.get<ActiveProgramPointer>("metadata", ACTIVE_PROGRAM_METADATA_ID);
          if (existing) {
            throw new LiftPathV5Error("VALIDATION_ERROR", "An active program already exists");
          }

          const pointer: ActiveProgramPointer = {
            id: ACTIVE_PROGRAM_METADATA_ID,
            value: { profileId: profile.id, programVersionId: program.id },
            createdAt: program.createdAt,
            updatedAt: program.updatedAt,
            revision: 1,
          };

          await tx.put("profiles", profile);
          await tx.put("programVersions", program);
          await tx.put("metadata", pointer);
        },
      );
    },

    async getActive(): Promise<ProgramVersion | undefined> {
      return database.transaction(
        ["metadata", "programVersions"],
        "readonly",
        async (tx) => {
          const pointer = await tx.get<ActiveProgramPointer>("metadata", ACTIVE_PROGRAM_METADATA_ID);
          if (!pointer) return undefined;

          const program = await tx.get<ProgramVersion>("programVersions", pointer.value.programVersionId);
          if (!program) {
            throw new LiftPathV5Error(
              "CORRUPTED_DATA",
              "Active program pointer references a missing program version",
            );
          }
          return program;
        },
      );
    },

    async applyCoachDecision(
      program: ProgramVersion,
      recommendation: CoachRecommendation,
    ): Promise<void> {
      await database.transaction(
        ["programVersions", "recommendations", "metadata"],
        "readwrite",
        async (tx) => {
          const pointer = await tx.get<ActiveProgramPointer>("metadata", ACTIVE_PROGRAM_METADATA_ID);
          if (!pointer) {
            throw new LiftPathV5Error("CORRUPTED_DATA", "Coach decision requires an active program pointer");
          }

          const nextPointer: ActiveProgramPointer = {
            ...pointer,
            value: { ...pointer.value, programVersionId: program.id },
            updatedAt: program.updatedAt,
            revision: pointer.revision + 1,
          };

          await tx.put("programVersions", program);
          await tx.put("recommendations", recommendation);
          await tx.put("metadata", nextPointer);
        },
      );
    },
  };
}
