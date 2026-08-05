import test from "node:test";
import assert from "node:assert/strict";
import { BUILT_IN_EXERCISES, BUILT_IN_PROGRAMS } from "../src/data.js";
import { buildWorkoutEntries } from "../src/domain/planning.js";
import { defaultProfile } from "../src/domain/storage.js";
import { isCompletableSet, makeDraftEntry, setVolume } from "../src/domain/training.js";
import type { EquipmentId, ExercisePrescription, LoggedSet, UserProfile } from "../src/types.js";

const prescription: ExercisePrescription = {
  id: "FB-A:db-bench",
  exerciseId: "db_bench",
  order: 0,
  setScheme: [{ kind: "working", targetReps: { min: 8, max: 12 } }],
  restSeconds: 120,
  targetEffort: { mode: "rir", value: 2 },
  progression: { type: "double-progression", incrementKg: 2 },
  optional: false,
  priority: "primary",
};

const logged: LoggedSet = {
  id: "set-1",
  kind: "working",
  trackingMode: "weight-reps",
  weightKg: 20,
  reps: 10,
  effort: null,
  done: true,
};

test("v4 prescription and logged-set contracts are constructible", () => {
  assert.equal(prescription.progression.type, "double-progression");
  assert.equal(logged.trackingMode, "weight-reps");
});

test("effort is optional when completing a weight-reps set", () => {
  assert.equal(isCompletableSet({
    id: "weight-set",
    kind: "working",
    trackingMode: "weight-reps",
    weightKg: 20,
    reps: 10,
    effort: null,
    done: false,
  }), true);
});

test("duration sets require positive seconds and do not require weight", () => {
  const durationSet: LoggedSet = {
    id: "duration-set",
    kind: "working",
    trackingMode: "duration",
    seconds: 30,
    effort: null,
    done: false,
  };
  assert.equal(isCompletableSet(durationSet), true);
  assert.equal(setVolume({ ...durationSet, done: true }), 0);
});

test("draft entries are created from prescription snapshots", () => {
  const entry = makeDraftEntry(prescription, BUILT_IN_EXERCISES.db_bench, []);
  assert.equal(entry.target.prescriptionId, prescription.id);
  assert.equal(entry.target.rest, prescription.restSeconds);
  assert.equal(entry.loggedSets?.length, prescription.setScheme.length);
  assert.equal(entry.loggedSets?.[0].trackingMode, "weight-reps");
});

test("planner creates equipment-safe draft entries from prescriptions", () => {
  const equipment: EquipmentId[] = ["dumbbell", "bodyweight", "bench"];
  const profile: UserProfile = {
    ...defaultProfile(),
    onboardingComplete: true,
    equipment,
  };
  const planned = buildWorkoutEntries({
    programId: "full-body-3",
    dayId: "FB-A",
    customPrograms: [],
    customExercises: [],
    profile,
    history: [],
    targetRpe: 7,
  });
  assert.ok(planned);
  const allowed = new Set(equipment);
  assert.ok(planned.entries.length > 0);
  assert.ok(planned.entries.every((entry) => {
    const meta = BUILT_IN_EXERCISES[entry.exerciseId];
    return meta.equipmentTags.some((tag) => allowed.has(tag)) || meta.equipmentTags.includes("bodyweight");
  }));
  assert.ok(planned.entries.every((entry) => Boolean(entry.target.prescriptionId)));
});

test("planner drops an unsafe prescription when no valid alternative exists", () => {
  const profile: UserProfile = {
    ...defaultProfile(),
    onboardingComplete: true,
    equipment: ["bodyweight"],
    sessionMinutes: 90,
  };
  const planned = buildWorkoutEntries({
    programId: "upper-lower-4",
    dayId: "UL-L1",
    customPrograms: [],
    customExercises: [],
    profile,
    history: [],
    targetRpe: 7,
  });
  assert.ok(planned);
  assert.ok(planned.entries.every((entry) => BUILT_IN_EXERCISES[entry.exerciseId].equipmentTags.includes("bodyweight")));
});

test("every built-in workout has ordered unique prescriptions", () => {
  for (const program of Object.values(BUILT_IN_PROGRAMS)) {
    for (const workout of program.workouts) {
      assert.deepEqual(
        workout.exercises.map((item) => item.order),
        workout.exercises.map((_, index) => index),
      );
      assert.equal(new Set(workout.exercises.map((item) => item.id)).size, workout.exercises.length);
      assert.ok(workout.exercises.every((item) => item.setScheme.length > 0));
    }
  }
});

test("exercise alternatives reference known exercises", () => {
  for (const exercise of Object.values(BUILT_IN_EXERCISES)) {
    assert.ok(exercise.trackingMode, `${exercise.id} has no tracking mode`);
    assert.ok(exercise.movementPattern, `${exercise.id} has no movement pattern`);
    for (const alternativeId of exercise.alternatives) {
      assert.ok(BUILT_IN_EXERCISES[alternativeId], `${exercise.id} references ${alternativeId}`);
    }
  }
});
