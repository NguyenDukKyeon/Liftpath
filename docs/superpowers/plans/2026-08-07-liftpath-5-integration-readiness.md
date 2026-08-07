# LiftPath 5 Integration Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove integration ambiguity before the final UX slice by providing concrete runtime dependencies/service composition, completing the curated V5 exercise catalog to production breadth, and adding a deterministic rest-timer model derived from committed set timestamps.

**Architecture:** Keep dependency construction at the app edge. Concrete browser adapters implement `Clock`, `IdGenerator`, DB repositories, backup/recovery, workout, program, lifecycle, and Coach services; React consumes a single service bundle instead of constructing infrastructure. Expand exercise metadata as curated data with integrity tests, not scattered UI constants. Rest timing remains a presentation/application helper and never becomes authoritative workout state.

**Tech Stack:** Existing V5 TypeScript/IndexedDB/application stack, React browser runtime, Node catalog tests, Vitest integration tests, Playwright smoke.

## Global Constraints

- Domain modules do not import browser globals.
- Infrastructure depends inward on ports/domain; presentation does not open IndexedDB directly.
- IDs and time are injected into application use cases.
- Exercise catalog target is roughly 100–200 curated common resistance-training movements/variations with complete metadata, not thousands of weak entries.
- Catalog IDs are stable; display-name changes cannot break history.
- Catalog metadata is deterministic/version-controlled data.
- Rest timer derives from committed `CompletedSet.completedAt`; it must not block set persistence or Coach behavior.
- No runtime dependency/backend/account is added.

---

## File Map

**Create**
- `src/v5/infrastructure/common/system-clock.ts`
- `src/v5/infrastructure/common/crypto-id-generator.ts`
- `src/v5/app/v5-services.ts`
- `src/v5/app/create-v5-services.ts`
- `src/v5/application/workouts/rest-timer.ts`
- `src/v5/domain/exercises/catalog-version.ts`
- `src/v5/domain/exercises/catalog-seed-upper.ts`
- `src/v5/domain/exercises/catalog-seed-lower.ts`
- `src/v5/domain/exercises/catalog-seed-accessories.ts`
- `tests/v5/domain/catalog-quality.test.ts`
- `tests/components/v5/V5ServiceComposition.test.tsx`
- `tests/e2e/v5/integration-readiness.spec.ts`

**Modify**
- `src/v5/domain/exercises/catalog-seed.ts`
- `src/v5/domain/exercises/catalog.ts`
- `src/v5/app/V5PreviewApp.tsx`
- `src/v5/presentation/workout/WorkoutMode.tsx`
- `src/v5/presentation/workout/SetLogger.tsx`

## Interfaces

```ts
export interface V5Services {
  clock: Clock;
  ids: IdGenerator;
  workouts: {
    start: typeof startWorkout;
    resume: typeof resumeWorkout;
    completeSet: typeof completeSet;
    completeWorkout: typeof completeWorkout;
    recordReadiness: typeof recordReadiness;
  };
  programs: {
    proposeStructures: typeof proposeStructures;
    buildPreview: typeof buildProgramPreview;
    activate: typeof activateProgram;
    reviewBlock: typeof reviewTrainingBlock;
    proposeGoalTransition: typeof proposeGoalTransition;
    activateGoalTransition: typeof activateGoalTransition;
  };
  coach: {
    evaluateCompletedSession: typeof evaluateCoachForCompletedSession;
    accept: typeof acceptRecommendation;
    modify: typeof modifyRecommendation;
    skip: typeof skipRecommendation;
  };
  backup: {
    exportBackup: typeof exportBackup;
    previewBackup: typeof previewBackup;
    importBackup: typeof importBackup;
  };
}
```

### Task 1: Concrete system clock and stable browser ID generator

**Files:** infrastructure common files + tests.

- [ ] **Step 1: Write failing adapter tests**

Assert `SystemClock.now()` returns an ISO timestamp parseable by `Date.parse`. Assert `CryptoIdGenerator.next("set")` returns strings prefixed `set_` and two sequential calls differ.

- [ ] **Step 2: Run focused test**

Run: `npm run test:domain -- --test-name-pattern="SystemClock|CryptoIdGenerator"`

Expected: FAIL.

- [ ] **Step 3: Implement adapters**

```ts
export class SystemClock implements Clock {
  now(): ISODateTime { return new Date().toISOString(); }
}

export class CryptoIdGenerator implements IdGenerator {
  next(prefix: string): EntityId { return `${prefix}_${crypto.randomUUID()}`; }
}
```

Keep these in infrastructure so domain/application tests continue using fixed doubles.

- [ ] **Step 4: Run tests and commit**

```bash
npm run test:domain
git add src/v5/infrastructure/common tests/v5
git commit -m "feat(v5): add browser clock and ID adapters"
```

### Task 2: Single V5 service composition root

**Files:** `v5-services.ts`, `create-v5-services.ts`, component integration test.

- [ ] **Step 1: Write failing composition test**

Call `createV5Services()` in jsdom with repository/open-db dependencies injected or mocked at the boundary. Assert returned object exposes workout/program/coach/backup operations and that no React component must construct repository adapters itself.

