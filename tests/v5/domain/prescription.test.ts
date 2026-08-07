import assert from "node:assert/strict";
import test from "node:test";
import { CATALOG_SEED } from "../../../src/v5/domain/exercises/catalog-seed.js";
import { validateExerciseCatalog } from "../../../src/v5/domain/exercises/catalog.js";
import {
  BEGINNER_SPECIALIZATION_SET_CEILING,
  INDIRECT_SET_CREDIT,
  PROGRAMMING_POLICY_VERSION,
  WORKLOAD_BANDS,
} from "../../../src/v5/domain/programming/policy-constants.js";
import { validateTrainingProfileDraft } from "../../../src/v5/domain/programming/profile.js";
import { rankStructureProposals } from "../../../src/v5/domain/programming/structure-proposals.js";

const baseConstraints = {
  daysPerWeek: 4,
  sessionMinutes: 60,
  equipment: ["cable", "dumbbell"],
  dislikedExerciseIds: [],
  restrictedMovementPatterns: [],
} as const;

const referenceProfile = {
  level: "beginner",
  goal: "hypertrophy",
  primarySpecialization: "v_shape",
  constraints: baseConstraints,
} as const;

test("allows one primary and at most one distinct secondary focus", () => {
  assert.doesNotThrow(() =>
    validateTrainingProfileDraft({
      level: "beginner",
      goal: "hypertrophy",
      primarySpecialization: "v_shape",
      secondaryFocus: "arms",
      constraints: baseConstraints,
    }),
  );

  assert.throws(() =>
    validateTrainingProfileDraft({
      level: "beginner",
      goal: "hypertrophy",
      primarySpecialization: "v_shape",
      secondaryFocus: "v_shape",
      constraints: baseConstraints,
    }),
  );
});

test("profile validation rejects unsupported constraints and incompatible specialization goals", () => {
  assert.throws(() =>
    validateTrainingProfileDraft({
      level: "beginner",
      goal: "hypertrophy",
      primarySpecialization: "bench",
      constraints: { ...baseConstraints, equipment: [] },
    }),
  );

  assert.throws(() =>
    validateTrainingProfileDraft({
      level: "beginner",
      goal: "hypertrophy",
      primarySpecialization: "v_shape",
      constraints: { ...baseConstraints, daysPerWeek: 1 as never },
    }),
  );
});

test("catalog seed has unique stable metadata and valid rep ranges", () => {
  assert.doesNotThrow(() => validateExerciseCatalog(CATALOG_SEED));
  assert.equal(new Set(CATALOG_SEED.map((exercise) => exercise.id)).size, CATALOG_SEED.length);
  assert.ok(CATALOG_SEED.every((exercise) => exercise.name.trim().length > 0));
  assert.ok(CATALOG_SEED.every((exercise) => exercise.movementPattern.trim().length > 0));
  assert.ok(CATALOG_SEED.every((exercise) => exercise.primaryMuscles.length > 0));
  assert.ok(CATALOG_SEED.every((exercise) => exercise.substitutionGroup.trim().length > 0));
  assert.ok(
    CATALOG_SEED.every((exercise) =>
      exercise.supportedRepRanges.every(
        (range) => Number.isInteger(range.min) && Number.isInteger(range.max) && range.min > 0 && range.min <= range.max,
      ),
    ),
  );
});

test("policy constants are ordered, finite, versioned, and conservatively bounded for beginners", () => {
  assert.match(PROGRAMMING_POLICY_VERSION, /^\d+\.\d+\.\d+$/);
  assert.ok(INDIRECT_SET_CREDIT >= 0 && INDIRECT_SET_CREDIT <= 1);

  for (const goalBands of Object.values(WORKLOAD_BANDS)) {
    for (const [level, priorityBands] of Object.entries(goalBands)) {
      for (const [priority, band] of Object.entries(priorityBands)) {
        assert.ok(Number.isFinite(band.minDirectEquivalentSets));
        assert.ok(Number.isFinite(band.targetDirectEquivalentSets));
        assert.ok(Number.isFinite(band.maxDirectEquivalentSets));
        assert.ok(band.minDirectEquivalentSets >= 0);
        assert.ok(band.minDirectEquivalentSets <= band.targetDirectEquivalentSets);
        assert.ok(band.targetDirectEquivalentSets <= band.maxDirectEquivalentSets);
        if (level === "beginner" && priority === "specialization") {
          assert.ok(band.maxDirectEquivalentSets <= BEGINNER_SPECIALIZATION_SET_CEILING);
        }
      }
    }
  }
});

test("structure proposals return deterministic 2-3 options within the exact day constraint", () => {
  const first = rankStructureProposals(referenceProfile);
  const second = rankStructureProposals(referenceProfile);

  assert.ok(first.length >= 2 && first.length <= 3);
  assert.deepEqual(first, second);
  assert.ok(first.every((proposal) => proposal.daysPerWeek === 4));
  assert.ok(first.every((proposal) => proposal.sessionKeys.length === 4));
  assert.ok(first.every((proposal) => proposal.rationale.trim().length > 0));
  assert.ok(first.every((proposal) => proposal.tradeoffs.length > 0));
  assert.equal(first.some((proposal) => proposal.daysPerWeek === 5), false);
  for (let index = 1; index < first.length; index += 1) {
    assert.ok(
      first[index - 1].score > first[index].score ||
        (first[index - 1].score === first[index].score && first[index - 1].id < first[index].id),
    );
  }
});
