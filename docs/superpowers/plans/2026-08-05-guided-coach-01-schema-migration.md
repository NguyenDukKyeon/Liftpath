# Guided Coach 01 — Schema v4 and Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the v3 exercise-ID program model with prescription-based schema v4 while preserving every existing user record and active workout.

**Architecture:** Stable exercise metadata remains separate from session-specific prescriptions. Storage normalization becomes an explicit versioned migration pipeline; historical sessions retain immutable snapshots and malformed records produce warnings instead of resetting the whole state.

**Tech Stack:** React 19, TypeScript 5.8, Vite 8, Node 22 `node:test`, browser `localStorage`.

## Global Constraints

- Branch: `agent/liftpath-4-guided-coach`; never write implementation directly to `main`.
- `AppState.schemaVersion` must become exactly `4`.
- A v3 backup must preserve visible history totals, custom exercises, custom programs, settings, body stats, and an active draft.
- Built-in and generated plans must never silently fall back to unavailable equipment.
- Every automatic future coach decision must support a visible explanation and confidence level.
- Do not add hosted accounts, social features, nutrition, AI-generated plans, or native integrations.
- Keep the app buildable and v3-compatible after every task.

---

## File Map

- Modify `src/types.ts`: public v4 data contracts and compatibility aliases.
- Modify `src/data.ts`: structured exercise metadata and prescription-based built-in programs.
- Create `src/domain/migrations/v3-to-v4.ts`: pure v3 conversion functions.
- Modify `src/domain/storage.ts`: version dispatch, validation, migration warnings, new storage key.
- Modify `src/domain/training.ts`: logged-set helpers that understand tracking modes.
- Modify `src/state.ts`: consume prescriptions when creating drafts without changing UI behavior yet.
- Create `tests/fixtures/v3-state.ts`: representative v3 state and active draft.
- Create `tests/schema-v4.test.ts`: schema and built-in program invariants.
- Create `tests/migration-v4.test.ts`: migration preservation and malformed-record isolation.
- Modify `tests/domain.test.ts`: update shared v4 fixtures while retaining existing behavioral assertions.

### Task 1: Define schema v4 contracts

**Files:**
- Modify: `src/types.ts`
- Create: `tests/schema-v4.test.ts`

**Interfaces:**
- Produces: `TrackingMode`, `MovementPattern`, `EffortTarget`, `ProgressionStrategy`, `SetPrescription`, `ExercisePrescription`, `LoggedSet`, `MigrationWarning`, and `AppState` with `schemaVersion: 4`.
- Consumes: existing `ExerciseId`, `EquipmentId`, `MuscleGroup`, `SetKind`, and snapshot types.

- [ ] **Step 1: Write a failing schema-shape test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import type { ExercisePrescription, LoggedSet } from "../src/types.js";

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
```

- [ ] **Step 2: Run the test and confirm type compilation fails**

Run: `npm run test`

Expected: TypeScript errors for missing `ExercisePrescription` and `LoggedSet` exports.

- [ ] **Step 3: Add the exact v4 unions and records**

```ts
export type TrackingMode =
  | "weight-reps"
  | "bodyweight-reps"
  | "assisted-reps"
  | "weighted-bodyweight-reps"
  | "duration"
  | "distance";

export type MovementPattern =
  | "squat" | "hinge" | "horizontal-push" | "vertical-push"
  | "horizontal-pull" | "vertical-pull" | "lunge"
  | "isolation" | "carry" | "core";

export type EffortTarget =
  | { mode: "rir"; value: number }
  | { mode: "rpe"; value: number }
  | { mode: "simple"; repsInReserve: number };

export type ProgressionStrategy =
  | { type: "double-progression"; incrementKg: number }
  | { type: "linear-load"; incrementKg: number }
  | { type: "rep-progression"; repStep: number }
  | { type: "duration-progression"; secondsStep: number }
  | { type: "manual" };

export type SetPrescription = {
  kind: SetKind;
  targetReps?: { min: number; max: number };
  targetSeconds?: { min: number; max: number };
  targetDistanceMeters?: { min: number; max: number };
};

