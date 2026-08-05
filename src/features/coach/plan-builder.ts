import {
  BUILT_IN_EXERCISES,
  BUILT_IN_PROGRAM_ORDER,
  BUILT_IN_PROGRAMS,
  defaultProgression,
} from "../../data.js";
import type {
  Exercise,
  ExercisePrescription,
} from "../../types.js";
import type {
  CoachDecision,
  CoachProgram,
  CoachReasonCode,
  PlanBuilderInput,
  PlanRecommendation,
  SubstitutionRecord,
} from "./contracts.js";
import { explainReason } from "./explanations.js";
import { findSafeSubstitution, isExerciseAvailable } from "./substitution.js";

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

const cloneProgram = (program: (typeof BUILT_IN_PROGRAMS)[keyof typeof BUILT_IN_PROGRAMS]): CoachProgram => ({
  ...program,
  recommendedDays: [...program.recommendedDays],
  workouts: program.workouts.map((workout) => ({
    ...workout,
    exercises: workout.exercises.map(clonePrescription),
  })),
});

const scoreProgram = (
  program: (typeof BUILT_IN_PROGRAMS)[keyof typeof BUILT_IN_PROGRAMS],
  input: PlanBuilderInput,
) => {
  let score = 0;
  if (program.daysPerWeek === input.availableDays) score += 100;
  if (input.experience === "beginner" && program.id === "full-body-3") score += 30;
  if (input.experience === "intermediate" && program.id === "upper-lower-4") score += 20;
  if (input.experience === "advanced" && program.id === "ppl-6") score += 20;
  if (input.sessionMinutes < 60 && program.daysPerWeek > 4) score -= 40;
  if (input.goal === "strength" && program.id === "upper-lower-4") score += 10;
  if (input.goal === "hypertrophy" && program.id === "upper-lower-4" && input.availableDays >= 4) score += 5;
  return score;
};

const substitutedPrescription = (
  prescription: ExercisePrescription,
  replacement: Exercise,
): ExercisePrescription => ({
  ...clonePrescription(prescription),
  exerciseId: replacement.id,
  progression: defaultProgression(replacement),
  coachingCue: replacement.technique,
});

type ResolvedProgram = {
  program: CoachProgram;
  substitutions: SubstitutionRecord[];
  removedPrescriptionIds: string[];
  invalidPrescriptionIds: string[];
};

const resolveProgram = (
  source: (typeof BUILT_IN_PROGRAMS)[keyof typeof BUILT_IN_PROGRAMS],
  input: PlanBuilderInput,
): ResolvedProgram => {
  const substitutions: SubstitutionRecord[] = [];
  const removedPrescriptionIds: string[] = [];
  const invalidPrescriptionIds: string[] = [];
  const program = cloneProgram(source);

  program.workouts = program.workouts.map((workout) => ({
    ...workout,
    exercises: workout.exercises.flatMap((prescription): ExercisePrescription[] => {
      const original = BUILT_IN_EXERCISES[prescription.exerciseId];
      if (!original) {
        invalidPrescriptionIds.push(prescription.id);
        return [];
      }
      const restricted = input.restrictions.some((restriction) =>
        original.movementPattern && restriction.affectedPatterns.includes(original.movementPattern));
      if (isExerciseAvailable(original, input.equipment) && !restricted) {
        return [clonePrescription(prescription)];
      }

      const decision = findSafeSubstitution({
        exerciseId: prescription.exerciseId,
        equipment: input.equipment,
        restrictions: input.restrictions,
        exercises: BUILT_IN_EXERCISES,
      });
      if (decision.value && decision.value.id !== prescription.exerciseId) {
        substitutions.push({
          prescriptionId: prescription.id,
          fromExerciseId: prescription.exerciseId,
          toExerciseId: decision.value.id,
          reasonCode: decision.reasonCode,
          explanation: decision.explanation,
        });
        return [substitutedPrescription(prescription, decision.value)];
      }

      if (prescription.optional || prescription.priority === "accessory") {
        removedPrescriptionIds.push(prescription.id);
        return [];
      }
      invalidPrescriptionIds.push(prescription.id);
      return [];
    }),
  }));

  if (input.preferredDays.length === program.daysPerWeek) {
    program.recommendedDays = [...input.preferredDays];
    program.scheduleLabel = input.preferredDays.join(" · ");
  }

  return { program, substitutions, removedPrescriptionIds, invalidPrescriptionIds };
};

