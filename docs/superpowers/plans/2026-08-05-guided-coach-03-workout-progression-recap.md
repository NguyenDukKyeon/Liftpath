# Guided Coach 03 — Workout Guidance, Progression, and Recap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each gym set fast and self-explanatory, then use mode-safe strategy rules to decide what changes next time.

**Architecture:** Workout UI is decomposed into focused feature components. Progression, warm-up, plates, preference signals, and recap are pure coach modules; state actions apply explicit user choices and retain immutable evidence snapshots.

**Tech Stack:** React 19, TypeScript 5.8, Vite 8, Node 22 `node:test`, browser Wake Lock/Notifications already present.

## Global Constraints

- Requires completion of plans 01 and 02.
- A normal working set must be completable without mandatory RPE/RIR input.
- Previous corresponding set is visible inline and can be copied with one action.
- Every automatic load, rep, set-count, exercise, or effort decision has a reason code, explanation, confidence, and evidence.
- One poor session is insufficient to classify a plateau.
- Warm-up sets are excluded from progression, PR, and weekly working-set metrics.
- Pain-blocked movements cannot receive automatic progression.
- Raw volume is secondary to beginner-friendly coaching outcomes.

---

## File Map

- Create `src/features/coach/progression.ts`: strategy-specific next-session decisions.
- Create `src/features/coach/warmup.ts`: warm-up set calculator.
- Create `src/features/coach/plates.ts`: plate loading calculator.
- Create `src/features/coach/recap.ts`: post-workout coaching summary.
- Create `src/features/coach/preferences.ts`: explicit preference signal updates.
- Create `src/features/workout/WorkoutScreen.tsx`: composed feature screen.
- Create `src/features/workout/SetTable.tsx`: tracking-mode set rows and inline previous values.
- Create `src/features/workout/ExerciseCoachCard.tsx`: current prescription and explanation.
- Create `src/features/workout/WarmupCalculator.tsx`.
- Create `src/features/workout/PlateCalculator.tsx`.
- Create `src/features/workout/ExercisePicker.tsx`: equipment-safe substitution and add flow.
- Create `src/features/workout/WorkoutRecap.tsx`.
- Modify `src/components/Workout.tsx`: compatibility re-export.
- Modify `src/state.ts`: add/reorder/remove exercises, copy previous, complete mode-safe sets, save preferences, and produce recap.
- Modify `src/domain/training.ts`: preserve legacy analytics while delegating progression.
- Modify `src/components/Screens.tsx`: render richer recap and progress summaries.
- Modify `src/styles.css`: gym-floor layout and 44px touch targets.
- Create `tests/coach-progression.test.ts`.
- Create `tests/coach-warmup-plates.test.ts`.
- Create `tests/coach-recap-preferences.test.ts`.

### Task 1: Implement strategy-specific progression decisions

**Files:**
- Create: `src/features/coach/progression.ts`
- Create: `tests/coach-progression.test.ts`
- Modify: `src/domain/training.ts`

**Interfaces:**
- Produces: `recommendProgression(input): CoachDecision<ProgressionResult>`.
- Consumes: prescription strategy, tracking mode, recent completed entries, interruption days, readiness/pain evidence, and available increment.

- [ ] **Step 1: Write failing double-progression tests**

```ts
test("double progression adds load only when every working set reaches the top of range", () => {
  const result = recommendProgression(doubleProgressionInput({ reps: [12, 12, 12], rir: [2, 2, 2] }));
  assert.equal(result.value.action, "increase-load");
  assert.equal(result.value.targetLoadKg, 22);
  assert.equal(result.reasonCode, "progression-top-range-complete");
});

test("double progression holds load while reps are still accumulating", () => {
  const result = recommendProgression(doubleProgressionInput({ reps: [12, 11, 10], rir: [2, 2, 2] }));
  assert.equal(result.value.action, "hold-load");
  assert.equal(result.reasonCode, "progression-reps-still-building");
});
```

- [ ] **Step 2: Add failing safety and evidence tests**

