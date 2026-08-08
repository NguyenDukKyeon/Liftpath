import type { EntityId, PolicyVersion, VersionedRecord } from "../common/types.js";
import type { EvidenceConfidence } from "./confidence.js";
import type { RecommendationPriority } from "./recommendation-priority.js";

export type DecisionState = "pending" | "accepted" | "modified" | "skipped";

export type ProgramPatch =
  | { kind: "set_load"; exerciseId: EntityId; loadKg: number }
  | { kind: "set_target_rir"; exerciseId: EntityId; targetRir: number }
  | { kind: "set_count"; exerciseId: EntityId; sets: number }
  | { kind: "move_exercise"; exerciseId: EntityId; beforeExerciseId: EntityId }
  | { kind: "replace_exercise"; exerciseId: EntityId; replacementExerciseId: EntityId }
  | { kind: "reduced_volume_week"; multiplier: number };

export interface CoachRecommendation extends VersionedRecord {
  type: string;
  priority: RecommendationPriority;
  reasonCode: string;
  evidenceIds: EntityId[];
  confidence: EvidenceConfidence;
  proposedPatch: ProgramPatch;
  expectedIntent: string;
  decisionState: DecisionState;
  coachPolicyVersion: PolicyVersion;
  programmingPolicyVersion: PolicyVersion;
}
