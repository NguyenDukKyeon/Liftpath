import type { EntityId } from "../../domain/common/types.js";
import type { CoachRecommendation } from "../../domain/coaching/recommendation.js";
import type { TrainingProfile } from "../../domain/programming/profile.js";
import type { ProgramVersion } from "../../domain/programming/program.js";
import type { TrainingBlock } from "../../domain/programming/training-block.js";

export interface ProgramRepository {
  save(program: ProgramVersion): Promise<void>;
  get(id: EntityId): Promise<ProgramVersion | undefined>;
  activateInitial(profile: TrainingProfile, program: ProgramVersion): Promise<void>;
  getActive(): Promise<ProgramVersion | undefined>;
}

export interface CoachDecisionProgramRepository {
  getActive(): Promise<ProgramVersion | undefined>;
  applyCoachDecision(program: ProgramVersion, recommendation: CoachRecommendation): Promise<void>;
}

export interface GoalTransitionCommit {
  expectedActiveProgramId: EntityId;
  expectedActiveBlockId: EntityId;
  expectedProfileRevision: number;
  completedBlock: TrainingBlock;
  profile: TrainingProfile;
  program: ProgramVersion;
  nextBlock: TrainingBlock;
}

export interface GoalTransitionRepository {
  activateGoalTransition(input: GoalTransitionCommit): Promise<void>;
}