export type ExercisePrescription = {
  id: string;
  exerciseId: ExerciseId;
  order: number;
  setScheme: SetPrescription[];
  restSeconds: number;
  targetEffort: EffortTarget;
  progression: ProgressionStrategy;
  coachingCue?: string;
  optional: boolean;
  priority: "primary" | "secondary" | "accessory";
  supersetGroup?: string;
};
```

Define `LoggedSet` as a discriminated union with shared `id`, `kind`, `effort`, and `done`, then tracking-specific numeric fields. Add `trackingMode`, `movementPattern`, `unilateral`, and `contraindicationTags` to `Exercise`. Change `WorkoutDay.exercises` to `ExercisePrescription[]`. Add `migrationWarnings: MigrationWarning[]` to `AppState`.

- [ ] **Step 4: Run type check and schema test**

Run: `npm run lint && npm run test`

Expected: existing source now fails only where it still assumes v3 fields; the new schema test compiles.

- [ ] **Step 5: Commit the contract boundary**

```bash
git add src/types.ts tests/schema-v4.test.ts
git commit -m "feat: define Guided Coach schema v4 contracts"
```

### Task 2: Convert built-in exercise metadata and programs

**Files:**
- Modify: `src/data.ts`
- Modify: `tests/schema-v4.test.ts`

**Interfaces:**
- Consumes: `ExercisePrescription`, `TrackingMode`, `MovementPattern`, and `ProgressionStrategy` from Task 1.
- Produces: `makePrescription(exerciseId, options)`, prescription-based `BUILT_IN_PROGRAMS`, and invariant-safe exercise alternatives.

- [ ] **Step 1: Add failing invariants for every built-in program**

```ts
test("every built-in workout has ordered unique prescriptions", () => {
  for (const program of Object.values(BUILT_IN_PROGRAMS)) {
    for (const workout of program.workouts) {
      assert.deepEqual(workout.exercises.map((item) => item.order), workout.exercises.map((_, index) => index));
      assert.equal(new Set(workout.exercises.map((item) => item.id)).size, workout.exercises.length);
      assert.ok(workout.exercises.every((item) => item.setScheme.length > 0));
    }
  }
});

test("exercise alternatives use compatible progression families", () => {
  for (const exercise of Object.values(BUILT_IN_EXERCISES)) {
    for (const alternativeId of exercise.alternatives) {
      assert.ok(BUILT_IN_EXERCISES[alternativeId], `${exercise.id} references ${alternativeId}`);
    }
  }
});
```

- [ ] **Step 2: Run tests and verify they fail against ID arrays**

Run: `npm run test`

Expected: access to `order`, `id`, and `setScheme` fails.

- [ ] **Step 3: Add an explicit prescription factory**

```ts
const makePrescription = (
  workoutId: string,
  exerciseId: ExerciseId,
  order: number,
  options: Partial<Omit<ExercisePrescription, "id" | "exerciseId" | "order">> = {},
): ExercisePrescription => {
  const meta = BUILT_IN_EXERCISES[exerciseId];
  const setScheme = Array.from({ length: meta.sets }, () => ({
    kind: "working" as const,
    targetReps: meta.trackingMode === "duration" ? undefined : { min: meta.min, max: meta.max },
    targetSeconds: meta.trackingMode === "duration" ? { min: meta.min, max: meta.max } : undefined,
  }));
  return {
    id: `${workoutId}:${exerciseId}:${order}`,
    exerciseId,
    order,
    setScheme,
    restSeconds: meta.rest,
    targetEffort: { mode: "simple", repsInReserve: 2 },
    progression: defaultProgression(meta),
    optional: order >= 5,
    priority: order < 2 ? "primary" : order < 5 ? "secondary" : "accessory",
    ...options,
  };
};
```

Assign movement patterns and tracking modes explicitly to all built-ins. Split `pull_up` into separate assisted/bodyweight variants if one ID cannot represent both modes safely. Use `manual` progression for unsupported custom modes.

- [ ] **Step 4: Convert built-in workout arrays**

Replace arrays such as:

```ts
exercises: ["back_squat", "db_bench", "lat_pulldown"]
```

with:

```ts
exercises: [
  makePrescription("FB-A", "back_squat", 0, { progression: { type: "linear-load", incrementKg: 5 } }),
  makePrescription("FB-A", "db_bench", 1),
  makePrescription("FB-A", "lat_pulldown", 2),
]
```

- [ ] **Step 5: Run schema tests**

Run: `npm run lint && npm run test`

Expected: built-in schema invariants pass; source failures are limited to v3 consumers.

- [ ] **Step 6: Commit built-in prescriptions**

```bash
git add src/data.ts tests/schema-v4.test.ts
git commit -m "feat: model built-in programs with prescriptions"
```

### Task 3: Implement pure v3-to-v4 migration

**Files:**
- Create: `src/domain/migrations/v3-to-v4.ts`
- Create: `tests/fixtures/v3-state.ts`
- Create: `tests/migration-v4.test.ts`

**Interfaces:**
- Produces: `migrateV3ToV4(input: unknown): { state: AppState; warnings: MigrationWarning[] }`.
- Consumes: v4 defaults and lookup helpers from `src/data.ts`; does not access `localStorage` or React state.

- [ ] **Step 1: Create a representative v3 fixture**

The fixture must include one completed session, one active draft, one custom exercise, one custom program, body stats, changed settings, and a sync token. Export both the raw state and expected aggregate totals.

```ts
export const expectedV3Totals = {
  historySessions: 1,
  completedSets: 3,
  bodyStats: 1,
  customExercises: 1,
  customPrograms: 1,
};
```

- [ ] **Step 2: Write failing migration preservation tests**

```ts
test("migrates a complete v3 state without losing user-visible records", () => {
  const { state, warnings } = migrateV3ToV4(v3StateFixture);
  assert.equal(state.schemaVersion, 4);
  assert.equal(state.history.length, expectedV3Totals.historySessions);
  assert.equal(state.history[0].exercises[0].sets.filter((set) => set.done).length, expectedV3Totals.completedSets);
  assert.equal(state.bodyStats.length, expectedV3Totals.bodyStats);
  assert.equal(state.customExercises.length, expectedV3Totals.customExercises);
  assert.equal(state.customPrograms.length, expectedV3Totals.customPrograms);
  assert.ok(state.draft);
  assert.equal(warnings.length, 0);
});

