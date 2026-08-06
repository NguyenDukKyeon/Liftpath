import test from "node:test";
import assert from "node:assert/strict";
import { calculatePlateLoading } from "../src/features/coach/plates.js";
import { calculateWarmupSets } from "../src/features/coach/warmup.js";

test("compound warm-up approaches the working load without duplicating it", () => {
  const sets = calculateWarmupSets({
    workingWeightKg: 100,
    movementPattern: "squat",
    barWeightKg: 20,
    trackingMode: "weight-reps",
  });
  assert.deepEqual(sets.map((set) => set.weightKg), [20, 50, 70, 85]);
  assert.deepEqual(sets.map((set) => set.reps), [8, 5, 3, 2]);
  assert.ok(sets.every((set) => set.weightKg < 100));
});

test("isolation exercises receive at most one optional warm-up set", () => {
  const sets = calculateWarmupSets({
    workingWeightKg: 20,
    movementPattern: "isolation",
    barWeightKg: 0,
    trackingMode: "weight-reps",
  });
  assert.ok(sets.length <= 1);
  assert.equal(sets[0]?.optional, true);
});

test("non weight-reps tracking modes do not receive load warm-ups", () => {
  const sets = calculateWarmupSets({
    workingWeightKg: 0,
    movementPattern: "core",
    barWeightKg: 0,
    trackingMode: "duration",
  });
  assert.deepEqual(sets, []);
});

test("duplicate rounded warm-up loads are removed", () => {
  const sets = calculateWarmupSets({
    workingWeightKg: 25,
    movementPattern: "horizontal-push",
    barWeightKg: 20,
    trackingMode: "weight-reps",
    loadIncrementKg: 2.5,
  });
  assert.equal(new Set(sets.map((set) => set.weightKg)).size, sets.length);
  assert.ok(sets.every((set) => set.weightKg < 25));
});

test("plate calculator returns exact per-side plates", () => {
  const result = calculatePlateLoading({
    targetKg: 100,
    barKg: 20,
    availablePairsKg: [20, 15, 10, 5, 2.5, 1.25],
  });
  assert.deepEqual(result.perSideKg, [20, 15, 5]);
  assert.equal(result.actualKg, 100);
  assert.equal(result.exact, true);
});

test("unreachable loads return nearest lower and higher options", () => {
  const result = calculatePlateLoading({
    targetKg: 73,
    barKg: 20,
    availablePairsKg: [20, 10, 5, 2.5, 1.25],
  });
  assert.equal(result.exact, false);
  assert.ok(result.lowerKg <= 73);
  assert.ok(result.higherKg >= 73);
  assert.ok(result.lowerKg < result.higherKg);
});

test("plate calculator never claims a target below the bar is reachable", () => {
  const result = calculatePlateLoading({
    targetKg: 15,
    barKg: 20,
    availablePairsKg: [5, 2.5, 1.25],
  });
  assert.equal(result.exact, false);
  assert.equal(result.actualKg, 20);
  assert.equal(result.higherKg, 20);
});
