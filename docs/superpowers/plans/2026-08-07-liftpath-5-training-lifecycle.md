# LiftPath 5 Training Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the long-term training lifecycle missing from the earlier slices: persist readiness as authoritative training-state input, model stable training blocks, review block outcomes, and transition user-initiated goal/specialization changes without silently destroying the active program.

**Architecture:** Add small lifecycle records/use cases between Coach and presentation. Readiness is stored per session and fed into `CoachContext`; training blocks reference immutable program versions; end-of-block review produces a bounded proposal; user-initiated goal/specialization changes create a transition proposal that preserves useful movements where compatible and requires explicit approval.

**Tech Stack:** Existing V5 TypeScript domain/application/repository stack, native IndexedDB, Node domain/application tests, minimal Playwright lifecycle E2E.

## Global Constraints

- Readiness inputs are training-state inputs, not physique measurements.
- Readiness data includes energy, soreness, and optional user-reported pain exercise IDs.
- Pain blocks normal progression for affected movements.
- Beginner/intermediate blocks favor stability; do not churn exercises/program weekly without evidence.
- End-of-block review does not automatically activate a new program.
- User initiates goal/specialization changes; Coach does not silently change them.
- Goal/specialization transitions preserve useful movements/history where compatible.
- Training structure remains user-owned; a goal/specialization transition cannot silently change split/session count.
- Every transition creates a new `ProgramVersion` only after user approval.

---

## File Map

**Create**
- `src/v5/domain/training/readiness.ts`
- `src/v5/domain/programming/training-block.ts`
- `src/v5/domain/programming/block-review.ts`
- `src/v5/domain/programming/transition.ts`
- `src/v5/application/ports/readiness-repository.ts`
- `src/v5/application/ports/block-repository.ts`
- `src/v5/application/workouts/record-readiness.ts`
- `src/v5/application/programs/start-training-block.ts`
- `src/v5/application/programs/review-training-block.ts`
- `src/v5/application/programs/propose-goal-transition.ts`
- `src/v5/application/programs/activate-goal-transition.ts`
- `src/v5/infrastructure/repositories/readiness-repository.ts`
- `src/v5/infrastructure/repositories/block-repository.ts`
- `tests/v5/domain/training-lifecycle.test.ts`
- `tests/v5/application/training-lifecycle.test.ts`
- `tests/e2e/v5/training-lifecycle.spec.ts`

**Modify**
- `src/v5/domain/coaching/context.ts`
- `src/v5/application/coaching/evaluate-coach.ts`
- `src/v5/domain/programming/program.ts`
- `src/v5/infrastructure/db/constants.ts`
- `src/v5/infrastructure/db/open-db.ts`

## Interfaces

```ts
export interface ReadinessEntry extends VersionedRecord {
  sessionId: EntityId;
  energy: "low" | "normal" | "high";
  soreness: "none" | "mild" | "high";
  painExerciseIds: EntityId[];
}

export interface TrainingBlock extends VersionedRecord {
  blockNumber: number;
  status: "active" | "completed";
  goal: PrimaryGoal;
  primarySpecialization: SpecializationId;
  secondaryFocus?: SpecializationId;
  structureId: string;
  initialProgramVersionId: EntityId;
  currentProgramVersionId: EntityId;
  startedAt: ISODateTime;
  completedAt?: ISODateTime;
}

export interface BlockReview {
  blockId: EntityId;
  adherence: AdherenceStatus;
  specializationTrends: Partial<Record<MuscleId, PerformanceTrend>>;
  fatigueSignal: "low" | "normal" | "high";
  recommendation: "continue" | "adjust_next_block" | "deload_then_continue";
  evidenceIds: EntityId[];
}

export interface GoalTransitionProposal {
  fromGoal: PrimaryGoal;
  toGoal: PrimaryGoal;
  fromSpecialization: SpecializationId;
  toSpecialization: SpecializationId;
  structureId: string;
  retainedExerciseIds: EntityId[];
  replacementExerciseIds: EntityId[];
  proposedProgram: ProgramProposal;
  rationale: string[];
}
```

### Task 1: Persist readiness per training session

**Files:** readiness domain/port/adapter/use case, DB schema, tests.