test("isolates malformed records and emits warnings", () => {
  const { state, warnings } = migrateV3ToV4({ ...v3StateFixture, history: [null, v3StateFixture.history[0]] });
  assert.equal(state.history.length, 1);
  assert.ok(warnings.some((warning) => warning.code === "history-record-dropped"));
});
```

- [ ] **Step 3: Run tests and confirm missing migration module**

Run: `npm run test`

Expected: module-not-found failure.

- [ ] **Step 4: Implement conversion helpers**

Implement pure functions:

```ts
export const migrateV3Set = (raw: unknown, mode: TrackingMode): LoggedSet | null => { /* explicit conversion */ };
export const migrateV3Entry = (raw: unknown): ExerciseEntry | null => { /* snapshot + target snapshot */ };
export const migrateV3Program = (raw: unknown): TrainingProgram | null => { /* IDs -> prescriptions */ };
export const migrateV3ToV4 = (input: unknown) => { /* complete state */ };
```

Map legacy suffixes as follows: `seconds -> duration`, bodyweight exercises with zero increment -> `bodyweight-reps`, otherwise `weight-reps`. Preserve the old target snapshot inside each migrated entry. Never include the local bearer token in migrated backup/sync payloads.

- [ ] **Step 5: Run migration tests**

Run: `npm run lint && npm run test`

Expected: migration tests pass with zero warnings for the valid fixture and one targeted warning for the malformed fixture.

- [ ] **Step 6: Commit migration module and fixture**

```bash
git add src/domain/migrations/v3-to-v4.ts tests/fixtures/v3-state.ts tests/migration-v4.test.ts
git commit -m "feat: migrate LiftPath state from schema v3 to v4"
```

### Task 4: Wire storage normalization and compatibility keys

**Files:**
- Modify: `src/domain/storage.ts`
- Modify: `tests/migration-v4.test.ts`
- Modify: `tests/domain.test.ts`

**Interfaces:**
- Produces: `CURRENT_SCHEMA_VERSION = 4`, `STORAGE_KEY = "liftpath-personal-v4"`, `normalizeState(input): AppState`, and `loadState()` that checks v4 then v3 keys.
- Consumes: `migrateV3ToV4` from Task 3.

- [ ] **Step 1: Add failing storage dispatch tests**

```ts
test("normalization dispatches explicit v3 input through the migration", () => {
  const state = normalizeState({ ...v3StateFixture, schemaVersion: 3 });
  assert.equal(state.schemaVersion, 4);
  assert.ok(state.migrationWarnings.length === 0);
});