- [ ] **Step 2: Run focused component test**

Run: `npx vitest run tests/components/v5/V5ServiceComposition.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement composition root**

Create DB adapter once, instantiate repository adapters once, instantiate `SystemClock`/`CryptoIdGenerator`, and bind application use cases with dependencies. `V5PreviewApp` receives `services` as prop or obtains them from one app-level provider; do not use a mutable global singleton in domain/application code.

- [ ] **Step 4: Add browser smoke**

Open `/?v5=1`, invoke a lightweight storage-health/active-program query through services, and assert no direct infrastructure import is needed in screen components.

- [ ] **Step 5: Run tests and commit**

```bash
npx vitest run tests/components/v5/V5ServiceComposition.test.tsx
npx playwright test tests/e2e/v5/integration-readiness.spec.ts --grep "service composition"
git add src/v5/app tests/components/v5/V5ServiceComposition.test.tsx tests/e2e/v5/integration-readiness.spec.ts
git commit -m "feat(v5): compose runtime services at app edge"
```

### Task 3: Catalog version and production breadth

**Files:** catalog-version and split seed files, catalog aggregator, quality test.

**Interfaces:**

```ts
export const EXERCISE_CATALOG_VERSION: PolicyVersion = "1.0.0";
export const EXERCISE_CATALOG: readonly ExerciseMetadata[];
```

- [ ] **Step 1: Write failing catalog breadth/quality tests**

Assert:
- total catalog length is between 100 and 200;
- IDs/names are unique;
- every item has primary muscle, movement pattern, equipment, stability, skill demand, fatigue class, valid rep ranges, substitution group;
- all specialization-priority muscles have at least several compatible common-gym exercises;
- common equipment families (barbell, dumbbell, cable, machine, bodyweight) are represented;
- every item is stable-sorted by ID in the exported catalog.

- [ ] **Step 2: Run focused test**

Run: `npm run test:domain -- --test-name-pattern="catalog breadth|catalog quality"`

Expected: FAIL because current seed is intentionally small.

- [ ] **Step 3: Expand catalog as curated data**

Split data by upper/lower/accessory files to keep reviewable units. Include common variations rather than novelty exercises. Every new item must satisfy the existing metadata integrity helper; do not weaken tests to admit incomplete rows.

- [ ] **Step 4: Add policy compatibility checks**

For every initial specialization and supported equipment profile used by onboarding fixtures, assert prescription engine can select enough compatible exercises to build each supported structure without falling back to missing IDs.

- [ ] **Step 5: Run full domain suite and commit**

```bash
npm run test:domain
git add src/v5/domain/exercises tests/v5/domain/catalog-quality.test.ts
git commit -m "feat(v5): complete curated exercise catalog"
```

### Task 4: Deterministic rest timer derived from saved set

**Files:** `rest-timer.ts`, workout presentation files, tests.

**Interfaces:**

```ts
export interface RestTimerState {
  startedAt: ISODateTime;
  targetSeconds: number;
}

export function remainingRestSeconds(state: RestTimerState, now: ISODateTime): number;
```

- [ ] **Step 1: Write failing timer tests**

With `startedAt=10:00:00Z`, target 120 seconds, assert remaining at 10:00:30Z is 90 and remaining after 10:02:10Z is 0. Assert function never returns negative values.

- [ ] **Step 2: Run focused test**

Run: `npm run test:domain -- --test-name-pattern="rest timer"`

Expected: FAIL.

- [ ] **Step 3: Implement pure timer math**

No `setInterval` or global clock inside the pure helper. Presentation may tick once per second using `services.clock.now()` while mounted.

- [ ] **Step 4: Wire timer start to committed set result**

After `completeSet` resolves with persisted `CompletedSet`, initialize `RestTimerState.startedAt` from that record's `completedAt`. If set persistence fails, do not start rest timer.

- [ ] **Step 5: Run component/E2E smoke and commit**

```bash
npm run test:domain
npx vitest run tests/components/v5/WorkoutMode.test.tsx
npx playwright test tests/e2e/v5/integration-readiness.spec.ts --grep "rest timer"
git add src/v5/application/workouts/rest-timer.ts src/v5/presentation/workout tests/v5 tests/e2e/v5/integration-readiness.spec.ts
git commit -m "feat(v5): derive rest timing from saved sets"
```

### Task 5: Integration-readiness verification gate

- [ ] **Step 1:** `npm run check:fast` — exit 0.
- [ ] **Step 2:** `npm run test:domain -- --test-name-pattern="catalog|rest timer|SystemClock|CryptoIdGenerator|VSHAPE-"` — PASS.
- [ ] **Step 3:** `npx vitest run tests/components/v5` — PASS.
- [ ] **Step 4:** `npx playwright test tests/e2e/v5/integration-readiness.spec.ts tests/e2e/v5/onboarding-prescription.spec.ts tests/e2e/v5/workout-core.spec.ts` — PASS.
- [ ] **Step 5:** inspect imports and confirm presentation depends on `V5Services`/controller rather than direct DB modules.
