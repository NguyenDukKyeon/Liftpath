import type { ISODateTime, PolicyVersion } from "../common/types.js";
import type { TrainingProfile } from "../programming/profile.js";
import type { ProgramVersion } from "../programming/program.js";
import type { ReadinessEntry } from "../training/readiness.js";
import type { CompletedSet } from "../training/set.js";
import type { TrainingSession } from "../training/session.js";

export const COACH_RECENT_READINESS_LIMIT = 6;

export type CoachReadinessSnapshot = Pick<
  ReadinessEntry,
  "sessionId" | "energy" | "soreness" | "painExerciseIds"
>;

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
