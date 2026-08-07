# LiftPath 5 Coach and V-Shape Adaptation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic evidence-backed Coach that classifies training observations, diagnoses likely causes, proposes bounded adaptations, makes V-Shape the first deep specialization, and records Accept/Modify/Skip decisions as auditable program-version changes.

**Architecture:** Build Coach as pure domain stages: Observation -> Diagnosis -> Recommendation. Each recommendation carries reason codes, evidence IDs, confidence, priority, policy versions, and a proposed patch. Application use cases persist recommendations and create new program versions only after explicit user approval.

**Tech Stack:** Pure TypeScript Coach domain, existing V5 repositories/IndexedDB, Node golden-scenario tests, Vitest recommendation UI tests, Playwright decision-flow E2E.

## Global Constraints

- Same `CoachContext` + same policy versions => same decision.
- Safety > constraints > adherence > fatigue > progression > specialization optimization.
- One anomalous workout is insufficient for a material change.
- Material changes require user Accept/Modify/Skip.
- Normal adaptation cannot change selected training structure.
- One primary intervention variable per recommendation by default.
- Pain flag blocks normal progression on the affected movement; no medical diagnosis/rehab protocol.
- Specialization redistributes workload before increasing total workload.
- V-Shape uses lats + side delts as specialization priorities, rear delts/upper back as high support, while preserving whole-body training.
- Coach may describe training-performance trends, not claim measured muscle growth.

---

## File Map

**Create**
- `src/v5/domain/coaching/context.ts`
- `src/v5/domain/coaching/observation.ts`
- `src/v5/domain/coaching/performance-trend.ts`
- `src/v5/domain/coaching/effort-status.ts`
- `src/v5/domain/coaching/adherence.ts`
- `src/v5/domain/coaching/confidence.ts`
- `src/v5/domain/coaching/diagnosis.ts`
- `src/v5/domain/coaching/recommendation.ts`
- `src/v5/domain/coaching/recommendation-priority.ts`
- `src/v5/domain/coaching/progression.ts`
- `src/v5/domain/coaching/deload.ts`
- `src/v5/domain/coaching/pain-safety.ts`
- `src/v5/domain/coaching/vshape-adaptation.ts`
- `src/v5/domain/coaching/coach-engine.ts`
- `src/v5/application/ports/recommendation-repository.ts`
- `src/v5/application/coaching/evaluate-coach.ts`
- `src/v5/application/coaching/accept-recommendation.ts`
- `src/v5/application/coaching/modify-recommendation.ts`
- `src/v5/application/coaching/skip-recommendation.ts`
- `src/v5/infrastructure/repositories/recommendation-repository.ts`
- `src/v5/presentation/components/CoachRecommendationCard.tsx`
- `tests/v5/scenarios/vshape-golden.test.ts`
- `tests/v5/domain/coach-engine.test.ts`
- `tests/v5/application/coach-decisions.test.ts`
- `tests/components/v5/CoachRecommendationCard.test.tsx`
- `tests/e2e/v5/coach-adaptation.spec.ts`

**Modify**
- `src/v5/domain/programming/program.ts`
- `src/v5/application/ports/program-repository.ts`
- `src/v5/infrastructure/repositories/program-repository.ts`
- `src/v5/application/workouts/complete-workout.ts`
- `src/v5/infrastructure/db/constants.ts`
- `src/v5/infrastructure/db/open-db.ts`

## Interfaces

```ts
export type PerformanceTrend = "insufficient_data" | "improving" | "stable" | "declining";
export type EffortStatus = "too_easy" | "on_target" | "too_hard" | "inconsistent";
export type AdherenceStatus = "complete" | "partial" | "missed";
export type EvidenceConfidence = "low" | "medium" | "high";

export interface CoachContext {
  now: ISODateTime;
  profile: TrainingProfile;
  activeProgram: ProgramVersion;
  recentSets: CompletedSet[];
  recentSessions: TrainingSession[];
  readiness: Array<{ sessionId: EntityId; energy: "low" | "normal" | "high"; soreness: "none" | "mild" | "high"; painExerciseIds: EntityId[] }>;
  programmingPolicyVersion: PolicyVersion;
  coachPolicyVersion: PolicyVersion;
}

export type RecommendationPriority = "safety" | "constraint" | "adherence" | "fatigue" | "progression" | "specialization";

export interface CoachRecommendation extends VersionedRecord {
  type: string;
  priority: RecommendationPriority;
  reasonCode: string;
  evidenceIds: EntityId[];
  confidence: EvidenceConfidence;
  proposedPatch: ProgramPatch;
  expectedIntent: string;
  decisionState: DecisionState;
  coachPolicyVersion: PolicyVersion;
  programmingPolicyVersion: PolicyVersion;
}
```

