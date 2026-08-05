import { useCallback } from "react";
import { useAppState } from "./state.js";
import type { PlanRecommendation } from "./features/coach/contracts.js";
import type { ProgramId, TrainingProgram, UserProfile } from "./types.js";

const runtimeProgramFromRecommendation = (
  recommendation: PlanRecommendation,
  id: ProgramId,
): TrainingProgram => ({
  ...recommendation.program,
  id,
  name: `${recommendation.program.name} · Coach`,
  shortName: "Coach",
  recommendedDays: [...recommendation.program.recommendedDays],
  workouts: recommendation.program.workouts.map((workout) => ({
    ...workout,
    exercises: workout.exercises.map((prescription) => prescription.exerciseId),
  })),
  custom: true,
});

export function useGuidedAppState() {
  const base = useAppState();

  const completeOnboarding = useCallback((
    profile: UserProfile,
    recommendation?: PlanRecommendation,
  ) => {
    const completedProfile = { ...profile, onboardingComplete: true };
    base.completeOnboarding(completedProfile);
    if (!recommendation) return;

    const isVariant = recommendation.substitutions.length > 0
      || recommendation.removedPrescriptionIds.length > 0
      || recommendation.invalidPrescriptionIds.length > 0;

    if (isVariant) {
      const programId = `custom:coach-${recommendation.canonicalProgramId}` as ProgramId;
      const program = runtimeProgramFromRecommendation(recommendation, programId);
      base.addCustomProgram(program);
      base.switchProgram(programId, { keepSchedule: false, resetCycle: true });
      return;
    }

    base.updateSettings({
      programId: recommendation.canonicalProgramId,
      weeklyGoal: recommendation.program.daysPerWeek,
      trainingDays: [...recommendation.program.recommendedDays],
    });
  }, [base]);

  return {
    ...base,
    completeOnboarding,
  };
}