```ts
test("pain evidence blocks automatic load increase", () => {
  const result = recommendProgression({ ...topRangeInput, painConcern: activeShoulderPain });
  assert.equal(result.value.action, "manual-review");
  assert.equal(result.reasonCode, "pain-blocks-progression");
});

test("one poor session does not trigger a load reduction", () => {
  const result = recommendProgression(onePoorSessionInput);
  assert.notEqual(result.value.action, "reduce-load");
});
```

- [ ] **Step 3: Run tests and verify module missing**

Run: `npm run test`

Expected: missing progression module.

- [ ] **Step 4: Implement the decision pipeline**

Decision order:

1. Return `manual-review` for active pain concerns.
2. Return low-confidence `hold` when fewer than one valid prior exposure exists.
3. Apply strategy-specific rules.
4. Apply interruption guard: after 21+ inactive days, cap at previous working load and lower confidence.
5. Require two consecutive below-range/high-effort exposures before automatic reduction.
6. Round load to the configured increment.

Implement exhaustive switches for:

```ts
switch (strategy.type) {
  case "double-progression":
  case "linear-load":
  case "rep-progression":
  case "duration-progression":
  case "manual":
}
```

- [ ] **Step 5: Replace legacy `progressionRecommendation` internals**

Keep the old export temporarily as an adapter that maps `CoachDecision<ProgressionResult>` into the legacy display type. New feature UI must call `recommendProgression` directly.

- [ ] **Step 6: Run tests and commit**

Run: `npm run lint && npm run test`

```bash
git add src/features/coach/progression.ts src/domain/training.ts tests/coach-progression.test.ts
git commit -m "feat: add strategy-specific progression coaching"
```

### Task 2: Add warm-up and plate calculators

**Files:**
- Create: `src/features/coach/warmup.ts`
- Create: `src/features/coach/plates.ts`
- Create: `tests/coach-warmup-plates.test.ts`

**Interfaces:**
- Produces: `calculateWarmupSets(input): WarmupSet[]` and `calculatePlateLoading(input): PlateLoadingResult`.
- Consumes: target working load, tracking mode, bar weight, available plate pairs, and exercise movement pattern.

- [ ] **Step 1: Write failing warm-up tests**

```ts
test("compound warm-up approaches the working load without duplicating it", () => {
  const sets = calculateWarmupSets({ workingWeightKg: 100, movementPattern: "squat", barWeightKg: 20 });
  assert.deepEqual(sets.map((set) => set.weightKg), [20, 50, 70, 85]);
  assert.ok(sets.every((set) => set.weightKg < 100));
});

test("isolation exercises receive at most one optional warm-up set", () => {
  const sets = calculateWarmupSets({ workingWeightKg: 20, movementPattern: "isolation", barWeightKg: 0 });
  assert.ok(sets.length <= 1);
});
```

- [ ] **Step 2: Write failing plate tests**

```ts
test("plate calculator returns per-side plates", () => {
  const result = calculatePlateLoading({ targetKg: 100, barKg: 20, availablePairsKg: [20, 15, 10, 5, 2.5, 1.25] });
  assert.deepEqual(result.perSideKg, [20, 15, 10, 5]);
  assert.equal(result.actualKg, 100);
});

test("unreachable loads return nearest lower and higher options", () => {
  const result = calculatePlateLoading({ targetKg: 73, barKg: 20, availablePairsKg: [20, 10, 5, 2.5, 1.25] });
  assert.ok(result.lowerKg <= 73);
  assert.ok(result.higherKg >= 73);
});
```

- [ ] **Step 3: Run tests and verify failure**

Run: `npm run test`

Expected: missing modules.

- [ ] **Step 4: Implement deterministic calculators**

Warm-up percentages for compound weight-reps movements: bar/empty implement, 50%, 70%, and 85%, with reps decreasing from 8 to 2. Remove duplicate rounded loads. Plate loading must treat every plate value as a pair and never claim an unavailable exact target.

- [ ] **Step 5: Run tests and commit**

Run: `npm run lint && npm run test`

```bash
git add src/features/coach/warmup.ts src/features/coach/plates.ts tests/coach-warmup-plates.test.ts
git commit -m "feat: add warm-up and plate calculators"
```

### Task 3: Build inline, tracking-mode set logging

