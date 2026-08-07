# LiftPath 5 Workout Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a complete V5 workout slice that can create a versioned program/session, start and resume an active workout, log sets atomically, calibrate an unknown load, complete a session, and preserve authoritative history without depending on the adaptive Coach.

**Architecture:** Define focused exercise/program/session/set domain records under `src/v5/domain/`, implement workout use cases against repository ports, persist each completed set immediately in IndexedDB, and expose a minimal V5 workout screen through the preview shell. The Coach layer is not required for logging or session completion.

**Tech Stack:** Existing React/TypeScript/Vite stack, native IndexedDB adapters from the foundation plan, Node domain tests, Vitest component tests, Playwright E2E.

## Global Constraints

- A set shown as saved must already be committed to IndexedDB.
- Closing/reloading during an active workout must preserve completed sets.
- Raw workout history is authoritative; edits create revisions rather than erasing historical identity.
- Negative load/reps and invalid RIR are rejected in the domain/application layer, not only HTML inputs.
- Workout logging works when Coach evaluation is unavailable.
- V5 remains isolated from V4 storage.
- Calibration suggestions are user-confirmed execution aids, not silent program-version changes.

---

## File Map

**Create**
- `src/v5/domain/exercises/exercise.ts`
- `src/v5/domain/programming/program.ts`
- `src/v5/domain/training/session.ts`
- `src/v5/domain/training/set.ts`
- `src/v5/domain/training/calibration.ts`
- `src/v5/application/ports/exercise-repository.ts`
- `src/v5/application/ports/program-repository.ts`
- `src/v5/application/ports/session-repository.ts`
- `src/v5/application/workouts/start-workout.ts`
- `src/v5/application/workouts/complete-set.ts`
- `src/v5/application/workouts/resume-workout.ts`
- `src/v5/application/workouts/complete-workout.ts`
- `src/v5/infrastructure/repositories/exercise-repository.ts`
- `src/v5/infrastructure/repositories/program-repository.ts`
- `src/v5/infrastructure/repositories/session-repository.ts`
- `src/v5/presentation/workout/WorkoutMode.tsx`
- `src/v5/presentation/workout/SetLogger.tsx`
- `src/v5/presentation/workout/workout.css`
- `tests/v5/domain/workout.test.ts`
- `tests/v5/application/workout-use-cases.test.ts`
- `tests/components/v5/WorkoutMode.test.tsx`
- `tests/e2e/v5/workout-core.spec.ts`

**Modify**
- `src/v5/app/V5PreviewApp.tsx`
- `src/v5/infrastructure/db/constants.ts`
- `src/v5/infrastructure/db/open-db.ts`
- `src/v5/application/ports/storage.ts`

## Interfaces

```ts
export type ExerciseKind = "resistance" | "bodyweight" | "duration" | "distance";

export interface ExerciseDefinition extends VersionedRecord {
  name: string;
  kind: ExerciseKind;
  equipment: string[];
}

export interface PrescribedSet {
  ordinal: number;
  minReps: number;
  maxReps: number;
  targetRir: number;
  prescribedLoadKg?: number;
}

export interface ProgramExercise {
  exerciseId: EntityId;
  order: number;
  sets: PrescribedSet[];
}

export interface ProgramVersion extends VersionedRecord {
  versionNumber: number;
  name: string;
  sessions: Array<{ key: string; name: string; exercises: ProgramExercise[] }>;
}

export interface TrainingSession extends VersionedRecord {
  programVersionId: EntityId;
  sessionKey: string;
  status: "active" | "completed" | "cancelled";
  startedAt: ISODateTime;
  completedAt?: ISODateTime;
}

export interface CompletedSet extends VersionedRecord {
  sessionId: EntityId;
  exerciseId: EntityId;
  setOrdinal: number;
  loadKg?: number;
  reps?: number;
  rir?: number;
  completedAt: ISODateTime;
}
```

### Task 1: Exercise, program, session, and set invariants