test("an already normalized v4 state is idempotent", () => {
  const first = normalizeState(v3StateFixture);
  const second = normalizeState(first);
  assert.deepEqual(second, first);
});
```

- [ ] **Step 2: Run tests and verify version mismatch**

Run: `npm run test`

Expected: current storage returns schema version 3.

- [ ] **Step 3: Replace monolithic legacy normalization with version dispatch**

```ts
export const STORAGE_KEY = "liftpath-personal-v4";
export const LEGACY_KEYS = ["liftpath-personal-v3", "liftpath-personal-v2", "liftpath-min-v1"];
export const CURRENT_SCHEMA_VERSION = 4 as const;

export const normalizeState = (input: unknown): AppState => {
  if (isV4State(input)) return normalizeV4State(input);
  const migrated = migrateV3ToV4(input);
  return { ...migrated.state, migrationWarnings: migrated.warnings };
};
```

Keep backup/sync sanitization and update envelopes to schema version 4.

- [ ] **Step 4: Update legacy domain fixtures**

Change old `ExerciseEntry` fixtures to v4 `LoggedSet` values and assert existing streak, PR, and token behavior still passes.

- [ ] **Step 5: Run full current checks**

Run: `npm run check`

Expected: storage and domain tests pass; remaining compile errors identify `state.ts` and UI consumers that still require Task 5 adaptation.

- [ ] **Step 6: Commit storage dispatch**

```bash
git add src/domain/storage.ts tests/migration-v4.test.ts tests/domain.test.ts
git commit -m "feat: activate schema v4 storage normalization"
```

### Task 5: Adapt draft creation and training helpers without changing UX

**Files:**
- Modify: `src/domain/training.ts`
- Modify: `src/state.ts`
- Modify: `tests/domain.test.ts`
- Modify: `tests/schema-v4.test.ts`

**Interfaces:**
- Produces: `makeDraftEntry(prescription, exercise, history)`, mode-safe `isCompletableSet`, `setVolume`, and `sessionVolume`.
- Consumes: `ExercisePrescription` and `LoggedSet` contracts from Task 1.

- [ ] **Step 1: Write failing mode-safe set tests**

```ts
test("effort is optional when completing a weight-reps set", () => {
  assert.equal(isCompletableSet({
    id: "1", kind: "working", trackingMode: "weight-reps",
    weightKg: 20, reps: 10, effort: null, done: false,
  }), true);
});

test("duration sets require positive seconds and do not require weight", () => {
  assert.equal(isCompletableSet({
    id: "2", kind: "working", trackingMode: "duration",
    seconds: 30, effort: null, done: false,
  }), true);
});
```

- [ ] **Step 2: Run tests and confirm v3 field assumptions fail**

Run: `npm run test`

Expected: helpers expect string `reps` and mandatory `rpe`.

- [ ] **Step 3: Implement discriminated helper switches**

```ts
export const isCompletableSet = (set: LoggedSet) => {
  switch (set.trackingMode) {
    case "weight-reps": return set.weightKg >= 0 && set.reps > 0;
    case "bodyweight-reps": return set.reps > 0;
    case "weighted-bodyweight-reps": return set.addedWeightKg >= 0 && set.reps > 0;
    case "assisted-reps": return set.assistanceKg >= 0 && set.reps > 0;
    case "duration": return set.seconds > 0;
    case "distance": return set.meters > 0;
  }
};
```

Only calculate tonnage where the tracking mode makes it meaningful. Keep PR calculations unavailable for unsupported modes rather than returning misleading zeroes.

- [ ] **Step 4: Build draft entries from prescriptions**

Move all set-count, rep-range, rest, and strategy selection out of `startWorkout`. `startWorkout` must resolve the selected workout, pass each prescription to `makeDraftEntry`, and preserve prescription snapshots.

- [ ] **Step 5: Run full check**

Run: `npm run check`

Expected: type check, domain tests, migration tests, and production build pass with the existing visible UI.

- [ ] **Step 6: Commit the compatibility adaptation**

```bash
git add src/domain/training.ts src/state.ts tests/domain.test.ts tests/schema-v4.test.ts
git commit -m "refactor: create workout drafts from v4 prescriptions"
```

## Milestone Verification

Run:

```bash
npm ci
npm run check
```

Expected:

- Schema version is 4.
- Valid v3 fixture migrates with no record loss.
- Malformed records are isolated and reported.
- Existing visible application flow still builds.
- No generated built-in prescription references missing exercise metadata.
- Git diff contains no UI redesign yet.