**Files:**
- Create: `src/features/workout/SetTable.tsx`
- Create: `src/features/workout/ExerciseCoachCard.tsx`
- Create: `src/features/workout/WarmupCalculator.tsx`
- Create: `src/features/workout/PlateCalculator.tsx`
- Modify: `src/state.ts`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: `SetTable` that accepts `entry`, `previousEntry`, `updateSet`, `completeSet`, `undoSet`, and `copyPreviousSet`.
- Consumes: discriminated `LoggedSet`, progression decision, and calculator modules.

- [ ] **Step 1: Add state action for previous corresponding set**

```ts
copyPreviousSet(exerciseIndex: number, setIndex: number): void
```

Copy only tracking-compatible fields from the previous session’s same set index; if absent, use its final completed working set. Never copy `done`, `id`, or pain/effort evidence.

- [ ] **Step 2: Render the exact table hierarchy**

For `weight-reps`:

```text
Set | Trước | Kg | Reps | Gắng sức | Done
```

For other tracking modes, replace only the metric columns. The previous value must be a button that copies the value and has an explicit accessible label.

- [ ] **Step 3: Make effort optional**

Completion enablement calls `isCompletableSet(set)` only. Effort input is nullable and labelled as optional. In simple mode, show `Còn khoảng 2 reps` rather than the term RPE.

- [ ] **Step 4: Add quick load controls**

Render `- increment` and `+ increment` controls for compatible exercises. Update numeric values without string parsing in the component.

- [ ] **Step 5: Add calculator sheets**

Warm-up calculator may insert proposed warm-up sets after confirmation. Plate calculator is read-only and shows each side, actual load, and nearest alternatives.

- [ ] **Step 6: Verify keyboard and mobile behavior**

Manual run: `npm run dev`

Check 360px width, numeric keyboard hints, focus order, 44px primary actions, and no bottom-nav overlap.

- [ ] **Step 7: Commit set logging components**

Run: `npm run check`

```bash
git add src/features/workout/SetTable.tsx src/features/workout/ExerciseCoachCard.tsx src/features/workout/WarmupCalculator.tsx src/features/workout/PlateCalculator.tsx src/state.ts src/styles.css
git commit -m "feat: make Guided Coach set logging fast and mode-safe"
```

### Task 4: Support live workout editing and explicit preference signals

**Files:**
- Create: `src/features/coach/preferences.ts`
- Create: `src/features/workout/ExercisePicker.tsx`
- Modify: `src/state.ts`
- Modify: `src/types.ts`
- Create: `tests/coach-recap-preferences.test.ts`

**Interfaces:**
- Produces state actions: `addExerciseToDraft`, `removeExerciseFromDraft`, `moveExerciseInDraft`, `replaceExerciseInDraft`, and `saveExercisePreference`.
- Consumes equipment-safe substitution search and explicit preference types.

- [ ] **Step 1: Define explicit preferences**

```ts
export type ExercisePreference = {
  exerciseId: ExerciseId;
  status: "preferred" | "neutral" | "avoid";
  reason?: "equipment" | "comfort" | "pain" | "availability" | "other";
  updatedAt: string;
};
```

- [ ] **Step 2: Write failing preference tests**

```ts
test("one temporary substitution does not create a permanent preference", () => {
  const next = applyPreferenceSignal([], { type: "temporary-substitution", exerciseId: "db_bench" });
  assert.deepEqual(next, []);
});

test("always-use substitution stores an explicit preferred signal", () => {
  const next = applyPreferenceSignal([], { type: "always-use", exerciseId: "machine_press" });
  assert.equal(next[0].status, "preferred");
});
```

- [ ] **Step 3: Implement immutable draft editing actions**

Moving or removing an exercise changes only the active draft. Replacement preserves the original prescription’s priority/rest/effort where compatible and records `replacedExerciseId` plus the substitution reason.

- [ ] **Step 4: Build equipment-safe picker**

Search by Vietnamese/English alias, filter by movement, muscle, and available equipment, hide avoided exercises by default, and mark incompatible entries disabled with a reason.

- [ ] **Step 5: Run tests and commit**

Run: `npm run lint && npm run test && npm run build`

```bash
git add src/features/coach/preferences.ts src/features/workout/ExercisePicker.tsx src/state.ts src/types.ts tests/coach-recap-preferences.test.ts
git commit -m "feat: add live workout editing and preference signals"
```

