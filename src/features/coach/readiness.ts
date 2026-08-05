import { BUILT_IN_EXERCISES } from "../../data.js";
import type {
  EffortTarget,
  ExercisePrescription,
  MovementPattern,
} from "../../types.js";
import type {
  CoachDecision,
  CoachReasonCode,
  ReadinessAdjustment,
  ReadinessChange,
  ReadinessInput,
} from "./contracts.js";
import { explainReason } from "./explanations.js";

const clonePrescription = (prescription: ExercisePrescription): ExercisePrescription => ({
  ...prescription,
  setScheme: prescription.setScheme.map((set) => ({
    ...set,
    targetReps: set.targetReps ? { ...set.targetReps } : undefined,
    targetSeconds: set.targetSeconds ? { ...set.targetSeconds } : undefined,
    targetDistanceMeters: set.targetDistanceMeters ? { ...set.targetDistanceMeters } : undefined,
  })),
  targetEffort: { ...prescription.targetEffort },
  progression: { ...prescription.progression },
});

const estimateMinutes = (prescriptions: ExercisePrescription[]) => {
  const seconds = prescriptions.reduce((sum, prescription) =>
    sum + prescription.setScheme.length * (prescription.restSeconds + 45), 0);
  return Math.max(0, Math.round(seconds / 60));
};

const reduceEffort = (target: EffortTarget): EffortTarget => {
  if (target.mode === "rir") return { mode: "rir", value: Math.min(5, target.value + 1) };
  if (target.mode === "rpe") return { mode: "rpe", value: Math.max(1, target.value - 1) };
  return { mode: "simple", repsInReserve: Math.min(5, target.repsInReserve + 1) };
};

const movementPattern = (prescription: ExercisePrescription): MovementPattern | undefined =>
  BUILT_IN_EXERCISES[prescription.exerciseId]?.movementPattern;

const isSeverePain = (severity: NonNullable<ReadinessInput["pain"]>["severity"]) =>
  severity === "sharp"
  || severity === "unusual"
  || severity === "worsening"
  || severity === "joint-specific";

const changeDecision = (
  reasonCode: CoachReasonCode,
  value: ReadinessChange,
): CoachDecision<ReadinessChange> => ({
  value,
  reasonCode,
  explanation: explainReason(reasonCode),
  confidence: reasonCode === "insufficient-evidence" ? "low" : "high",
  evidence: [],
});

