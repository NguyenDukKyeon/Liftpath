# LiftPath 5 Prescription and Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate and preview a deterministic beginner/intermediate training program from goal + specialization + constraints, with 2–3 user-selectable training structures and a complete onboarding flow that activates a versioned program only after explicit approval.

**Architecture:** Keep prescription as pure domain logic composed from a goal policy, specialization policy, exercise metadata, and user constraints. Onboarding gathers one decision at a time, asks the Prescription Engine for ranked structures and a program proposal, then the application layer persists an approved `ProgramVersion` transactionally.

**Tech Stack:** TypeScript pure domain logic, React onboarding UI, existing V5 repositories/IndexedDB, Node domain tests, Vitest component tests, Playwright E2E.

## Global Constraints

- Primary goals: Hypertrophy, Strength, General Fitness.
- Training level: Beginner or Intermediate.
- One primary specialization, at most one secondary focus.
- Initial V5.0 specialization set: V-Shape, Chest, Shoulders, Arms, Back Width, Back Thickness, Quads, Posterior Chain/Glutes-Hamstrings, Bench Press, Squat, Deadlift, Overhead Press.
- V-Shape is deepest reference specialization.
- User sees 2–3 structure proposals and chooses one.
- Coach cannot later change the structure during normal adaptation.
- Prescription uses versioned policy constants; no fake physiological precision.
- Beginner initial workload is conservative and balanced.
- Program must be previewed before activation.
- No photos/body measurements required.

---

## File Map

**Create**
- `src/v5/domain/programming/profile.ts`
- `src/v5/domain/programming/goals.ts`
- `src/v5/domain/programming/specializations.ts`
- `src/v5/domain/programming/constraints.ts`
- `src/v5/domain/programming/policy-constants.ts`
- `src/v5/domain/programming/structure-proposals.ts`
- `src/v5/domain/programming/prescription.ts`
- `src/v5/domain/programming/prescription-engine.ts`
- `src/v5/domain/programming/policies/goal-policy.ts`
- `src/v5/domain/programming/policies/hypertrophy.ts`
- `src/v5/domain/programming/policies/strength.ts`
- `src/v5/domain/programming/policies/general-fitness.ts`
- `src/v5/domain/programming/policies/specialization-policy.ts`
- `src/v5/domain/programming/policies/v-shape.ts`
- `src/v5/domain/exercises/catalog.ts`
- `src/v5/domain/exercises/catalog-seed.ts`
- `src/v5/application/programs/propose-structures.ts`
- `src/v5/application/programs/build-program-preview.ts`
- `src/v5/application/programs/activate-program.ts`
- `src/v5/presentation/onboarding/OnboardingFlow.tsx`
- `src/v5/presentation/onboarding/GoalStep.tsx`
- `src/v5/presentation/onboarding/SpecializationStep.tsx`
- `src/v5/presentation/onboarding/ConstraintsStep.tsx`
- `src/v5/presentation/onboarding/StructureStep.tsx`
- `src/v5/presentation/onboarding/ProgramPreviewStep.tsx`
- `src/v5/presentation/onboarding/onboarding.css`
- `tests/v5/domain/prescription.test.ts`
- `tests/v5/domain/vshape-policy.test.ts`
- `tests/v5/application/program-onboarding.test.ts`
- `tests/components/v5/OnboardingFlow.test.tsx`
- `tests/e2e/v5/onboarding-prescription.spec.ts`

**Modify**
- `src/v5/app/V5PreviewApp.tsx`
- `src/v5/domain/exercises/exercise.ts`
- `src/v5/application/ports/exercise-repository.ts`
- `src/v5/application/ports/program-repository.ts`
- `src/v5/infrastructure/repositories/exercise-repository.ts`
- `src/v5/infrastructure/repositories/program-repository.ts`

## Interfaces

```ts
export type PrimaryGoal = "hypertrophy" | "strength" | "general_fitness";
export type TrainingLevel = "beginner" | "intermediate";

export type PhysiqueSpecialization =
  | "v_shape" | "chest" | "shoulders" | "arms"
  | "back_width" | "back_thickness" | "quads" | "posterior_chain";

export type StrengthSpecialization = "bench" | "squat" | "deadlift" | "overhead_press";
export type SpecializationId = PhysiqueSpecialization | StrengthSpecialization;

export interface TrainingConstraints {
  daysPerWeek: 2 | 3 | 4 | 5 | 6;
  sessionMinutes: 30 | 45 | 60 | 75 | 90;
  equipment: string[];
  dislikedExerciseIds: EntityId[];
  restrictedMovementPatterns: string[];
}

export interface TrainingProfile extends VersionedRecord {
  level: TrainingLevel;
  goal: PrimaryGoal;
  primarySpecialization: SpecializationId;
  secondaryFocus?: SpecializationId;
  constraints: TrainingConstraints;
}

export interface StructureProposal {
  id: string;
  name: string;
  daysPerWeek: number;
  rationale: string;
  tradeoffs: string[];
  sessionKeys: string[];
  score: number;
}
```