### Task 5: Compose the Guided Coach workout screen

**Files:**
- Create: `src/features/workout/WorkoutScreen.tsx`
- Modify: `src/components/Workout.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: `WorkoutScreen({ app, timer })` using the focused components from Tasks 3 and 4.
- Consumes: current draft, progression decision, previous entry, Wake Lock, timer, and state actions.

- [ ] **Step 1: Create the one-current-task hierarchy**

Order:

1. Current exercise and set progress.
2. Suggested next action and explanation.
3. Set table with inline previous values.
4. One concise technique cue.
5. Rest timer.
6. Secondary editing/calculator actions.

- [ ] **Step 2: Remove hidden previous-performance disclosure**

Do not render the old `<details>` block. Previous values exist only inline and in an optional history sheet.

- [ ] **Step 3: Render coach confidence without overstating certainty**

Use labels `Đề xuất chắc chắn`, `Đề xuất`, and `Cần thêm dữ liệu`; do not expose raw `low/medium/high` without explanation.

- [ ] **Step 4: Preserve cancellation, timer, notification, vibration, and Wake Lock behavior**

Existing non-coaching functionality must remain available and must not block logging if browser APIs fail.

- [ ] **Step 5: Replace compatibility component**

```ts
export { WorkoutScreen } from "../features/workout/WorkoutScreen.js";
```

- [ ] **Step 6: Run full check and commit**

Run: `npm run check`

```bash
git add src/features/workout/WorkoutScreen.tsx src/components/Workout.tsx src/styles.css
git commit -m "feat: compose the Guided Coach workout experience"
```

### Task 6: Generate a three-question post-workout recap

**Files:**
- Create: `src/features/coach/recap.ts`
- Create: `src/features/workout/WorkoutRecap.tsx`
- Modify: `src/state.ts`
- Modify: `src/components/Screens.tsx`
- Modify: `tests/coach-recap-preferences.test.ts`

**Interfaces:**
- Produces: `buildWorkoutRecap(input): WorkoutCoachRecap` containing `wentWell`, `attention`, `nextTime`, PRs, and per-exercise decisions.
- Consumes: completed session, prior history, readiness snapshot, prescription targets, pain notes, and progression engine.

- [ ] **Step 1: Write failing recap tests**

```ts
test("recap answers what went well, what needs attention, and what changes next", () => {
  const recap = buildWorkoutRecap(successfulSessionInput);
  assert.ok(recap.wentWell.length > 0);
  assert.ok(Array.isArray(recap.attention));
  assert.ok(recap.nextTime.length > 0);
});

test("recap does not praise raw volume when planned work was incomplete", () => {
  const recap = buildWorkoutRecap(incompleteHighVolumeInput);
  assert.ok(!recap.wentWell.some((item) => item.reasonCode === "high-volume-only"));
});
```

- [ ] **Step 2: Implement recap priority**

`wentWell`: plan adherence, technique/effort compliance, progression-ready exercises, PRs. `attention`: pain, repeated below-range sets, skipped primary work, recovery problems. `nextTime`: exact load/rep/effort/substitution decisions for the next exposure.

- [ ] **Step 3: Persist immutable recap evidence**

Save the recap generated at workout completion. Do not recompute old recap copy from future history changes.

- [ ] **Step 4: Build recap screen**

Show the three questions first. Put duration, sets, and volume in a secondary details section. Render every next-time adjustment with its explanation.

- [ ] **Step 5: Run checks and commit**

Run: `npm run check`

```bash
git add src/features/coach/recap.ts src/features/workout/WorkoutRecap.tsx src/state.ts src/components/Screens.tsx tests/coach-recap-preferences.test.ts
git commit -m "feat: add explainable post-workout coaching recap"
```

## Milestone Verification

Run:

```bash
npm ci
npm run check
```

Manual assertions:

- A set can be completed with valid load/reps and blank effort.
- Previous values are visible and copyable inline.
- Bodyweight and duration exercises render appropriate fields.
- A warm-up insertion does not affect progression metrics.
- A pain-marked exercise receives no automatic increase.
- Recap clearly states what went well, what needs attention, and what changes next.
