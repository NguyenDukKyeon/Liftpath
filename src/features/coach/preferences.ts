import type {
  ExerciseId,
  ExercisePreference,
  ExercisePreferenceReason,
} from "../../types.js";

export type PreferenceSignal =
  | {
      type: "temporary-substitution";
      exerciseId: ExerciseId;
    }
  | {
      type: "always-use";
      exerciseId: ExerciseId;
      reason?: ExercisePreferenceReason;
      at?: string;
    }
  | {
      type: "avoid";
      exerciseId: ExerciseId;
      reason?: ExercisePreferenceReason;
      at?: string;
    }
  | {
      type: "neutral";
      exerciseId: ExerciseId;
      at?: string;
    };

export const applyPreferenceSignal = (
  current: ExercisePreference[],
  signal: PreferenceSignal,
): ExercisePreference[] => {
  if (signal.type === "temporary-substitution") return current;
  const withoutCurrent = current.filter((item) => item.exerciseId !== signal.exerciseId);
  if (signal.type === "neutral") return withoutCurrent;
  const next: ExercisePreference = {
    exerciseId: signal.exerciseId,
    status: signal.type === "always-use" ? "preferred" : "avoid",
    reason: signal.reason,
    updatedAt: signal.at ?? new Date().toISOString(),
  };
  return [...withoutCurrent, next].sort((a, b) => a.exerciseId.localeCompare(b.exerciseId));
};

export const preferenceFor = (
  preferences: ExercisePreference[],
  exerciseId: ExerciseId,
) => preferences.find((item) => item.exerciseId === exerciseId) ?? null;
