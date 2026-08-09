import assert from "node:assert/strict";
import test from "node:test";
import { CATALOG_SEED } from "../../../src/v5/domain/exercises/catalog-seed.js";
import { createInitialPrescription } from "../../../src/v5/domain/programming/prescription-engine.js";
import { rankStructureProposals } from "../../../src/v5/domain/programming/structure-proposals.js";

test("strength bench reference uses the shared prescription engine with increased bench exposure", () => {
  const profile = {
    id: "profile-strength-bench",
    createdAt: "2026-08-08T00:00:00.000Z",
    updatedAt: "2026-08-08T00:00:00.000Z",
    revision: 1,
    level: "intermediate",
    goal: "strength",
    primarySpecialization: "bench",
    constraints: {
      daysPerWeek: 4,
      sessionMinutes: 60,
      equipment: ["barbell", "rack", "bench", "dumbbell", "cable", "machine"],
      dislikedExerciseIds: [],
      restrictedMovementPatterns: [],
    },
  } as const;
  const structure = rankStructureProposals(profile)[0];
  const proposal = createInitialPrescription({ profile, structure, catalog: [...CATALOG_SEED] });
  const exerciseIds = proposal.sessions.flatMap((session) => session.exercises.map((exercise) => exercise.exerciseId));

  assert.equal(proposal.structureId, structure.id);
  assert.ok(exerciseIds.filter((id) => id === "barbell-bench-press").length >= 2);
  assert.ok(proposal.workloadByMuscle.chest > proposal.workloadByMuscle.lats);
  assert.ok(proposal.workloadByMuscle.triceps > proposal.workloadByMuscle.biceps);
  assert.equal(proposal.sessions.length, 4);
});