**Files:**
- Create: domain files listed above.
- Test: `tests/v5/domain/workout.test.ts`.

**Interfaces:**
- Produces: `validateCompletedSetInput(input)`.
- Produces: `buildTrainingSession(programVersion, sessionKey, ids, clock)`.

- [ ] **Step 1: Write failing domain tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { validateCompletedSetInput } from "../../../src/v5/domain/training/set.js";

test("completed-set validation rejects impossible values", () => {
  assert.throws(() => validateCompletedSetInput({ loadKg: -2.5, reps: 10, rir: 2 }));
  assert.throws(() => validateCompletedSetInput({ loadKg: 20, reps: -1, rir: 2 }));
  assert.throws(() => validateCompletedSetInput({ loadKg: 20, reps: 10, rir: 11 }));
  assert.doesNotThrow(() => validateCompletedSetInput({ loadKg: 20, reps: 10, rir: 2 }));
});
```

- [ ] **Step 2: Run focused domain test**

Run: `npm run test:domain -- --test-name-pattern="completed-set validation"`

Expected: FAIL because domain files do not exist.

- [ ] **Step 3: Implement records and validation**

Use `assertFiniteNonNegative` for load/reps, require integer reps, and constrain RIR to integer `0..10` when present. `buildTrainingSession` must reject an unknown `sessionKey` and copy only IDs/keys, not embed mutable exercise definitions into the session record.

- [ ] **Step 4: Re-run domain tests**

Run: `npm run test:domain`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/v5/domain/exercises src/v5/domain/programming src/v5/domain/training tests/v5/domain/workout.test.ts
git commit -m "feat(v5): define workout domain records"
```

### Task 2: Workout repository ports and IndexedDB adapters

**Files:**
- Create: repository ports/adapters listed above.
- Modify: DB schema files.
- Test: `tests/e2e/v5/workout-core.spec.ts`.

**Interfaces:**

```ts
export interface SessionRepository {
  create(session: TrainingSession): Promise<void>;
  get(id: EntityId): Promise<TrainingSession | undefined>;
  getActive(): Promise<TrainingSession | undefined>;
  listSets(sessionId: EntityId): Promise<CompletedSet[]>;
}
```

- [ ] **Step 1: Add failing browser repository test**

Seed one active session and two sets, reopen the page/database, and assert `getActive()` returns the same session ID and `listSets()` returns the two stable set IDs.

- [ ] **Step 2: Run focused E2E**

Run: `npx playwright test tests/e2e/v5/workout-core.spec.ts --grep "repository survives reload"`

Expected: FAIL because repositories do not exist.

- [ ] **Step 3: Add required IndexedDB indexes**

For `sessions`, create index `by-status` on `status`. For `sets`, create index `by-session` on `sessionId`. Increment `V5_DB_VERSION` exactly once for this migration and add stores/indexes only in `onupgradeneeded`.

- [ ] **Step 4: Implement repository adapters**

Use stable record IDs and indexed queries. Do not scan all sets to find one session's sets.

- [ ] **Step 5: Re-run repository E2E**

Run: `npx playwright test tests/e2e/v5/workout-core.spec.ts --grep "repository survives reload"`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/v5/application/ports src/v5/infrastructure/db src/v5/infrastructure/repositories tests/e2e/v5/workout-core.spec.ts
git commit -m "feat(v5): persist workout records by repository"
```

### Task 3: Start and resume active workout use cases

**Files:**
- Create: `src/v5/application/workouts/start-workout.ts`
- Create: `src/v5/application/workouts/resume-workout.ts`
- Test: `tests/v5/application/workout-use-cases.test.ts`

**Interfaces:**

```ts
export async function startWorkout(input: {
  programVersion: ProgramVersion;
  sessionKey: string;
  sessions: SessionRepository;
  ids: IdGenerator;
  clock: Clock;
}): Promise<TrainingSession>;

