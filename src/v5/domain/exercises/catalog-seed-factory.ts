import type { ExerciseMetadata } from "./exercise.js";

const SEEDED_AT = "2026-08-10T00:00:00.000Z";

type SeedRequired = Pick<
  ExerciseMetadata,
  "id" | "name" | "equipment" | "primaryMuscles" | "movementPattern" | "substitutionGroup"
>;

type SeedOptional = Partial<
  Pick<
    ExerciseMetadata,
    | "kind"
    | "secondaryMuscles"
    | "stability"
    | "skillDemand"
    | "fatigueClass"
    | "supportedRepRanges"
  >
>;

export type CatalogSeedInput = SeedRequired & SeedOptional;

export function createCatalogExercise(input: CatalogSeedInput): ExerciseMetadata {
  return {
    id: input.id,
    name: input.name,
    kind: input.kind ?? "resistance",
    equipment: [...input.equipment],
    primaryMuscles: [...input.primaryMuscles],
    secondaryMuscles: [...(input.secondaryMuscles ?? [])],
    movementPattern: input.movementPattern,
    stability: input.stability ?? "medium",
    skillDemand: input.skillDemand ?? "medium",
    fatigueClass: input.fatigueClass ?? "medium",
    supportedRepRanges: (input.supportedRepRanges ?? [{ min: 8, max: 15 }]).map((range) => ({ ...range })),
    substitutionGroup: input.substitutionGroup,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
    revision: 1,
  };
}
