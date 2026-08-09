import type { PrimaryGoal } from "./goals.js";

export const PHYSIQUE_SPECIALIZATIONS = [
  "v_shape",
  "chest",
  "shoulders",
  "arms",
  "back_width",
  "back_thickness",
  "quads",
  "posterior_chain",
] as const;

export const STRENGTH_SPECIALIZATIONS = [
  "bench",
  "squat",
  "deadlift",
  "overhead_press",
] as const;

export type PhysiqueSpecialization = (typeof PHYSIQUE_SPECIALIZATIONS)[number];
export type StrengthSpecialization = (typeof STRENGTH_SPECIALIZATIONS)[number];
export type SpecializationId = PhysiqueSpecialization | StrengthSpecialization;

export function isPhysiqueSpecialization(value: SpecializationId): value is PhysiqueSpecialization {
  return (PHYSIQUE_SPECIALIZATIONS as readonly string[]).includes(value);
}

export function isStrengthSpecialization(value: SpecializationId): value is StrengthSpecialization {
  return (STRENGTH_SPECIALIZATIONS as readonly string[]).includes(value);
}

export function isSpecializationCompatible(goal: PrimaryGoal, specialization: SpecializationId): boolean {
  if (goal === "strength") return isStrengthSpecialization(specialization);
  if (goal === "hypertrophy") return isPhysiqueSpecialization(specialization);
  return isPhysiqueSpecialization(specialization) || isStrengthSpecialization(specialization);
}