const estimatedDuration = (program: CoachProgram) => {
  const workoutMinutes = program.workouts.map((workout) => {
    const seconds = workout.exercises.reduce((sum, prescription) =>
      sum + prescription.setScheme.length * (prescription.restSeconds + 45), 0);
    return Math.max(10, Math.round(seconds / 60));
  });
  return workoutMinutes.length
    ? Math.max(...workoutMinutes)
    : 0;
};

const stimulusLabel = (program: CoachProgram): PlanRecommendation["stimulusLabel"] => {
  if (program.daysPerWeek >= 6) return "cao";
  if (program.daysPerWeek >= 4) return "cân bằng";
  return "cơ bản";
};

const scheduleReason = (days: number): CoachReasonCode => {
  if (days === 3) return "schedule-prefers-three-days";
  if (days === 4) return "schedule-prefers-four-days";
  if (days === 6) return "schedule-prefers-six-days";
  return "plan-recommended";
};

const decision = (reasonCode: CoachReasonCode, value: string): CoachDecision<string> => ({
  value,
  reasonCode,
  explanation: explainReason(reasonCode),
  confidence: "high",
  evidence: [],
});

export const buildPlanRecommendation = (
  input: PlanBuilderInput,
): CoachDecision<PlanRecommendation> => {
  const ranked = BUILT_IN_PROGRAM_ORDER
    .map((programId) => ({
      program: BUILT_IN_PROGRAMS[programId],
      score: scoreProgram(BUILT_IN_PROGRAMS[programId], input),
    }))
    .sort((a, b) => b.score - a.score);

  const selected = ranked[0]?.program ?? BUILT_IN_PROGRAMS["full-body-3"];
  let resolved = resolveProgram(selected, input);
  let usedSafeDefault = false;
  if (resolved.invalidPrescriptionIds.length > 0 && selected.id !== "full-body-3") {
    resolved = resolveProgram(BUILT_IN_PROGRAMS["full-body-3"], input);
    usedSafeDefault = true;
  }

  const warnings = [
    ...resolved.invalidPrescriptionIds.map(() => explainReason("primary-pattern-unavailable")),
  ];
  const decisions: CoachDecision<string>[] = [
    decision(scheduleReason(resolved.program.daysPerWeek), resolved.program.id),
    decision("plan-equipment-safe", resolved.program.id),
    ...resolved.substitutions.map((item) => decision(item.reasonCode, item.toExerciseId)),
    ...resolved.removedPrescriptionIds.map((id) => decision("equipment-prescription-removed", id)),
  ];
  if (usedSafeDefault) decisions.unshift(decision("safe-default-plan", resolved.program.id));

  const reasonCode = usedSafeDefault
    ? "safe-default-plan"
    : scheduleReason(resolved.program.daysPerWeek);
  const value: PlanRecommendation = {
    program: resolved.program,
    canonicalProgramId: resolved.program.id,
    substitutions: resolved.substitutions,
    removedPrescriptionIds: resolved.removedPrescriptionIds,
    invalidPrescriptionIds: resolved.invalidPrescriptionIds,
    estimatedDurationMinutes: estimatedDuration(resolved.program),
    stimulusLabel: stimulusLabel(resolved.program),
    warnings,
    decisions,
  };

  return {
    value,
    reasonCode,
    explanation: explainReason(reasonCode),
    confidence: resolved.invalidPrescriptionIds.length ? "low" : "high",
    evidence: [
      { key: "availableDays", value: input.availableDays },
      { key: "experience", value: input.experience },
      { key: "sessionMinutes", value: input.sessionMinutes },
      { key: "equipmentCount", value: input.equipment.length },
      { key: "selectedProgram", value: resolved.program.id },
    ],
  };
};
