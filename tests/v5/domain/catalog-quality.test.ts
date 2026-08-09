import assert from "node:assert/strict";
import test from "node:test";
import { validateExerciseCatalog } from "../../../src/v5/domain/exercises/catalog.js";
import { EXERCISE_CATALOG_VERSION } from "../../../src/v5/domain/exercises/catalog-version.js";
import { EXERCISE_CATALOG } from "../../../src/v5/domain/exercises/catalog-seed.js";
import type { ExerciseMetadata, MuscleId } from "../../../src/v5/domain/exercises/exercise.js";
import { createInitialPrescription } from "../../../src/v5/domain/programming/prescription-engine.js";
import type { TrainingProfile } from "../../../src/v5/domain/programming/profile.js";
import {
  PHYSIQUE_SPECIALIZATIONS,
  STRENGTH_SPECIALIZATIONS,
  type SpecializationId,
} from "../../../src/v5/domain/programming/specializations.js";
import type { StructureProposal } from "../../../src/v5/domain/programming/structure-proposals.js";

const MUSCLES: readonly MuscleId[] = [
  "lats",
  "side_delts",
  "rear_delts",
  "upper_back",
  "upper_chest",
  "chest",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core",
];

const FULL_GYM = [
  "barbell",
  "rack",
  "bench",
  "dumbbell",
  "cable",
  "machine",
  "bodyweight",
  "pull-up-bar",
  "ez-bar",
  "trap-bar",
] as const;

const FOUR_DAY_STRUCTURE: StructureProposal = {
  id: "upper-lower-4",
  name: "Upper / Lower x2",
  daysPerWeek: 4,
  rationale: "Catalog quality reference structure.",
  tradeoffs: [],
  sessionKeys: ["upper-a", "lower-a", "upper-b", "lower-b"],
  score: 0,
};

function profile(goal: TrainingProfile["goal"], specialization: SpecializationId): TrainingProfile {
  return {
    id: `catalog-${goal}-${specialization}`,
    createdAt: "2026-08-10T00:00:00.000Z",
    updatedAt: "2026-08-10T00:00:00.000Z",
    revision: 1,
    level: "intermediate",
    goal,
    primarySpecialization: specialization,
    constraints: {
      daysPerWeek: 4,
      sessionMinutes: 60,
      equipment: [...FULL_GYM],
      dislikedExerciseIds: [],
      restrictedMovementPatterns: [],
    },
  };
}

test("production exercise catalog is versioned, deterministic, unique, and bounded", () => {
  assert.equal(EXERCISE_CATALOG_VERSION, "1.0.0");
  assert.ok(EXERCISE_CATALOG.length >= 100);
  assert.ok(EXERCISE_CATALOG.length <= 200);
  assert.doesNotThrow(() => validateExerciseCatalog(EXERCISE_CATALOG));

  const ids = EXERCISE_CATALOG.map((exercise: ExerciseMetadata) => exercise.id);
  assert.deepEqual(ids, [...ids].sort((left, right) => left.localeCompare(right)));
  assert.equal(new Set(ids).size, ids.length);

  const names = EXERCISE_CATALOG.map((exercise: ExerciseMetadata) =>
    exercise.name.trim().toLocaleLowerCase("en-US"),
  );
  assert.equal(new Set(names).size, names.length);
});

test("production catalog covers every training muscle and common equipment family", () => {
  for (const muscle of MUSCLES) {
    const coverage = EXERCISE_CATALOG.filter((exercise: ExerciseMetadata) =>
      exercise.primaryMuscles.includes(muscle) || exercise.secondaryMuscles.includes(muscle),
    );
    assert.ok(coverage.length >= 3, `${muscle} needs at least three catalog exercises`);
  }

  for (const equipment of ["barbell", "dumbbell", "cable", "machine"] as const) {
    assert.ok(
      EXERCISE_CATALOG.some((exercise: ExerciseMetadata) => exercise.equipment.includes(equipment)),
      `${equipment} must be represented`,
    );
  }
  assert.ok(EXERCISE_CATALOG.some((exercise: ExerciseMetadata) => exercise.kind === "bodyweight"));
});

test("every V1 physique and strength specialization can generate from the production catalog", () => {
  const catalogIds = new Set(EXERCISE_CATALOG.map((exercise: ExerciseMetadata) => exercise.id));
  const scenarios: ReadonlyArray<readonly [TrainingProfile["goal"], SpecializationId]> = [
    ...PHYSIQUE_SPECIALIZATIONS.map((specialization) => ["hypertrophy", specialization] as const),
    ...STRENGTH_SPECIALIZATIONS.map((specialization) => ["strength", specialization] as const),
  ];

  for (const [goal, specialization] of scenarios) {
    const proposal = createInitialPrescription({
      profile: profile(goal, specialization),
      structure: FOUR_DAY_STRUCTURE,
      catalog: [...EXERCISE_CATALOG],
    });
    const exercises = proposal.sessions.flatMap((session) => session.exercises);
    assert.ok(exercises.length > 0, `${goal}/${specialization} must generate exercises`);
    assert.ok(
      exercises.every((exercise) => catalogIds.has(exercise.exerciseId)),
      `${goal}/${specialization} must reference catalog ids only`,
    );
  }
});