### Task 1: Goal, specialization, and profile invariants

**Files:** profile/goals/specializations/constraints files and `tests/v5/domain/prescription.test.ts`.

- [ ] **Step 1: Write failing profile validation tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { validateTrainingProfileDraft } from "../../../src/v5/domain/programming/profile.js";

test("allows one primary and at most one distinct secondary focus", () => {
  assert.doesNotThrow(() => validateTrainingProfileDraft({
    level: "beginner",
    goal: "hypertrophy",
    primarySpecialization: "v_shape",
    secondaryFocus: "arms",
    constraints: { daysPerWeek: 4, sessionMinutes: 60, equipment: ["cable", "dumbbell"], dislikedExerciseIds: [], restrictedMovementPatterns: [] },
  }));
  assert.throws(() => validateTrainingProfileDraft({
    level: "beginner",
    goal: "hypertrophy",
    primarySpecialization: "v_shape",
    secondaryFocus: "v_shape",
    constraints: { daysPerWeek: 4, sessionMinutes: 60, equipment: [], dislikedExerciseIds: [], restrictedMovementPatterns: [] },
  }));
});
```

- [ ] **Step 2: Run focused domain test**

Run: `npm run test:domain -- --test-name-pattern="one primary"`

Expected: FAIL.

- [ ] **Step 3: Implement unions and validation**

Reject duplicate primary/secondary, unsupported combinations, empty equipment when the proposed program requires equipment, and unsupported day/session-duration values.

- [ ] **Step 4: Run domain suite**

Run: `npm run test:domain`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/v5/domain/programming/{profile.ts,goals.ts,specializations.ts,constraints.ts} tests/v5/domain/prescription.test.ts
git commit -m "feat(v5): define training profile and specialization model"
```

### Task 2: Curated exercise catalog metadata

**Files:**
- Modify: `src/v5/domain/exercises/exercise.ts`
- Create: `src/v5/domain/exercises/catalog.ts`
- Create: `src/v5/domain/exercises/catalog-seed.ts`
- Test: `tests/v5/domain/prescription.test.ts`

**Interfaces:**

```ts
export type MuscleId = "lats" | "side_delts" | "rear_delts" | "upper_back" | "upper_chest" | "chest" | "biceps" | "triceps" | "quads" | "hamstrings" | "glutes" | "calves" | "core";

export interface ExerciseMetadata extends ExerciseDefinition {
  primaryMuscles: MuscleId[];
  secondaryMuscles: MuscleId[];
  movementPattern: string;
  stability: "high" | "medium" | "low";
  skillDemand: "low" | "medium" | "high";
  fatigueClass: "low" | "medium" | "high";
  supportedRepRanges: Array<{ min: number; max: number }>;
  substitutionGroup: string;
}
```

- [ ] **Step 1: Write catalog integrity tests**

Require unique IDs, non-empty names/movement patterns, at least one primary muscle, valid rep ranges, and stable substitution groups for every seed item.

- [ ] **Step 2: Run focused test and verify failure**

Run: `npm run test:domain -- --test-name-pattern="catalog"`

Expected: FAIL.

- [ ] **Step 3: Add a small first seed, not the full 100–200 catalog**

Create enough movements to support all golden onboarding programs used in this plan: squat/leg press, RDL/leg curl, bench/incline press, OHP, vertical pull, horizontal row, lateral raise, rear-delt fly, curl, triceps extension, calf/core basics. Each item has complete metadata.

- [ ] **Step 4: Run catalog tests**

Run: `npm run test:domain`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/v5/domain/exercises tests/v5/domain/prescription.test.ts
git commit -m "feat(v5): seed curated exercise metadata"
```

### Task 3: Versioned programming policy constants

**Files:**
- Create: `src/v5/domain/programming/policy-constants.ts`
- Test: `tests/v5/domain/prescription.test.ts`

**Interfaces:**

```ts
export const PROGRAMMING_POLICY_VERSION: PolicyVersion = "1.0.0";