export async function resumeWorkout(sessions: SessionRepository): Promise<{
  session: TrainingSession;
  sets: CompletedSet[];
} | null>;
```

- [ ] **Step 1: Write failing use-case tests with in-memory repository doubles**

Test that `startWorkout` refuses to create a second active session and that `resumeWorkout` returns the current session plus already persisted sets.

- [ ] **Step 2: Run focused tests**

Run: `npm run test:domain -- --test-name-pattern="active workout"`

Expected: FAIL because use cases do not exist.

- [ ] **Step 3: Implement minimal use cases**

`startWorkout` checks `getActive()` first; if one exists, throw `VALIDATION_ERROR` with a message that the active workout must be resumed or cancelled. `resumeWorkout` returns `null` when no active session exists.

- [ ] **Step 4: Run tests**

Run: `npm run test:domain`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/v5/application/workouts tests/v5/application/workout-use-cases.test.ts
git commit -m "feat(v5): start and resume workouts"
```

### Task 4: Atomic set completion

**Files:**
- Create: `src/v5/application/workouts/complete-set.ts`
- Modify: `src/v5/application/ports/session-repository.ts`
- Modify: `src/v5/infrastructure/repositories/session-repository.ts`
- Test: `tests/v5/application/workout-use-cases.test.ts`
- Test: `tests/e2e/v5/workout-core.spec.ts`

**Interfaces:**

```ts
export interface CompleteSetInput {
  sessionId: EntityId;
  exerciseId: EntityId;
  setOrdinal: number;
  loadKg?: number;
  reps?: number;
  rir?: number;
}
```

- [ ] **Step 1: Write failing application test**

Use a repository double that rejects writes and assert `completeSet` rejects rather than returning a success result.

- [ ] **Step 2: Write failing browser test for reload durability**

Complete one set through the V5 use case, reload, then assert the exact set ID/value still exists.

- [ ] **Step 3: Run tests and verify failure**

Run: `npm run test:domain && npx playwright test tests/e2e/v5/workout-core.spec.ts --grep "set survives reload"`

Expected: FAIL because `completeSet` does not exist.

- [ ] **Step 4: Implement atomic completion**

Validate input, verify the session is active, create the `CompletedSet`, and persist it before returning. The application result is the committed record itself; UI must not infer persistence from local component state.

- [ ] **Step 5: Run focused tests**

Run: `npm run test:domain && npx playwright test tests/e2e/v5/workout-core.spec.ts --grep "set survives reload"`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/v5/application/workouts/complete-set.ts src/v5/application/ports/session-repository.ts src/v5/infrastructure/repositories/session-repository.ts tests/v5/application/workout-use-cases.test.ts tests/e2e/v5/workout-core.spec.ts
git commit -m "feat(v5): commit sets atomically"
```

### Task 5: Conservative initial load calibration

**Files:**
- Create: `src/v5/domain/training/calibration.ts`
- Modify: `tests/v5/domain/workout.test.ts`

**Interfaces:**

```ts
export type CalibrationDecision =
  | { type: "keep" }
  | { type: "increase"; multiplier: 1.05 }
  | { type: "decrease"; multiplier: 0.90 };

export function evaluateCalibration(input: {
  reps: number;
  targetMinReps: number;
  targetMaxReps: number;
  rir: number;
  targetRir: number;
}): CalibrationDecision;
```

- [ ] **Step 1: Write failing calibration cases**

Test:
- top of range with RIR at least target+3 -> `increase`;
- below minimum with RIR 0 -> `decrease`;
- inside range near target effort -> `keep`.

- [ ] **Step 2: Run focused domain test**

Run: `npm run test:domain -- --test-name-pattern="calibration"`

Expected: FAIL.

- [ ] **Step 3: Implement only the three explicit rules**

Do not create a generalized adaptive progression engine here. This task is only a bounded within-session calibration helper.

- [ ] **Step 4: Run domain suite**

Run: `npm run test:domain`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/v5/domain/training/calibration.ts tests/v5/domain/workout.test.ts
git commit -m "feat(v5): add conservative load calibration"
```

