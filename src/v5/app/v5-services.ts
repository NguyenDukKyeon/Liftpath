import type { Clock } from "../application/ports/clock.js";
import type { IdGenerator } from "../application/ports/id-generator.js";
import type { CompleteWorkoutOptions } from "../application/workouts/complete-workout.js";
import type { CompleteSetInput } from "../application/workouts/complete-set.js";
import type { RecordReadinessInput } from "../application/workouts/record-readiness.js";
import type { CoachContextWithoutReadiness } from "../application/coaching/evaluate-coach.js";
import type { ActivateGoalTransitionInput, ActivatedGoalTransition } from "../application/programs/activate-goal-transition.js";
import type { ActivatedProgram } from "../application/programs/activate-program.js";
import type { GoalTransitionProposal } from "../application/programs/propose-goal-transition.js";
import type { BackupPreview } from "../application/backup/backup-types.js";
import type { BlockReview, BlockReviewInput } from "../domain/programming/block-review.js";
import type { CoachRecommendation, ProgramPatch } from "../domain/coaching/recommendation.js";
import type { EntityId } from "../domain/common/types.js";
import type { ExerciseMetadata } from "../domain/exercises/exercise.js";
import type { ProgramProposal } from "../domain/programming/prescription.js";
import type { TrainingProfile, TrainingProfileDraft } from "../domain/programming/profile.js";
import type { ProgramVersion } from "../domain/programming/program.js";
import type { StructureProposal } from "../domain/programming/structure-proposals.js";
import type { TrainingBlock } from "../domain/programming/training-block.js";
import type { ReadinessEntry } from "../domain/training/readiness.js";
import type { CompletedSet } from "../domain/training/set.js";
import type { TrainingSession } from "../domain/training/session.js";

export interface V5Services {
  clock: Clock;
  ids: IdGenerator;
  catalog: readonly ExerciseMetadata[];
  workouts: {
    start(input: { programVersion: ProgramVersion; sessionKey: string }): Promise<TrainingSession>;
    resume(): Promise<{ session: TrainingSession; sets: CompletedSet[] } | null>;
    completeSet(input: CompleteSetInput): Promise<CompletedSet>;
    completeWorkout(sessionId: EntityId, options?: CompleteWorkoutOptions): Promise<TrainingSession>;
    recordReadiness(input: RecordReadinessInput): Promise<ReadinessEntry>;
  };
  programs: {
    proposeStructures(profile: TrainingProfileDraft): StructureProposal[];
    buildPreview(profile: TrainingProfileDraft, structureId: string): ProgramProposal;
    activate(proposal: ProgramProposal, profile: TrainingProfileDraft): Promise<ActivatedProgram>;
    get(id: EntityId): Promise<ProgramVersion | undefined>;
    getActive(): Promise<ProgramVersion | undefined>;
    save(program: ProgramVersion): Promise<void>;
    getActiveBlock(): Promise<TrainingBlock | undefined>;
    reviewBlock(
      blockId: EntityId,
      evidence: Omit<BlockReviewInput, "block">,
    ): Promise<BlockReview>;
    proposeGoalTransition(
      currentProgram: ProgramVersion,
      currentProfile: TrainingProfileDraft,
      targetProfile: TrainingProfileDraft,
      options?: { requestedStructureId?: string },
    ): GoalTransitionProposal;
    activateGoalTransition(input: ActivateGoalTransitionInput): Promise<ActivatedGoalTransition>;
  };
  coach: {
    evaluateCompletedSession(context: CoachContextWithoutReadiness): Promise<CoachRecommendation | null>;
    listPending(): Promise<CoachRecommendation[]>;
    accept(id: EntityId): Promise<ProgramVersion | null>;
    modify(id: EntityId, patch: ProgramPatch): Promise<ProgramVersion | null>;
    skip(id: EntityId): Promise<void>;
  };
  backup: {
    exportBackup(): Promise<string>;
    previewBackup(text: string): Promise<BackupPreview>;
    importBackup(text: string): Promise<BackupPreview>;
  };
}

export type GoalTransitionProfiles = {
  current: TrainingProfile;
  target: TrainingProfileDraft;
};