- [ ] **Step 1: Write failing domain tests**

Assert valid entries allow low/normal/high energy, none/mild/high soreness, and optional pain IDs. Reject duplicate pain IDs and unknown session IDs at the application boundary.

- [ ] **Step 2: Run focused test**

Run: `npm run test:domain -- --test-name-pattern="readiness entry"`

Expected: FAIL.

- [ ] **Step 3: Implement readiness record and repository port**

```ts
export interface ReadinessRepository {
  save(entry: ReadinessEntry): Promise<void>;
  getForSession(sessionId: EntityId): Promise<ReadinessEntry | undefined>;
  listRecent(limit: number): Promise<ReadinessEntry[]>;
}
```

Add `readinessEntries` store indexed by `sessionId` and `createdAt` in one IndexedDB version migration.

- [ ] **Step 4: Implement `recordReadiness` use case**

Validate session is active, create stable record with injected ID/clock, persist it, and return only after transaction success.

- [ ] **Step 5: Run domain/application/browser tests**

Run: `npm run test:domain && npx playwright test tests/e2e/v5/training-lifecycle.spec.ts --grep "readiness"`

Expected: PASS after E2E seed/wiring is added.

- [ ] **Step 6: Commit**

```bash
git add src/v5/domain/training/readiness.ts src/v5/application/ports/readiness-repository.ts src/v5/application/workouts/record-readiness.ts src/v5/infrastructure/repositories/readiness-repository.ts src/v5/infrastructure/db tests/v5 tests/e2e/v5/training-lifecycle.spec.ts
git commit -m "feat(v5): persist readiness as training-state input"
```

### Task 2: Feed persisted readiness into CoachContext

**Files:** Coach context/evaluate use case + tests.

- [ ] **Step 1: Write failing context-builder test**

Seed three recent sessions/readiness entries and assert `evaluateCoachForCompletedSession` receives only recent persisted readiness records, including pain exercise IDs, rather than presentation component state.

- [ ] **Step 2: Run focused test**

Run: `npm run test:domain -- --test-name-pattern="CoachContext readiness"`

Expected: FAIL before builder wiring.

- [ ] **Step 3: Implement context integration**

Remove any duplicate ad-hoc readiness shape and import `ReadinessEntry`. Limit context to a bounded recent window defined by Coach policy constants.

- [ ] **Step 4: Re-run Coach golden/safety suites**

