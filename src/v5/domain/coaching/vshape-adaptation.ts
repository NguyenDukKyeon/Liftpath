import type { EntityId } from "../common/types.js";
import type { MuscleId } from "../exercises/exercise.js";
import type { AdherenceStatus } from "./adherence.js";
import { confidenceForExposureCount, type EvidenceConfidence } from "./confidence.js";
import type { Diagnosis } from "./diagnosis.js";
import type { EffortStatus } from "./effort-status.js";
import type { PerformanceTrend } from "./performance-trend.js";
import type { ProgramPatch } from "./recommendation.js";
import type { RecommendationPriority } from "./recommendation-priority.js";

export type VShapeAdaptationAction =
  | "NO_CHANGE"
  | "REVIEW_SPECIALIZATION"
  | "REDUCE_EFFORT_FIRST"
  | "STOP_NORMAL_PROGRESSION"
  | "DO_NOT_ADD_VOLUME";

export interface VShapeAdaptationInput {
  exerciseId: EntityId;
  muscle: MuscleId;
  performanceTrend: PerformanceTrend;
  effortStatus: EffortStatus;
  adherence: AdherenceStatus;
  recoveryNormal: boolean;
  workloadSets: number;
  workloadMax: number;
  exposureCount: number;
  targetRir: number;
  beforeExerciseId?: EntityId;
  pain?: boolean;
}

export interface VShapeAdaptationResult {
  action: VShapeAdaptationAction;
  diagnosis: Diagnosis;
  priority: RecommendationPriority | null;
  patch: ProgramPatch | null;
  confidence: EvidenceConfidence;
  reasonCode: string;
}

export function evaluateVShapeAdaptation(input: VShapeAdaptationInput): VShapeAdaptationResult {
  const confidence = confidenceForExposureCount(input.exposureCount);

  if (input.pain) {
    return {
      action: "STOP_NORMAL_PROGRESSION",
      diagnosis: { kind: "pain_safety", exerciseId: input.exerciseId },
      priority: "safety",
      patch: null,
      confidence,
      reasonCode: "VSHAPE_PAIN_BLOCKS_PROGRESSION",
    };
  }

  if (input.effortStatus === "too_hard") {
    return {
      action: "REDUCE_EFFORT_FIRST",
      diagnosis: { kind: "effort_too_high", exerciseId: input.exerciseId },
      priority: "fatigue",
      patch: { kind: "set_target_rir", exerciseId: input.exerciseId, targetRir: input.targetRir },
      confidence,
      reasonCode: "VSHAPE_EFFORT_TOO_HIGH",
    };
  }

  if (input.performanceTrend === "improving" && input.recoveryNormal) {
    return {
      action: "NO_CHANGE",
      diagnosis: { kind: "no_change" },
      priority: null,
      patch: null,
      confidence,
      reasonCode: "VSHAPE_IMPROVING_HOLD",
    };
  }

  if (input.workloadSets >= input.workloadMax) {
    return {
      action: "DO_NOT_ADD_VOLUME",
      diagnosis: { kind: "specialization_review", muscle: input.muscle },
      priority: "specialization",
      patch: null,
      confidence,
      reasonCode: "VSHAPE_HIGH_BOUND_HOLD_VOLUME",
    };
  }

  if (input.performanceTrend === "stable" && input.adherence === "complete" && input.effortStatus === "on_target") {
    return {
      action: "REVIEW_SPECIALIZATION",
      diagnosis: { kind: "specialization_review", muscle: input.muscle },
      priority: "specialization",
      patch: input.beforeExerciseId
        ? { kind: "move_exercise", exerciseId: input.exerciseId, beforeExerciseId: input.beforeExerciseId }
        : null,
      confidence,
      reasonCode: input.beforeExerciseId ? "VSHAPE_PRIORITY_STABLE_REORDER" : "VSHAPE_PRIORITY_STABLE_REVIEW",
    };
  }

  return {
    action: "NO_CHANGE",
    diagnosis: { kind: "no_change" },
    priority: null,
    patch: null,
    confidence,
    reasonCode: "VSHAPE_EVIDENCE_HOLD",
  };
}
