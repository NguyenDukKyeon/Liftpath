export type CalibrationDecision =
  | { type: "keep" }
  | { type: "increase"; multiplier: 1.05 }
  | { type: "decrease"; multiplier: 0.9 };

export function evaluateCalibration(input: {
  reps: number;
  targetMinReps: number;
  targetMaxReps: number;
  rir: number;
  targetRir: number;
}): CalibrationDecision {
  if (input.reps >= input.targetMaxReps && input.rir >= input.targetRir + 3) {
    return { type: "increase", multiplier: 1.05 };
  }

  if (input.reps < input.targetMinReps && input.rir === 0) {
    return { type: "decrease", multiplier: 0.9 };
  }

  return { type: "keep" };
}