export interface WorkloadBand {
  minDirectEquivalentSets: number;
  targetDirectEquivalentSets: number;
  maxDirectEquivalentSets: number;
}
```

- [ ] **Step 1: Write failing policy invariant tests**

For every goal/level/muscle-priority band, assert `min <= target <= max`, all values are finite/non-negative, and beginner specialization bounds do not exceed the implementation's explicit beginner ceiling.

- [ ] **Step 2: Run test and verify failure**

Run: `npm run test:domain -- --test-name-pattern="policy constants"`

Expected: FAIL.

- [ ] **Step 3: Implement explicit conservative V1 constants**

Keep constants in one module and include comments that they are programming heuristics. Do not expose them in UI as physiological truth. Indirect set credit starts as a named constant such as `INDIRECT_SET_CREDIT = 0.5` and carries `PROGRAMMING_POLICY_VERSION` in generated prescriptions.

- [ ] **Step 4: Run tests**

Run: `npm run test:domain`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/v5/domain/programming/policy-constants.ts tests/v5/domain/prescription.test.ts
git commit -m "feat(v5): version programming policy constants"
```

### Task 4: Deterministic structure proposals

**Files:**
- Create: `src/v5/domain/programming/structure-proposals.ts`
- Create: `src/v5/application/programs/propose-structures.ts`
- Test: `tests/v5/domain/prescription.test.ts`

**Interfaces:**
- Produces: `rankStructureProposals(profile): StructureProposal[]` returning exactly 2–3 proposals when supported.

- [ ] **Step 1: Write failing proposal cases**

For `beginner + hypertrophy + v_shape + 4 days + 60 min`, assert 2–3 proposals, each has four session keys, rationale/tradeoffs, and deterministic ranking. Assert the function never proposes a 5-day structure for a 4-day constraint.

- [ ] **Step 2: Run focused test**

Run: `npm run test:domain -- --test-name-pattern="structure proposal"`

Expected: FAIL.

- [ ] **Step 3: Implement a bounded proposal catalog and scorer**

Define supported structures by exact day count, e.g. 3-day full-body variants, 4-day upper/lower and torso/lower hybrid, 5-day upper/lower/push-pull hybrid, 6-day PPL-style. Score by matching session duration, specialization exposure opportunities, and level suitability. Return deterministic ties by stable proposal ID.

- [ ] **Step 4: Run domain suite**

Run: `npm run test:domain`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/v5/domain/programming/structure-proposals.ts src/v5/application/programs/propose-structures.ts tests/v5/domain/prescription.test.ts
git commit -m "feat(v5): rank training structure proposals"
```

### Task 5: Compose goal and specialization policies

**Files:** goal/specialization policy files listed in File Map.
- Test: `tests/v5/domain/vshape-policy.test.ts`.

**Interfaces:**

```ts
export interface MusclePriorityMap { [muscle: string]: "maintenance" | "normal" | "high" | "specialization"; }
export interface GoalPolicy { id: PrimaryGoal; version: PolicyVersion; basePriorities(level: TrainingLevel): MusclePriorityMap; }
export interface SpecializationPolicy { id: SpecializationId; version: PolicyVersion; apply(base: MusclePriorityMap): MusclePriorityMap; }
```

- [ ] **Step 1: Write failing V-Shape priority test**

For `hypertrophy + v_shape`, assert lats and side delts are `specialization`, rear delts/upper back are at least `high`, and lower-body groups remain present rather than being dropped.

- [ ] **Step 2: Run focused V-Shape test**

Run: `npm run test:domain -- --test-name-pattern="V-Shape"`

Expected: FAIL.

- [ ] **Step 3: Implement goal policies and V-Shape policy**

Keep policies pure. V-Shape changes priority bands only; it does not create a separate hard-coded program.

- [ ] **Step 4: Implement simple bounded policies for the other initial specializations**

Each policy changes a small, named muscle/movement priority set and reuses the same engine. Do not create dedicated program templates per specialization.

- [ ] **Step 5: Run domain suite**

Run: `npm run test:domain`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/v5/domain/programming/policies tests/v5/domain/vshape-policy.test.ts
git commit -m "feat(v5): compose goal and specialization policies"
```

### Task 6: Constraint-based initial Prescription Engine

**Files:**
- Create: `src/v5/domain/programming/prescription.ts`
- Create: `src/v5/domain/programming/prescription-engine.ts`
- Test: `tests/v5/domain/prescription.test.ts`
- Test: `tests/v5/domain/vshape-policy.test.ts`

**Interfaces:**

```ts
export interface PrescriptionInput {
  profile: TrainingProfile;
  structure: StructureProposal;
  catalog: ExerciseMetadata[];
}

export interface ProgramProposal {
  name: string;
  policyVersion: PolicyVersion;
  structureId: string;
  rationale: string[];
  sessions: ProgramVersion["sessions"];
  workloadByMuscle: Record<MuscleId, number>;
}

export function createInitialPrescription(input: PrescriptionInput): ProgramProposal;
```