### Task 1: Performance, effort, adherence, and confidence classifiers

**Files:** classifier files + `tests/v5/domain/coach-engine.test.ts`.

- [ ] **Step 1: Write failing classifier tests**

Create fixed 3–5 exposure fixtures and assert:
- fewer than 3 comparable exposures => `insufficient_data` / low confidence;
- reps/load improve at similar effort => `improving`;
- repeated RIR 0–1 against target RIR 2 => `too_hard`;
- prescribed work repeatedly missing => `partial`/`missed` rather than plateau.

- [ ] **Step 2: Run focused tests**

Run: `npm run test:domain -- --test-name-pattern="performance trend|effort status|confidence"`

Expected: FAIL.

- [ ] **Step 3: Implement pure classifiers**

Use only explicitly passed exposure windows. Do not read current time/global state. Use stable thresholds stored in `COACH_POLICY_VERSION = "1.0.0"` constants.

- [ ] **Step 4: Run domain tests**

Run: `npm run test:domain`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/v5/domain/coaching/{performance-trend.ts,effort-status.ts,adherence.ts,confidence.ts} tests/v5/domain/coach-engine.test.ts
git commit -m "feat(v5): classify training evidence"
```

### Task 2: Ordered diagnosis pipeline

**Files:** `observation.ts`, `diagnosis.ts`, `pain-safety.ts`, `recommendation-priority.ts`, tests.

**Interfaces:**

```ts
export type Diagnosis =
  | { kind: "pain_safety"; exerciseId: EntityId }
  | { kind: "adherence_limited"; sessionIds: EntityId[] }
  | { kind: "effort_too_high"; exerciseId: EntityId }
  | { kind: "session_fatigue"; exerciseId: EntityId }
  | { kind: "progression_plateau"; exerciseId: EntityId }
  | { kind: "specialization_review"; muscle: MuscleId }
  | { kind: "no_change" };
```

- [ ] **Step 1: Write failing diagnosis-priority tests**

Construct a context with shoulder pain plus a technically eligible load increase; assert diagnosis is `pain_safety`. Construct poor adherence plus stable performance; assert `adherence_limited` wins before plateau.

- [ ] **Step 2: Run focused test**

Run: `npm run test:domain -- --test-name-pattern="diagnosis priority"`

Expected: FAIL.

- [ ] **Step 3: Implement the ordered pipeline**

Evaluate in this order: pain/safety -> explicit constraints -> adherence -> excessive effort/fatigue -> progression -> specialization. Stop at the highest-priority material diagnosis for one recommendation cycle.

- [ ] **Step 4: Run domain suite**

Run: `npm run test:domain`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/v5/domain/coaching/{observation.ts,diagnosis.ts,pain-safety.ts,recommendation-priority.ts} tests/v5/domain/coach-engine.test.ts
git commit -m "feat(v5): diagnose coach state by priority"
```

### Task 3: Progression recommendations

**Files:** `progression.ts`, `recommendation.ts`, tests.

**Interfaces:**

```ts
export type ProgramPatch =
  | { kind: "set_load"; exerciseId: EntityId; loadKg: number }
  | { kind: "set_target_rir"; exerciseId: EntityId; targetRir: number }
  | { kind: "set_count"; exerciseId: EntityId; sets: number }
  | { kind: "move_exercise"; exerciseId: EntityId; beforeExerciseId: EntityId }
  | { kind: "replace_exercise"; exerciseId: EntityId; replacementExerciseId: EntityId }
  | { kind: "reduced_volume_week"; multiplier: number };
```

- [ ] **Step 1: Write failing progression scenarios**

Assert:
- repeated top-of-range at target effort -> bounded `set_load` increase;
- top-of-range at RIR 0 -> no immediate load increase, prefer effort correction/hold;
- one bad exposure -> no material change;
- stable performance with RIR 0 repeatedly -> target-effort/load correction before added sets.

- [ ] **Step 2: Run focused tests**

Run: `npm run test:domain -- --test-name-pattern="progression recommendation"`

Expected: FAIL.

- [ ] **Step 3: Implement deterministic patch creation**

Use exercise-specific allowed load increments from metadata/policy constants. Never change structure/session count. Return one primary patch.

- [ ] **Step 4: Run domain suite**