### Task 6: Minimal Workout Mode UI

**Files:**
- Create: `src/v5/presentation/workout/WorkoutMode.tsx`
- Create: `src/v5/presentation/workout/SetLogger.tsx`
- Create: `src/v5/presentation/workout/workout.css`
- Modify: `src/v5/app/V5PreviewApp.tsx`
- Test: `tests/components/v5/WorkoutMode.test.tsx`

**Interfaces:**
- Consumes: `resumeWorkout`, `completeSet` via injected callbacks/controller props.
- Produces: one dominant `Complete set` action and a committed/saving/error state.

- [ ] **Step 1: Write failing component test**

Render a prescribed set with previous values. Change reps, click `Complete set`, keep the button in `Saving…` while the promise is pending, then display `Set saved` only after the promise resolves.

- [ ] **Step 2: Run focused component test**

Run: `npx vitest run tests/components/v5/WorkoutMode.test.tsx`

Expected: FAIL because UI components do not exist.

- [ ] **Step 3: Implement focused set logger**

Use controlled numeric inputs for load/reps/RIR, prefill prescribed/previous values, disable the primary action while persistence is pending, and surface rejected persistence as `role="alert"` without clearing the entered values.

- [ ] **Step 4: Re-run component test**

Run: `npx vitest run tests/components/v5/WorkoutMode.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/v5/presentation/workout src/v5/app/V5PreviewApp.tsx tests/components/v5/WorkoutMode.test.tsx
git commit -m "feat(v5): add focused workout logging UI"
```

### Task 7: Complete workout and crash-resume E2E

**Files:**
- Create: `src/v5/application/workouts/complete-workout.ts`
- Modify: `src/v5/presentation/workout/WorkoutMode.tsx`
- Modify: `tests/e2e/v5/workout-core.spec.ts`

**Interfaces:**
- Produces: `completeWorkout(sessionId, sessions, clock): Promise<TrainingSession>`.

- [ ] **Step 1: Write failing application test**

Assert completion fails for a non-active session and persists `status="completed"` plus `completedAt` for an active session.

- [ ] **Step 2: Write E2E crash-resume journey**

Start a workout, complete two sets, reload the page, assert the same active session resumes with both sets marked complete, finish remaining sets, complete workout, reload again, and assert no active session is resumed.

- [ ] **Step 3: Run focused tests and verify failure**

Run: `npm run test:domain && npx playwright test tests/e2e/v5/workout-core.spec.ts --grep "resume"`

Expected: FAIL before implementation.

- [ ] **Step 4: Implement completion and resume wiring**

Persist session completion first; only after commit should UI leave Workout Mode. On initial V5 preview load, call `resumeWorkout` before showing a start action.

- [ ] **Step 5: Run full workout slice tests**

Run: `npm run test:domain && npx vitest run tests/components/v5/WorkoutMode.test.tsx && npx playwright test tests/e2e/v5/workout-core.spec.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/v5/application/workouts/complete-workout.ts src/v5/presentation/workout/WorkoutMode.tsx src/v5/app/V5PreviewApp.tsx tests/v5 tests/e2e/v5/workout-core.spec.ts
git commit -m "feat(v5): complete and resume workout sessions"
```

### Task 8: Workout-core verification gate

- [ ] **Step 1: Run `npm run check:fast`**

Expected: exit 0.

- [ ] **Step 2: Run V5 workout E2E**

Run: `npx playwright test tests/e2e/v5/workout-core.spec.ts`

Expected: PASS.

- [ ] **Step 3: Run V4 E2E regression suite**

Run: `npm run test:e2e`

Expected: PASS.

- [ ] **Step 4: Inspect scope and persistence behavior**

Run:

```bash
git diff --stat main...HEAD
git status --short
```

Confirm no existing V4 workout/storage file was repurposed for V5 state.
