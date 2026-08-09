import type { Clock } from "../application/ports/clock.js";
import type { IdGenerator } from "../application/ports/id-generator.js";
import type { V5Database } from "../application/ports/storage.js";
import { exportBackup } from "../application/backup/export-backup.js";
import { importBackup, previewBackup } from "../application/backup/import-backup.js";
import { acceptRecommendation } from "../application/coaching/accept-recommendation.js";
import { evaluateCoachForCompletedSession } from "../application/coaching/evaluate-coach.js";
import { modifyRecommendation } from "../application/coaching/modify-recommendation.js";
import { skipRecommendation } from "../application/coaching/skip-recommendation.js";
import { activateGoalTransition } from "../application/programs/activate-goal-transition.js";
import { activateProgram } from "../application/programs/activate-program.js";
import { buildProgramPreview } from "../application/programs/build-program-preview.js";
import { proposeGoalTransition } from "../application/programs/propose-goal-transition.js";
import { proposeStructures } from "../application/programs/propose-structures.js";
import { reviewTrainingBlock } from "../application/programs/review-training-block.js";
import { completeSet } from "../application/workouts/complete-set.js";
import { completeWorkout } from "../application/workouts/complete-workout.js";
import { recordReadiness } from "../application/workouts/record-readiness.js";
import { resumeWorkout } from "../application/workouts/resume-workout.js";
import { startWorkout } from "../application/workouts/start-workout.js";
import { CATALOG_SEED } from "../domain/exercises/catalog-seed.js";
import type { ExerciseMetadata } from "../domain/exercises/exercise.js";
import { CryptoIdGenerator } from "../infrastructure/common/crypto-id-generator.js";
import { SystemClock } from "../infrastructure/common/system-clock.js";
import { createIndexedDbDatabase } from "../infrastructure/repositories/indexed-db-database.js";
import { createBlockRepository } from "../infrastructure/repositories/block-repository.js";
import { createProgramRepository } from "../infrastructure/repositories/program-repository.js";
import { createReadinessRepository } from "../infrastructure/repositories/readiness-repository.js";
import { createRecommendationRepository } from "../infrastructure/repositories/recommendation-repository.js";
import { createSessionRepository } from "../infrastructure/repositories/session-repository.js";
import type { V5Services } from "./v5-services.js";

export interface CreateV5ServicesOptions {
  database?: V5Database;
  clock?: Clock;
  ids?: IdGenerator;
  catalog?: readonly ExerciseMetadata[];
}

export function createV5Services(options: CreateV5ServicesOptions = {}): V5Services {
  const database = options.database ?? createIndexedDbDatabase();
  const clock = options.clock ?? new SystemClock();
  const ids = options.ids ?? new CryptoIdGenerator();
  const catalog = options.catalog ?? CATALOG_SEED;

  const sessions = createSessionRepository(database);
  const programs = createProgramRepository(database);
  const recommendations = createRecommendationRepository(database);
  const readiness = createReadinessRepository(database);
  const blocks = createBlockRepository(database);

  return {
    clock,
    ids,
    catalog,
    workouts: {
      start: (input) => startWorkout({ ...input, sessions, ids, clock }),
      resume: () => resumeWorkout(sessions),
      completeSet: (input) => completeSet({ input, sessions, ids, clock }),
      completeWorkout: (sessionId, completeOptions) =>
        completeWorkout(sessionId, sessions, clock, completeOptions),
      recordReadiness: (input) => recordReadiness(input, { readiness, sessions, clock, ids }),
    },
    programs: {
      proposeStructures,
      buildPreview: (profile, structureId) =>
        buildProgramPreview(profile, structureId, { catalog: [...catalog] }),
      activate: (proposal, profile) => activateProgram(proposal, profile, { programs, ids, clock }),
      get: (id) => programs.get(id),
      getActive: () => programs.getActive(),
      save: (program) => programs.save(program),
      getActiveBlock: () => blocks.getActive(),
      reviewBlock: (blockId, evidence) => reviewTrainingBlock(blockId, evidence, { blocks, clock }),
      proposeGoalTransition: (currentProgram, currentProfile, targetProfile, transitionOptions = {}) =>
        proposeGoalTransition(currentProgram, currentProfile, targetProfile, {
          catalog: [...catalog],
          ...transitionOptions,
        }),
      activateGoalTransition: (input) => activateGoalTransition(input, { lifecycle: programs, clock, ids }),
    },
    coach: {
      evaluateCompletedSession: (context) =>
        evaluateCoachForCompletedSession(context, { recommendations, readiness, ids, clock }),
      listPending: () => recommendations.listPending(),
      accept: (id) => acceptRecommendation(id, { programs, recommendations, ids, clock }),
      modify: (id, patch) => modifyRecommendation(id, patch, { programs, recommendations, ids, clock }),
      skip: (id) => skipRecommendation(id, { recommendations, clock }),
    },
    backup: {
      exportBackup: () => exportBackup(database, clock),
      previewBackup,
      importBackup: (text) => importBackup(text, database, clock, ids),
    },
  };
}
