import type { EntityId, ISODateTime, PolicyVersion } from "../common/types.js";
import type { TrainingProfile } from "../programming/profile.js";
import type { ProgramVersion } from "../programming/program.js";
import type { CompletedSet } from "../training/set.js";
import type { TrainingSession } from "../training/session.js";

export interface CoachReadinessSnapshot {
  sessionId: EntityId;
  energy: "low" | "normal" | "high";
  soreness: "none" | "mild" | "high";
  painExerciseIds: EntityId[];
}

export interface CoachContext {
  now: ISODateTime;
  profile: TrainingProfile;
  activeProgram: ProgramVersion;
  recentSets: CompletedSet[];
  recentSessions: TrainingSession[];
  readiness: CoachReadinessSnapshot[];
  programmingPolicyVersion: PolicyVersion;
  coachPolicyVersion: PolicyVersion;
}