Run: `npm run test:domain -- --test-name-pattern="VSHAPE-|pain|readiness"`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/v5/domain/coaching/context.ts src/v5/application/coaching/evaluate-coach.ts tests/v5
git commit -m "feat(v5): build Coach context from persisted readiness"
```

### Task 3: Stable training-block records

**Files:** training-block domain/port/adapter/use case/tests.

- [ ] **Step 1: Write failing block invariants**

Assert one active block references a stable structure ID and initial/current program-version IDs; updating current program version does not alter `initialProgramVersionId`; completed block requires `completedAt`.

- [ ] **Step 2: Run focused domain test**

Run: `npm run test:domain -- --test-name-pattern="training block"`

Expected: FAIL.

- [ ] **Step 3: Implement block record/repository**

Create `trainingBlocks` store with `by-status` and `by-startedAt` indexes. `startTrainingBlock` refuses to create another active block and snapshots goal/specialization/structure from the approved program/profile.

- [ ] **Step 4: Link accepted Coach program versions to current block**

When Accept/Modify creates a new `ProgramVersion`, update `TrainingBlock.currentProgramVersionId` in the same transaction without changing block structure/identity.

- [ ] **Step 5: Run tests and commit**

```bash
npm run test:domain
git add src/v5/domain/programming/training-block.ts src/v5/application/ports/block-repository.ts src/v5/application/programs/start-training-block.ts src/v5/infrastructure/repositories/block-repository.ts src/v5/application/coaching tests/v5
git commit -m "feat(v5): track stable training blocks"
```

### Task 4: End-of-block review

**Files:** `block-review.ts`, review use case/tests.

- [ ] **Step 1: Write failing review cases**

For a completed block with high adherence and improving specialization trends, expect `continue`. For broad regression/high fatigue with enough evidence, expect `deload_then_continue`. For one priority muscle stable while others progress at normal fatigue, expect `adjust_next_block` but no automatic activation.

- [ ] **Step 2: Run focused tests**

Run: `npm run test:domain -- --test-name-pattern="block review"`

Expected: FAIL.

- [ ] **Step 3: Implement pure block review**

Reuse existing Coach classifiers/derived evidence; do not invent new physique metrics. `reviewTrainingBlock` returns `BlockReview` and persists it as review metadata but does not create a new active program.

- [ ] **Step 4: Add application test proving no automatic program activation**

Call review and assert active program/block remain unchanged until a separate user-approved next-block action.

- [ ] **Step 5: Run tests and commit**

```bash
npm run test:domain
git add src/v5/domain/programming/block-review.ts src/v5/application/programs/review-training-block.ts tests/v5
git commit -m "feat(v5): review training blocks without auto changes"
```

### Task 5: Goal/specialization transition proposal

**Files:** `transition.ts`, proposal use case/tests.

- [ ] **Step 1: Write failing transition tests**

Case: `Hypertrophy + V-Shape -> Hypertrophy + Arms`, same 4-day structure. Assert compatible squat/press/row movements can be retained, V-Shape-only priority placements may be changed, and session count/structure ID stays unchanged.

Case: `Hypertrophy + V-Shape -> Strength + Bench`, same structure. Assert shared suitable movements are retained when compatible, progression policy changes, and proposal includes rationale.

- [ ] **Step 2: Run focused test**

Run: `npm run test:domain -- --test-name-pattern="goal transition"`

Expected: FAIL.

- [ ] **Step 3: Implement deterministic retention logic**

Preserve an existing exercise if it remains compatible with new goal/specialization, available equipment, restrictions, and session intent. Otherwise replace through the existing substitution/exercise-ranking logic. Stable-ID ties; no randomization.

- [ ] **Step 4: Assert user-ownership invariant**

Any proposed program with a changed `structureId` or different number of session keys is rejected by transition validation.

- [ ] **Step 5: Run tests and commit**

```bash
npm run test:domain
git add src/v5/domain/programming/transition.ts src/v5/application/programs/propose-goal-transition.ts tests/v5
git commit -m "feat(v5): propose bounded goal transitions"
```

### Task 6: Explicit transition approval and new block activation

**Files:** activation use case/tests/E2E.

- [ ] **Step 1: Write failing transaction test**

Approve a transition and assert one transaction:
1. completes previous block;
2. creates new `ProgramVersion`;
3. updates profile goal/specialization;
4. creates next active block;
5. activates the new program version.

Inject failure between steps and assert all roll back.

- [ ] **Step 2: Run focused test**

Run: `npm run test:domain -- --test-name-pattern="activate goal transition"`

Expected: FAIL.

- [ ] **Step 3: Implement activation**

Do not delete prior program/block/history. Record transition source as `user_goal_change` and keep rationale/evidence attached to new version metadata.

- [ ] **Step 4: Add lifecycle E2E**

Seed an active V-Shape block, complete/review it, initiate change to Arms, inspect transition proposal, approve, reload, and assert old block/history remains while new block/program is active.

- [ ] **Step 5: Run tests and commit**

```bash
npm run test:domain
npx playwright test tests/e2e/v5/training-lifecycle.spec.ts
git add src/v5/application/programs/activate-goal-transition.ts tests/v5/application/training-lifecycle.test.ts tests/e2e/v5/training-lifecycle.spec.ts
git commit -m "feat(v5): activate approved training transitions"
```

### Task 7: Lifecycle verification gate

- [ ] **Step 1:** `npm run check:fast` — expected exit 0.
- [ ] **Step 2:** `npm run test:domain -- --test-name-pattern="readiness|training block|block review|goal transition|VSHAPE-|pain"` — PASS.
- [ ] **Step 3:** `npx playwright test tests/e2e/v5/training-lifecycle.spec.ts tests/e2e/v5/coach-adaptation.spec.ts` — PASS.
- [ ] **Step 4:** inspect diff/status and confirm transitions preserve prior program versions/blocks and do not alter V4 data.
