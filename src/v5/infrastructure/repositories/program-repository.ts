import type {
  CoachDecisionProgramRepository,
  GoalTransitionCommit,
  GoalTransitionRepository,
  ProgramRepository,
} from "../../application/ports/program-repository.js";
import type { V5Database } from "../../application/ports/storage.js";
import { LiftPathV5Error } from "../../domain/common/errors.js";
import type { EntityId, VersionedRecord } from "../../domain/common/types.js";
import type { CoachRecommendation } from "../../domain/coaching/recommendation.js";
import type { TrainingProfile } from "../../domain/programming/profile.js";
import type { ProgramVersion } from "../../domain/programming/program.js";
import { advanceTrainingBlockProgram, type TrainingBlock } from "../../domain/programming/training-block.js";
import { BLOCK_STATUS_INDEX } from "../db/constants.js";
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
): ProgramRepository & CoachDecisionProgramRepository & GoalTransitionRepository {
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

    async activateInitial(profile: TrainingProfile, program: ProgramVersion, block: TrainingBlock): Promise<void> {
      await database.transaction(
        ["profiles", "programVersions", "trainingBlocks", "metadata"],
        "readwrite",
        async (tx) => {
          const existing = await tx.get<ActiveProgramPointer>("metadata", ACTIVE_PROGRAM_METADATA_ID);
          if (existing) {
            throw new LiftPathV5Error("VALIDATION_ERROR", "An active program already exists");
          }
          const activeBlocks = await tx.getAllByIndex<TrainingBlock>("trainingBlocks", BLOCK_STATUS_INDEX, "active");
          if (activeBlocks.length > 0) {
            throw new LiftPathV5Error("VALIDATION_ERROR", "An active training block already exists");
          }
          if (
            block.status !== "active" ||
            block.blockNumber !== 1 ||
            block.structureId !== program.structureId ||
            block.initialProgramVersionId !== program.id ||
            block.currentProgramVersionId !== program.id ||
            program.profileId !== profile.id
          ) {
            throw new LiftPathV5Error("VALIDATION_ERROR", "Initial program and training block are inconsistent");
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
          await tx.put("trainingBlocks", block);
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
            throw new LiftPathV5Error("CORRUPTED_DATA", "Active program pointer references a missing program version");
          }
          return program;
        },
      );
    },

    async applyCoachDecision(program: ProgramVersion, recommendation: CoachRecommendation): Promise<void> {
      await database.transaction(
        ["programVersions", "recommendations", "metadata", "trainingBlocks"],
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
          const activeBlocks = await tx.getAllByIndex<TrainingBlock>("trainingBlocks", BLOCK_STATUS_INDEX, "active");
          if (activeBlocks.length > 1) {
            throw new LiftPathV5Error("CORRUPTED_DATA", "Multiple active training blocks found");
          }
          await tx.put("programVersions", program);
          await tx.put("recommendations", recommendation);
          await tx.put("metadata", nextPointer);
          const activeBlock = activeBlocks[0];
          if (activeBlock) {
            if (activeBlock.structureId !== program.structureId) {
              throw new LiftPathV5Error("VALIDATION_ERROR", "Coach decision cannot change training structure");
            }
            await tx.put("trainingBlocks", advanceTrainingBlockProgram(activeBlock, program.id, program.updatedAt));
          }
        },
      );
    },

    async activateGoalTransition(input: GoalTransitionCommit): Promise<void> {
      await database.transaction(
        ["profiles", "programVersions", "trainingBlocks", "metadata"],
        "readwrite",
        async (tx) => {
          const pointer = await tx.get<ActiveProgramPointer>("metadata", ACTIVE_PROGRAM_METADATA_ID);
          if (!pointer || pointer.value.programVersionId !== input.expectedActiveProgramId) {
            throw new LiftPathV5Error("VALIDATION_ERROR", "Goal transition is based on a stale active program");
          }
          const storedProfile = await tx.get<TrainingProfile>("profiles", pointer.value.profileId);
          if (!storedProfile || storedProfile.revision !== input.expectedProfileRevision) {
            throw new LiftPathV5Error("VALIDATION_ERROR", "Goal transition is based on a stale profile");
          }
          const activeBlocks = await tx.getAllByIndex<TrainingBlock>("trainingBlocks", BLOCK_STATUS_INDEX, "active");
          if (activeBlocks.length !== 1 || activeBlocks[0]?.id !== input.expectedActiveBlockId) {
            throw new LiftPathV5Error("VALIDATION_ERROR", "Goal transition requires the expected active block");
          }
          const storedBlock = activeBlocks[0];
          if (!storedBlock) throw new LiftPathV5Error("CORRUPTED_DATA", "Active training block is missing");
          if (
            storedBlock.currentProgramVersionId !== input.expectedActiveProgramId ||
            storedBlock.structureId !== input.program.structureId ||
            input.completedBlock.id !== storedBlock.id ||
            input.completedBlock.status !== "completed" ||
            input.completedBlock.initialProgramVersionId !== storedBlock.initialProgramVersionId ||
            input.completedBlock.currentProgramVersionId !== storedBlock.currentProgramVersionId ||
            input.completedBlock.revision !== storedBlock.revision + 1 ||
            input.nextBlock.status !== "active" ||
            input.nextBlock.blockNumber !== storedBlock.blockNumber + 1 ||
            input.nextBlock.structureId !== storedBlock.structureId ||
            input.nextBlock.initialProgramVersionId !== input.program.id ||
            input.nextBlock.currentProgramVersionId !== input.program.id ||
            input.profile.id !== pointer.value.profileId ||
            input.program.profileId !== input.profile.id
          ) {
            throw new LiftPathV5Error("VALIDATION_ERROR", "Goal transition state is inconsistent");
          }
          const existingProgram = await tx.get<ProgramVersion>("programVersions", input.program.id);
          const existingBlock = await tx.get<TrainingBlock>("trainingBlocks", input.nextBlock.id);
          if (existingProgram || existingBlock) {
            throw new LiftPathV5Error("VALIDATION_ERROR", "Goal transition target ids already exist");
          }
          const nextPointer: ActiveProgramPointer = {
            ...pointer,
            value: { profileId: input.profile.id, programVersionId: input.program.id },
            updatedAt: input.program.updatedAt,
            revision: pointer.revision + 1,
          };
          await tx.put("trainingBlocks", input.completedBlock);
          await tx.put("profiles", input.profile);
          await tx.put("programVersions", input.program);
          await tx.put("trainingBlocks", input.nextBlock);
          await tx.put("metadata", nextPointer);
        },
      );
    },
  };
}