- [ ] **Step 1: Write failing reference-path test**

For `beginner + hypertrophy + v_shape + 4-day selected structure`, assert:
- exactly four sessions;
- every session respects available equipment;
- lats/side delts receive more emphasis than non-priority torso groups within policy bounds;
- quads/hamstrings/glutes are still trained;
- estimated exercise count fits 60-minute session heuristic;
- same input deep-equals same output.

- [ ] **Step 2: Run focused test**

Run: `npm run test:domain -- --test-name-pattern="reference prescription"`

Expected: FAIL.

- [ ] **Step 3: Implement engine stages explicitly**

Create small pure helpers for:
1. priority map;
2. workload band selection;
3. exposure allocation;
4. exercise filtering/ranking;
5. session placement/order;
6. set/rep/RIR prescription.

Do not use randomization. When scores tie, use stable exercise ID ordering.

- [ ] **Step 4: Add strength reference test**

For `intermediate + strength + bench + 4 days`, assert bench-specific exposure increases while the engine still uses the shared structure/prescription machinery.

- [ ] **Step 5: Run full domain suite**

Run: `npm run test:domain`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/v5/domain/programming/prescription* tests/v5/domain
git commit -m "feat(v5): generate deterministic initial prescriptions"
```

### Task 7: Program preview and transactional activation

**Files:**
- Create: `src/v5/application/programs/build-program-preview.ts`
- Create: `src/v5/application/programs/activate-program.ts`
- Modify: program repository port/adapter.
- Test: `tests/v5/application/program-onboarding.test.ts`.

**Interfaces:**
- Produces: `buildProgramPreview(profile, structureId, dependencies)` without persistence.
- Produces: `activateProgram(proposal, profile, repositories, ids, clock)` creating profile + `ProgramVersion` atomically.

- [ ] **Step 1: Write failing application tests**

Assert preview does not call repository writes. Assert activation creates version `1`, stores policy version, and makes the new version active only if the transaction commits.

- [ ] **Step 2: Run focused application tests**

Run: `npm run test:domain -- --test-name-pattern="program preview|program activation"`

Expected: FAIL.

- [ ] **Step 3: Implement preview and activation**

The active-program pointer and `ProgramVersion` must be changed in the same transaction. A failed transaction leaves no partially active program.

- [ ] **Step 4: Run application/domain suite**

Run: `npm run test:domain`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/v5/application/programs src/v5/application/ports/program-repository.ts src/v5/infrastructure/repositories/program-repository.ts tests/v5/application/program-onboarding.test.ts
git commit -m "feat(v5): preview and activate generated programs"
```

### Task 8: Onboarding UI and explicit program approval

**Files:** onboarding presentation files, `src/v5/app/V5PreviewApp.tsx`, component/E2E tests.

- [ ] **Step 1: Write failing component journey test**

Drive one decision per step: level -> goal -> specialization -> days/session/equipment -> choose one structure -> see program preview. Assert no activation callback runs before clicking `Start this program`.

- [ ] **Step 2: Run component test and verify failure**

Run: `npx vitest run tests/components/v5/OnboardingFlow.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement onboarding flow**

Keep each screen focused on one main decision. Specialization copy for V-Shape says it prioritizes lat/lateral-delt training while maintaining balanced whole-body training; do not promise visible physique change.

- [ ] **Step 4: Add E2E fresh-install reference path**

Open `/?v5=1` with a clean V5 DB, complete Hypertrophy -> V-Shape -> 4 days -> 60 min -> commercial gym equipment, choose a proposal, inspect preview, approve it, and assert the Today/workout-start placeholder sees an active program.

- [ ] **Step 5: Run component and E2E tests**

Run: `npx vitest run tests/components/v5/OnboardingFlow.test.tsx && npx playwright test tests/e2e/v5/onboarding-prescription.spec.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/v5/presentation/onboarding src/v5/app/V5PreviewApp.tsx tests/components/v5/OnboardingFlow.test.tsx tests/e2e/v5/onboarding-prescription.spec.ts
git commit -m "feat(v5): add guided prescription onboarding"
```

### Task 9: Prescription slice verification

- [ ] **Step 1: Run `npm run check:fast`** — expected exit 0.
- [ ] **Step 2: Run `npx playwright test tests/e2e/v5/onboarding-prescription.spec.ts tests/e2e/v5/workout-core.spec.ts`** — expected PASS.
- [ ] **Step 3: Run `npm run test:e2e`** — existing V4 E2E remains green.
- [ ] **Step 4: Inspect `git diff --stat main...HEAD` and `git status --short`** — no legacy template/program file should have been repurposed as V5 source of truth.
