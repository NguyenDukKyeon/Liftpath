export const PRIMARY_GOALS = ["hypertrophy", "strength", "general_fitness"] as const;
export type PrimaryGoal = (typeof PRIMARY_GOALS)[number];

export const TRAINING_LEVELS = ["beginner", "intermediate"] as const;
export type TrainingLevel = (typeof TRAINING_LEVELS)[number];

export function isPrimaryGoal(value: string): value is PrimaryGoal {
  return (PRIMARY_GOALS as readonly string[]).includes(value);
}

export function isTrainingLevel(value: string): value is TrainingLevel {
  return (TRAINING_LEVELS as readonly string[]).includes(value);
}
