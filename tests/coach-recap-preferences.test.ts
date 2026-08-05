import test from "node:test";
import assert from "node:assert/strict";
import { applyPreferenceSignal } from "../src/features/coach/preferences.js";
import { buildWorkoutRecap } from "../src/features/coach/recap.js";
import type { ExerciseEntry, Session } from "../src/types.js";

const entry = (completedSets = 3, plannedSets = 3): ExerciseEntry => ({
  exerciseId: "db_bench",
  snapshot: {
    id: "db_bench",
    name: "Dumbbell Bench Press",
    primary: "Ngực",
    secondary: ["Vai", "Tay sau"],
    equipment: "Tạ đơn + ghế",
    suffix: "reps",
    incrementKg: 2,
    trackingMode: "weight-reps",
    movementPattern: "horizontal-push",
  },
  target: {
    sets: plannedSets,
    min: 8,
    max: 12,
    rest: 120,
    targetRpe: 8,
    prescriptionId: "FB-A:db-bench:0",
    targetEffort: { mode: "simple", repsInReserve: 2 },
    progression: { type: "double-progression", incrementKg: 2 },
  },
  sets: Array.from({ length: completedSets }, (_, index) => ({
    id: `set-${index}`,
    kind: "working" as const,
    weight: "20",
    reps: "12",
    rpe: "8",
    done: true,
  })),
  loggedSets: Array.from({ length: completedSets }, (_, index) => ({
    id: `set-${index}`,
    kind: "working" as const,
    trackingMode: "weight-reps" as const,
    weightKg: 20,
    reps: 12,
    effort: { mode: "rir" as const, value: 2 },
    done: true,
  })),
  note: "",
});

const session = (exercise = entry()): Session => ({
  id: "session-current",
  programId: "full-body-3",
  programSnapshot: {
    id: "full-body-3",
    name: "Full Body 3 buổi",
    version: 4,
    dayId: "FB-A",
    workoutName: "Full Body A",
  },
  dayId: "FB-A",
  startedAt: "2026-08-05T12:00:00.000Z",
  endedAt: "2026-08-05T13:00:00.000Z",
  totalSets: exercise.sets.length,
  avgRpe: 8,
  exercises: [exercise],
  note: "",
  weeklyGoalAtCompletion: 3,
  feedback: { energy: 4, soreness: 2, note: "Ổn" },
});

test("one temporary substitution does not create a permanent preference", () => {
  const next = applyPreferenceSignal([], {
    type: "temporary-substitution",
    exerciseId: "db_bench",
  });
  assert.deepEqual(next, []);
});

test("always-use substitution stores an explicit preferred signal", () => {
  const next = applyPreferenceSignal([], {
    type: "always-use",
    exerciseId: "machine_press",
    reason: "comfort",
    at: "2026-08-05T14:00:00.000Z",
  });
  assert.equal(next[0].status, "preferred");
  assert.equal(next[0].reason, "comfort");
});

test("avoid signal replaces an earlier preference for the same exercise", () => {
  const next = applyPreferenceSignal([
    {
      exerciseId: "barbell_bench",
      status: "preferred",
      reason: "comfort",
      updatedAt: "2026-08-01T10:00:00.000Z",
    },
  ], {
    type: "avoid",
    exerciseId: "barbell_bench",
    reason: "pain",
    at: "2026-08-05T14:00:00.000Z",
  });
  assert.equal(next.length, 1);
  assert.equal(next[0].status, "avoid");
  assert.equal(next[0].reason, "pain");
});

test("neutral signal removes the stored preference", () => {
  const next = applyPreferenceSignal([
    {
      exerciseId: "db_bench",
      status: "avoid",
      reason: "availability",
      updatedAt: "2026-08-01T10:00:00.000Z",
    },
  ], {
    type: "neutral",
    exerciseId: "db_bench",
    at: "2026-08-05T14:00:00.000Z",
  });
  assert.deepEqual(next, []);
});

test("recap answers what went well, what needs attention, and what changes next", () => {
  const recap = buildWorkoutRecap({ session: session(), historyBefore: [], readiness: null });
  assert.ok(recap.wentWell.length > 0);
  assert.ok(Array.isArray(recap.attention));
  assert.ok(recap.nextTime.length > 0);
  assert.ok(recap.exerciseDecisions.length > 0);
});

test("recap does not praise raw volume when planned work was incomplete", () => {
  const recap = buildWorkoutRecap({ session: session(entry(1, 3)), historyBefore: [], readiness: null });
  assert.ok(!recap.wentWell.some((item) => item.reasonCode === "high-volume-only"));
  assert.ok(recap.attention.some((item) => item.reasonCode === "recap-primary-work-incomplete"));
});

test("low recovery feedback appears in attention instead of progression praise", () => {
  const tired = { ...session(), feedback: { energy: 1 as const, soreness: 5 as const, note: "Rất mệt" } };
  const recap = buildWorkoutRecap({ session: tired, historyBefore: [], readiness: null });
  assert.ok(recap.attention.some((item) => item.reasonCode === "recap-recovery-attention"));
});