Run: `npm run test:domain`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/v5/domain/coaching/{progression.ts,recommendation.ts} tests/v5/domain/coach-engine.test.ts
git commit -m "feat(v5): recommend bounded progression changes"
```

### Task 4: V-Shape adaptation policy and golden scenarios

**Files:** `vshape-adaptation.ts`, `tests/v5/scenarios/vshape-golden.test.ts`.

- [ ] **Step 1: Encode five required golden scenarios as failing tests**

```text
VSHAPE-001 lats + side delts improving, recovery normal -> NO_CHANGE
VSHAPE-002 side delts stable, adherence high, effort on target -> REVIEW_SPECIALIZATION
VSHAPE-003 lats stable, repeated RIR 0 -> REDUCE_EFFORT_FIRST
VSHAPE-004 shoulder movement pain flag -> STOP_NORMAL_PROGRESSION
VSHAPE-005 side-delt workload already at policy high bound + plateau -> DO_NOT_ADD_VOLUME
```

Each scenario asserts exact diagnosis kind, recommendation priority, patch kind (or none), confidence band, and stable reason code.

- [ ] **Step 2: Run golden tests and verify failure**

Run: `npm run test:domain -- --test-name-pattern="VSHAPE-"`

Expected: FAIL.

- [ ] **Step 3: Implement specialization review logic**

When specialization adjustment is justified:
1. check current priority-muscle workload against policy bounds;
2. prefer exercise order or lower-priority workload redistribution;
3. add total volume only if within explicit bounds and no lower-cost intervention fits;
4. emit a single patch/recommendation.

- [ ] **Step 4: Add deterministic repeat test**

Run the same VSHAPE-002 context 100 times and deep-equal every output to the first output.

- [ ] **Step 5: Run golden/domain suite**

Run: `npm run test:domain`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/v5/domain/coaching/vshape-adaptation.ts tests/v5/scenarios/vshape-golden.test.ts
git commit -m "feat(v5): add V-Shape adaptation policy"
```

### Task 5: Deload and broad-fatigue safeguard

**Files:** `deload.ts`, tests.

- [ ] **Step 1: Write failing deload tests**

Require multiple recent sessions with broad regression plus repeated high effort/recovery flags before recommending `{ kind: "reduced_volume_week", multiplier: 0.7 }`. Assert a fixed week number alone does not trigger deload.

- [ ] **Step 2: Run focused test**

Run: `npm run test:domain -- --test-name-pattern="deload"`

Expected: FAIL.

- [ ] **Step 3: Implement evidence-gated deload policy**

Use explicit `DELOAD_VOLUME_MULTIPLIER = 0.7` under Coach policy version 1.0.0. Keep it a programming policy constant and require high confidence for material deload.

- [ ] **Step 4: Run domain suite and commit**

```bash
npm run test:domain
git add src/v5/domain/coaching/deload.ts tests/v5/domain/coach-engine.test.ts
git commit -m "feat(v5): gate deloads on broad fatigue evidence"
```

### Task 6: Compose deterministic Coach Engine

**Files:** `context.ts`, `coach-engine.ts`, tests.

**Interfaces:**

```ts
export function evaluateCoach(context: CoachContext): Omit<CoachRecommendation, keyof VersionedRecord | "decisionState"> | null;
```

- [ ] **Step 1: Write failing composition test**

Feed a frozen `CoachContext` and assert exact output reason/priority/patch/confidence. Deep-freeze input and assert evaluation does not mutate it.

- [ ] **Step 2: Run focused test**

Run: `npm run test:domain -- --test-name-pattern="Coach Engine"`

Expected: FAIL.

- [ ] **Step 3: Implement engine composition**

Build observations/classifiers, choose diagnosis by priority, convert diagnosis to at most one recommendation, and return `null` when no material change is justified.

- [ ] **Step 4: Run all domain/golden tests**