export const adjustWorkoutForReadiness = (
  workout: ExercisePrescription[],
  input: ReadinessInput,
): CoachDecision<ReadinessAdjustment> => {
  const base = workout.map(clonePrescription);
  if (!Number.isFinite(input.availableMinutes) || input.availableMinutes <= 0) {
    const value: ReadinessAdjustment = {
      prescriptions: base,
      removedPrescriptionIds: [],
      blockedPrescriptionIds: [],
      changedSetCounts: [],
      changedEffortPrescriptionIds: [],
      substitutions: [],
      allowStart: true,
      appliedReasonCodes: ["insufficient-evidence"],
      decisions: [changeDecision("insufficient-evidence", { type: "effort", prescriptionId: "workout" })],
    };
    return {
      value,
      reasonCode: "insufficient-evidence",
      explanation: explainReason("insufficient-evidence"),
      confidence: "low",
      evidence: [{ key: "availableMinutes", value: input.availableMinutes }],
    };
  }

  const appliedReasonCodes: CoachReasonCode[] = [];
  const decisions: CoachDecision<ReadinessChange>[] = [];
  const blockedPrescriptionIds: string[] = [];
  const removedPrescriptionIds: string[] = [];
  const changedSetCounts: ReadinessAdjustment["changedSetCounts"] = [];
  const changedEffortPrescriptionIds: string[] = [];

  let prescriptions = base;
  let allowStart = true;

  if (input.pain) {
    const affectedPatterns = new Set(input.pain.affectedPatterns);
    const blocked = prescriptions.filter((prescription) => {
      const pattern = movementPattern(prescription);
      return Boolean(pattern && affectedPatterns.has(pattern));
    });
    if (blocked.length) {
      blockedPrescriptionIds.push(...blocked.map((item) => item.id));
      prescriptions = prescriptions.filter((item) => !blockedPrescriptionIds.includes(item.id));
      appliedReasonCodes.push("pain-blocks-movement");
      blocked.forEach((item) => decisions.push(changeDecision("pain-blocks-movement", {
        type: "blocked",
        prescriptionId: item.id,
      })));
      if (isSeverePain(input.pain.severity)) allowStart = false;
    }
  }

  if (allowStart && estimateMinutes(prescriptions) > input.availableMinutes) {
    const removable = prescriptions
      .filter((item) => item.optional || item.priority === "accessory")
      .sort((a, b) => {
        const priorityScore = (item: ExercisePrescription) => item.priority === "accessory" ? 2 : item.optional ? 1 : 0;
        return priorityScore(b) - priorityScore(a) || b.order - a.order;
      });
    for (const item of removable) {
      if (estimateMinutes(prescriptions) <= input.availableMinutes) break;
      prescriptions = prescriptions.filter((candidate) => candidate.id !== item.id);
      removedPrescriptionIds.push(item.id);
      decisions.push(changeDecision("session-time-shortened", {
        type: "removed",
        prescriptionId: item.id,
      }));
    }
    if (removedPrescriptionIds.length) appliedReasonCodes.push("session-time-shortened");
  }

  const recoveryPoor = input.energy === "low" || input.soreness === "high";
  if (allowStart && recoveryPoor) {
    prescriptions = prescriptions.map((prescription) => {
      if (prescription.priority === "primary" || prescription.setScheme.length <= 1) return prescription;
      const before = prescription.setScheme.length;
      const after = before - 1;
      const next = {
        ...prescription,
        setScheme: prescription.setScheme.slice(0, after).map((set) => ({ ...set })),
      };
      changedSetCounts.push({ prescriptionId: prescription.id, before, after });
      const reasonCode: CoachReasonCode = input.energy === "low"
        ? "readiness-low-energy"
        : "readiness-high-soreness";
      decisions.push(changeDecision(reasonCode, {
        type: "set-count",
        prescriptionId: prescription.id,
        before,
        after,
      }));
      return next;
    });
    const recoveryReason: CoachReasonCode = input.energy === "low"
      ? "readiness-low-energy"
      : "readiness-high-soreness";
    appliedReasonCodes.push(recoveryReason);

    prescriptions = prescriptions.map((prescription) => {
      changedEffortPrescriptionIds.push(prescription.id);
      decisions.push(changeDecision("readiness-effort-reduced", {
        type: "effort",
        prescriptionId: prescription.id,
      }));
      return { ...prescription, targetEffort: reduceEffort(prescription.targetEffort) };
    });
    appliedReasonCodes.push("readiness-effort-reduced");
  }

  const uniqueReasons = [...new Set(appliedReasonCodes)];
  const reasonCode: CoachReasonCode = blockedPrescriptionIds.length
    ? "pain-blocks-movement"
    : removedPrescriptionIds.length
      ? "session-time-shortened"
      : input.energy === "low"
        ? "readiness-low-energy"
        : input.soreness === "high"
          ? "readiness-high-soreness"
          : "no-adjustment-needed";

  const value: ReadinessAdjustment = {
    prescriptions,
    removedPrescriptionIds,
    blockedPrescriptionIds,
    changedSetCounts,
    changedEffortPrescriptionIds,
    substitutions: [],
    allowStart,
    appliedReasonCodes: uniqueReasons,
    decisions,
  };
  return {
    value,
    reasonCode,
    explanation: explainReason(reasonCode),
    confidence: blockedPrescriptionIds.length || recoveryPoor || removedPrescriptionIds.length ? "high" : "medium",
    evidence: [
      { key: "energy", value: input.energy },
      { key: "soreness", value: input.soreness },
      { key: "availableMinutes", value: input.availableMinutes },
      { key: "baseEstimatedMinutes", value: estimateMinutes(base) },
      { key: "adjustedEstimatedMinutes", value: estimateMinutes(prescriptions) },
    ],
  };
};
