import { useCallback, useState } from "react";
import { useAppState } from "./state.js";
import type {
  CoachDecision,
  PlanRecommendation,
  ReadinessAdjustment,
  ReadinessInput,
} from "./features/coach/contracts.js";
import {
  createDraftAfterReadiness,
  prepareWorkoutFromState,
  type PreparedWorkout,
} from "./features/workout/preparation.js";
import type { DayId, ProgramId, TrainingProgram, UserProfile } from "./types.js";

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
  const [preparedWorkout, setPreparedWorkout] = useState<PreparedWorkout | null>(null);

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

  const prepareWorkout = useCallback((dayId: DayId) => {
    const prepared = prepareWorkoutFromState(base.state, dayId);
    if (prepared) setPreparedWorkout(prepared);
  }, [base.state]);

  const cancelPreparedWorkout = useCallback(() => setPreparedWorkout(null), []);

  const confirmReadiness = useCallback((
    input: ReadinessInput,
  ): CoachDecision<ReadinessAdjustment> | null => {
    if (!preparedWorkout) return null;
    const result = createDraftAfterReadiness(base.state, preparedWorkout, input);
    if (!result.draft) return result.adjustment;
    base.replaceState({
      ...base.state,
      draft: result.draft,
      lastRecap: null,
    });
    setPreparedWorkout(null);
    return result.adjustment;
  }, [base, preparedWorkout]);

  return {
    ...base,
    completeOnboarding,
    preparedWorkout,
    prepareWorkout,
    startWorkout: prepareWorkout,
    confirmReadiness,
    cancelPreparedWorkout,
  };
}