Run: `npm run test:domain`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/v5/domain/coaching/{context.ts,coach-engine.ts} tests/v5/domain tests/v5/scenarios
git commit -m "feat(v5): compose deterministic Coach Engine"
```

### Task 7: Recommendation persistence and evaluation use case

**Files:** recommendation port/adapter, `evaluate-coach.ts`, DB schema, tests.

- [ ] **Step 1: Write failing application test**

Given a context that yields a recommendation, assert `evaluateCoachForCompletedSession` persists a `pending` recommendation with evidence IDs and both policy versions. Given no recommendation, assert no record is written.

- [ ] **Step 2: Run application tests**

Run: `npm run test:domain -- --test-name-pattern="persists recommendation"`

Expected: FAIL.

- [ ] **Step 3: Add `recommendations` indexes and repository adapter**

Index by `decisionState` and `createdAt`. Do not rewrite session/set records when a recommendation is generated.

- [ ] **Step 4: Wire completed-workout application flow**

After session completion commits, build `CoachContext` and evaluate. If Coach fails with `COACH_POLICY_ERROR`, preserve completed workout success and surface/log Coach failure separately; never roll back authoritative workout completion.

- [ ] **Step 5: Run tests and commit**

```bash
npm run test:domain
git add src/v5/application/coaching src/v5/application/ports/recommendation-repository.ts src/v5/infrastructure/repositories/recommendation-repository.ts src/v5/application/workouts/complete-workout.ts src/v5/infrastructure/db tests/v5/application
git commit -m "feat(v5): persist Coach recommendations safely"
```

### Task 8: Accept/Modify/Skip with versioned program changes

**Files:** decision use cases + program repository changes + tests.

**Interfaces:**
- `acceptRecommendation(id, deps): Promise<ProgramVersion | null>`.
- `modifyRecommendation(id, patch, deps): Promise<ProgramVersion | null>`.
- `skipRecommendation(id, deps): Promise<void>`.

- [ ] **Step 1: Write failing transaction tests**

For Accept, assert one transaction creates new `ProgramVersion`, marks recommendation accepted, and changes active version. Inject failure after version creation and assert all three changes roll back.

- [ ] **Step 2: Write invariant test forbidding structure patches**

Pass a fabricated patch attempting to change training days/session keys; assert validation rejects before persistence.

- [ ] **Step 3: Run tests and verify failure**

Run: `npm run test:domain -- --test-name-pattern="Accept recommendation|training structure"`

Expected: FAIL.

- [ ] **Step 4: Implement Accept/Modify/Skip**

Accepted/modified patches apply to a copy of current program, increment `versionNumber`, preserve previous version, store `sourceRecommendationId`, and activate only after transaction commit. Skip changes only decision state.

- [ ] **Step 5: Run tests and commit**

```bash
npm run test:domain
git add src/v5/application/coaching src/v5/application/ports/program-repository.ts src/v5/infrastructure/repositories/program-repository.ts tests/v5/application/coach-decisions.test.ts
git commit -m "feat(v5): apply approved Coach decisions by program version"
```

### Task 9: Coach Recommendation Card

**Files:** component + component test.

- [ ] **Step 1: Write failing component test**

Render a load-increase recommendation and assert visible: proposed change, reason, evidence summary, expected intent, confidence, and three actions `Accept`, `Modify`, `Skip`. Assert no action fires automatically on render.

- [ ] **Step 2: Run focused test**

Run: `npx vitest run tests/components/v5/CoachRecommendationCard.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement accessible card**

Buttons are explicit, pending action disables duplicate submits, failures remain visible and recommendation remains pending.

- [ ] **Step 4: Run component test and commit**

```bash
npx vitest run tests/components/v5/CoachRecommendationCard.test.tsx
git add src/v5/presentation/components/CoachRecommendationCard.tsx tests/components/v5/CoachRecommendationCard.test.tsx
git commit -m "feat(v5): add reviewable Coach recommendation card"
```

### Task 10: Full Coach decision E2E

**Files:** `tests/e2e/v5/coach-adaptation.spec.ts`, preview UI wiring.

- [ ] **Step 1: Write E2E for load progression**

Seed enough matching sessions to create a high-confidence top-of-range recommendation. Open preview, verify the recommendation explains evidence, click Accept, verify new active program version, reload, and verify previous program version/recommendation history still exists.

- [ ] **Step 2: Write E2E for pain safety**

Seed readiness with pain on a shoulder movement and otherwise eligible performance; assert no normal load-increase recommendation appears for that movement.

- [ ] **Step 3: Run focused E2E and verify failure before wiring**

Run: `npx playwright test tests/e2e/v5/coach-adaptation.spec.ts`

Expected: FAIL until preview/recommendation wiring is complete.

- [ ] **Step 4: Wire pending recommendation list into V5 preview shell**

Keep this functional/minimal; full product UX belongs to the next plan.

- [ ] **Step 5: Run E2E**

Run: `npx playwright test tests/e2e/v5/coach-adaptation.spec.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/v5/app/V5PreviewApp.tsx tests/e2e/v5/coach-adaptation.spec.ts
git commit -m "feat(v5): connect Coach decision lifecycle"
```

### Task 11: Coach slice verification gate

- [ ] **Step 1:** Run `npm run check:fast` — expected exit 0.
- [ ] **Step 2:** Run `npm run test:domain -- --test-name-pattern="VSHAPE-|Coach|pain|deload|progression"` — expected PASS.
- [ ] **Step 3:** Run `npx playwright test tests/e2e/v5/coach-adaptation.spec.ts tests/e2e/v5/workout-core.spec.ts` — expected PASS.
- [ ] **Step 4:** Run `npm run test:e2e` — V4 regression suite expected PASS.
- [ ] **Step 5:** Inspect diff/status and confirm no Coach code imports React/IndexedDB/network APIs.
