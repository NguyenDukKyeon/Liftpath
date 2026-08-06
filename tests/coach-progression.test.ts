import test from "node:test";
import assert from "node:assert/strict";
import { recommendProgression, type ProgressionExposure, type ProgressionInput } from "../src/features/coach/progression.js";
import type { LoggedSet, ProgressionStrategy, TrackingMode } from "../src/types.js";

const weightSets = (reps: number[], rir: number[], weightKg = 20): LoggedSet[] => reps.map((value, index) => ({
  id: `set-${index}`,
  kind: "working",
  trackingMode: "weight-reps",
  weightKg,
  reps: value,
  effort: { mode: "rir", value: rir[index] ?? 2 },
  done: true,
}));

const exposure = (sets: LoggedSet[], daysAgo = 3): ProgressionExposure => ({
  completedAt: new Date(Date.UTC(2026, 7, 5 - daysAgo)).toISOString(),
  sets,
});

const input = (
  strategy: ProgressionStrategy,
  trackingMode: TrackingMode,
  recentExposures: ProgressionExposure[],
  overrides: Partial<ProgressionInput> = {},
): ProgressionInput => ({
  exerciseId: "db_bench",
  strategy,
  trackingMode,
  target: { min: 8, max: 12 },
  recentExposures,
  interruptionDays: 3,
  painConcern: null,
  availableIncrementKg: 2,
  ...overrides,
});

test("double progression adds load only when every working set reaches the top of range", () => {
  const result = recommendProgression(input(
    { type: "double-progression", incrementKg: 2 },
    "weight-reps",
    [exposure(weightSets([12, 12, 12], [2, 2, 2]))],
  ));
  assert.equal(result.value.action, "increase-load");
  assert.equal(result.value.targetLoadKg, 22);
  assert.equal(result.reasonCode, "progression-top-range-complete");
});

test("double progression holds load while reps are still accumulating", () => {
  const result = recommendProgression(input(
    { type: "double-progression", incrementKg: 2 },
    "weight-reps",
    [exposure(weightSets([12, 11, 10], [2, 2, 2]))],
  ));
  assert.equal(result.value.action, "hold-load");
  assert.equal(result.reasonCode, "progression-reps-still-building");
});

test("pain evidence blocks automatic load increase", () => {
  const result = recommendProgression(input(
    { type: "double-progression", incrementKg: 2 },
    "weight-reps",
    [exposure(weightSets([12, 12, 12], [2, 2, 2]))],
    {
      painConcern: {
        bodyArea: "shoulder",
        severity: "sharp",
        affectedPatterns: ["horizontal-push"],
      },
    },
  ));
  assert.equal(result.value.action, "manual-review");
  assert.equal(result.reasonCode, "pain-blocks-progression");
});

test("one poor session does not trigger a load reduction", () => {
  const result = recommendProgression(input(
    { type: "double-progression", incrementKg: 2 },
    "weight-reps",
    [exposure(weightSets([7, 7, 6], [0, 0, 0]))],
  ));
  assert.notEqual(result.value.action, "reduce-load");
  assert.equal(result.reasonCode, "progression-poor-session-observe");
});

test("two consecutive below-range high-effort exposures may reduce load", () => {
  const result = recommendProgression(input(
    { type: "double-progression", incrementKg: 2 },
    "weight-reps",
    [
      exposure(weightSets([7, 6, 6], [0, 0, 0], 20), 2),
      exposure(weightSets([7, 7, 6], [0, 0, 0], 20), 5),
    ],
  ));
  assert.equal(result.value.action, "reduce-load");
  assert.equal(result.value.targetLoadKg, 18);
  assert.equal(result.reasonCode, "progression-repeated-below-range");
});

test("an interruption of 21 days prevents an automatic increase", () => {
  const result = recommendProgression(input(
    { type: "linear-load", incrementKg: 2 },
    "weight-reps",
    [exposure(weightSets([8, 8, 8], [2, 2, 2], 20), 24)],
    { interruptionDays: 24 },
  ));
  assert.equal(result.value.action, "hold-load");
  assert.equal(result.value.targetLoadKg, 20);
  assert.equal(result.reasonCode, "progression-interruption-guard");
  assert.equal(result.confidence, "low");
});

test("rep progression raises the rep target after successful bodyweight work", () => {
  const sets: LoggedSet[] = [8, 8, 8].map((reps, index) => ({
    id: `bw-${index}`,
    kind: "working",
    trackingMode: "bodyweight-reps",
    reps,
    effort: { mode: "rir", value: 2 },
    done: true,
  }));
  const result = recommendProgression(input(
    { type: "rep-progression", repStep: 1 },
    "bodyweight-reps",
    [exposure(sets)],
    { target: { min: 6, max: 8 } },
  ));
  assert.equal(result.value.action, "increase-reps");
  assert.equal(result.value.targetReps, 9);
});

test("duration progression raises seconds after every working set reaches target", () => {
  const sets: LoggedSet[] = [30, 30, 30].map((seconds, index) => ({
    id: `duration-${index}`,
    kind: "working",
    trackingMode: "duration",
    seconds,
    effort: null,
    done: true,
  }));
  const result = recommendProgression(input(
    { type: "duration-progression", secondsStep: 5 },
    "duration",
    [exposure(sets)],
    { target: { min: 20, max: 30 } },
  ));
  assert.equal(result.value.action, "increase-duration");
  assert.equal(result.value.targetSeconds, 35);
});

test("manual strategy never invents an automatic adjustment", () => {
  const result = recommendProgression(input(
    { type: "manual" },
    "weight-reps",
    [exposure(weightSets([12, 12, 12], [2, 2, 2]))],
  ));
  assert.equal(result.value.action, "manual-review");
  assert.equal(result.reasonCode, "progression-manual-strategy");
});
