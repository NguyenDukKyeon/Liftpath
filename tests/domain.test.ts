import test from "node:test";
import assert from "node:assert/strict";
import { BUILT_IN_EXERCISES } from "../src/data.js";
import { makeSyncEnvelope, normalizeState } from "../src/domain/storage.js";
import {
  detectPersonalRecords,
  progressionRecommendation,
  weeklyStreak,
} from "../src/domain/training.js";
import type { ExerciseEntry, Session } from "../src/types.js";

const entry = (weight: number, reps: number, rpe: number): ExerciseEntry => ({
  exerciseId: "db_bench",
  snapshot: {
    id: "db_bench",
    name: "Dumbbell Bench Press",
    primary: "Ngực",
    secondary: ["Vai", "Tay sau"],
    equipment: "Tạ đơn",
    suffix: "reps",
    incrementKg: 2,
  },
  target: { sets: 3, min: 8, max: 12, rest: 120, targetRpe: 7 },
  note: "",
  sets: [0, 1, 2].map((index) => ({ id: String(index), kind: "working", weight: String(weight), reps: String(reps), rpe: String(rpe), done: true })),
});

const session = (date: string, goal: number, exercise = entry(20, 12, 7)): Session => ({
  id: date,
  programId: "full-body-3",
  programSnapshot: { id: "full-body-3", name: "Full Body 3 buổi", version: 2, dayId: "FB-A", workoutName: "Full Body A" },
  dayId: "FB-A",
  startedAt: new Date(`${date}T10:00:00`).toISOString(),
  endedAt: new Date(`${date}T11:00:00`).toISOString(),
  totalSets: 3,
  avgRpe: 7,
  exercises: [exercise],
  note: "",
  weeklyGoalAtCompletion: goal,
});

test("migrates legacy A/B/C sessions and snapshots exercise metadata", () => {
  const migrated = normalizeState({
    settings: { programId: "full-body-3", weeklyGoal: 3, trainingDays: [1, 3, 5] },
    history: [{
      id: "legacy",
      dayId: "A",
      startedAt: "2026-01-01T10:00:00.000Z",
      endedAt: "2026-01-01T11:00:00.000Z",
      totalSets: 1,
      avgRpe: 7,
      exercises: [{ exerciseId: "db_bench", note: "", sets: [{ weight: "20", reps: "10", rpe: "7", done: true }] }],
    }],
  });
  assert.equal(migrated.schemaVersion, 4);
  assert.equal(migrated.history[0].dayId, "FB-A");
  assert.equal(migrated.history[0].exercises[0].snapshot.name, "Dumbbell Bench Press");
  assert.equal(migrated.profile.onboardingComplete, true);
});

test("weekly streak keeps historical goal snapshots after goal changes", () => {
  const now = new Date("2026-08-01T12:00:00");
  const history = [
    session("2026-07-13", 3), session("2026-07-15", 3), session("2026-07-17", 3),
    session("2026-07-20", 3), session("2026-07-22", 3), session("2026-07-24", 3),
  ];
  assert.equal(weeklyStreak(history, 6, now), 2);
});

test("progression recommends a small load increase after reaching top reps", () => {
  const history = [session("2026-07-30", 3, entry(20, 12, 7))];
  const recommendation = progressionRecommendation(history, BUILT_IN_EXERCISES.db_bench, 7);
  assert.equal(recommendation.confidence, "high");
  assert.equal(recommendation.weight, 22);
});

test("detects new weight and estimated 1RM records", () => {
  const before = [session("2026-07-20", 3, entry(20, 10, 7))];
  const current = session("2026-07-27", 3, entry(22, 10, 8));
  const records = detectPersonalRecords(current, before);
  assert.ok(records.some((record) => record.type === "weight"));
  assert.ok(records.some((record) => record.type === "estimated-1rm"));
});


test("current partial week does not erase a completed historical streak", () => {
  const now = new Date("2026-08-01T12:00:00");
  const history = [
    session("2026-07-27", 3),
    session("2026-07-20", 3), session("2026-07-22", 3), session("2026-07-24", 3),
  ];
  assert.equal(weeklyStreak(history, 3, now), 1);
});

test("backup and sync envelopes never include the local bearer token", () => {
  const state = normalizeState({ settings: {}, sync: { endpoint: "https://example.test", token: "secret-token" } });
  const envelope = makeSyncEnvelope(state);
  assert.equal(envelope.state.sync.token, "");
});
