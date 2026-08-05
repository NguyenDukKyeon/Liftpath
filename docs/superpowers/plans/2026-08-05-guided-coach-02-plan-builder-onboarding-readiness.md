# Guided Coach 02 — Plan Builder, Onboarding, and Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn onboarding answers into one equipment-safe recommended plan and generate a temporary readiness-adjusted workout before each session.

**Architecture:** Pure coach modules return `CoachDecision<T>` values with reason codes, explanations, confidence, and evidence. React screens collect inputs and render decisions; state mutation occurs only after the user confirms a recommendation.

**Tech Stack:** React 19, TypeScript 5.8, Vite 8, Node 22 `node:test`, existing CSS architecture.

## Global Constraints

- Requires completion of `2026-08-05-guided-coach-01-schema-migration.md`.
- Primary optimization target: beginners and intermediates training 3–4 days per week.
- The coach is deterministic and offline-capable; no LLM or hosted service may choose a plan.
- A generated plan must contain zero unavailable-equipment prescriptions.
- Pain input never produces a diagnosis; sharp, unusual, worsening, or joint-specific pain blocks automatic progression for the affected movement.
- Every plan selection, substitution, set reduction, effort reduction, or removed accessory must include a visible reason.
- Readiness adjustments must not mutate the base program.

---

## File Map

- Create `src/features/coach/contracts.ts`: coach inputs, evidence, decisions, and reason-code unions.
- Create `src/features/coach/explanations.ts`: Vietnamese explanation mapping.
- Create `src/features/coach/substitution.ts`: equipment and restriction-safe replacements.
- Create `src/features/coach/plan-builder.ts`: plan scoring and recommendation.
- Create `src/features/coach/readiness.ts`: temporary session adjustments.
- Create `src/features/onboarding/OnboardingFlow.tsx`: four-step flow and plan preview.
- Create `src/features/onboarding/onboarding.css`: scoped flow styles.
- Create `src/features/workout/ReadinessCheck.tsx`: pre-workout form and decision preview.
- Modify `src/App.tsx`: route onboarding and readiness states.
- Modify `src/state.ts`: confirm plan and start from a readiness-adjusted prescription list.
- Modify `src/types.ts`: structured profile calibration, restrictions, preferences, and readiness snapshot.
- Delete or reduce `src/components/Onboarding.tsx` to a re-export after migration.
- Create `tests/coach-plan-builder.test.ts`.
- Create `tests/coach-readiness.test.ts`.

### Task 1: Define coach contracts and reason codes

**Files:**
- Create: `src/features/coach/contracts.ts`
- Create: `src/features/coach/explanations.ts`
- Modify: `src/types.ts`
- Create: `tests/coach-contracts.test.ts`

**Interfaces:**
- Produces: `CoachDecision<T>`, `CoachEvidence`, `CoachReasonCode`, `PlanBuilderInput`, `PlanRecommendation`, `ReadinessInput`, `ReadinessAdjustment`, and `PainConcern`.
- Consumes: schema-v4 program, prescription, equipment, profile, and movement types.

- [ ] **Step 1: Write a failing contract test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { explainReason } from "../src/features/coach/explanations.js";
import type { CoachDecision } from "../src/features/coach/contracts.js";

const decision: CoachDecision<number> = {
  value: 3,
  reasonCode: "schedule-prefers-three-days",
  explanation: explainReason("schedule-prefers-three-days"),
  confidence: "high",
  evidence: [{ key: "availableDays", value: 3 }],
};

test("coach decisions expose stable machine and human explanations", () => {
  assert.equal(decision.reasonCode, "schedule-prefers-three-days");
  assert.match(decision.explanation, /3 buổi/);
});
```

- [ ] **Step 2: Run the test and verify missing modules**

Run: `npm run test`

Expected: module-not-found failures.

- [ ] **Step 3: Implement explicit contracts**

```ts
export type CoachDecision<T> = {
  value: T;
  reasonCode: CoachReasonCode;
  explanation: string;
  confidence: "low" | "medium" | "high";
  evidence: CoachEvidence[];
};

export type CoachEvidence = {
  key: string;
  value: string | number | boolean;
};
```

Use a closed `CoachReasonCode` union. Include plan-selection, equipment-substitution, time-shortening, low-energy, high-soreness, pain-block, insufficient-evidence, and safe-default reason codes.

- [ ] **Step 4: Extend structured profile fields**

Add:

```ts
export type EffortLanguage = "simple-rir" | "rpe";
export type MovementFamiliarity = "new" | "some" | "comfortable";
export type StructuredRestriction = {
  id: string;
  bodyArea: "shoulder" | "elbow" | "wrist" | "back" | "hip" | "knee" | "ankle" | "other";
  affectedPatterns: MovementPattern[];
  note: string;
};
```

Replace free-text-only limitations with `restrictions` while preserving the old text as `profileNotes` during migration.

- [ ] **Step 5: Implement Vietnamese explanation lookup**

```ts
const explanations: Record<CoachReasonCode, string> = {
  "schedule-prefers-three-days": "Bạn chọn 3 buổi mỗi tuần, nên Full Body giúp mỗi nhóm cơ được tập đều mà vẫn có ngày hồi phục.",
  "equipment-safe-substitution": "Bài gốc cần thiết bị bạn chưa chọn, nên LiftPath đã dùng một bài cùng nhóm chuyển động phù hợp với thiết bị hiện có.",
  "readiness-low-energy": "Năng lượng hôm nay thấp, nên buổi tập giữ các bài chính và giảm phần phụ để duy trì kỹ thuật.",
  "pain-blocks-movement": "Bạn báo đau bất thường ở vùng liên quan. LiftPath không tăng tải và đề xuất dừng hoặc đổi chuyển động này.",
  "insufficient-evidence": "LiftPath chưa có đủ dữ liệu để tự điều chỉnh an toàn; hãy giữ mức hiện tại và đánh giá lại sau buổi tập.",
  "safe-default-plan": "Không thể tạo đầy đủ phương án từ dữ liệu hiện tại, nên LiftPath dùng giáo án Full Body cơ bản và đánh dấu phần cần kiểm tra.",
  // Include every reason code in the union.
};
```

- [ ] **Step 6: Run tests and commit**

Run: `npm run lint && npm run test`

```bash
git add src/features/coach/contracts.ts src/features/coach/explanations.ts src/types.ts tests/coach-contracts.test.ts
git commit -m "feat: define explainable coach decision contracts"
```

### Task 2: Build equipment-safe substitution and plan recommendation

**Files:**
- Create: `src/features/coach/substitution.ts`
- Create: `src/features/coach/plan-builder.ts`
- Create: `tests/coach-plan-builder.test.ts`

**Interfaces:**
- Produces: `isExerciseAvailable(exercise, equipment)`, `findSafeSubstitution(input)`, and `buildPlanRecommendation(input)`.
- Consumes: built-in programs/exercises, structured restrictions, and coach contracts from Task 1.

- [ ] **Step 1: Write failing substitution tests**

```ts
test("never falls back to the unavailable original exercise", () => {
  const result = findSafeSubstitution({
    exerciseId: "back_squat",
    equipment: ["dumbbell", "bodyweight"],
    restrictions: [],
    exercises: BUILT_IN_EXERCISES,
  });
  assert.notEqual(result.value?.id, "back_squat");
  assert.ok(result.value?.equipmentTags.every((tag) => ["dumbbell", "bodyweight"].includes(tag)));
});

test("returns no exercise when every compatible movement is restricted", () => {
  const result = findSafeSubstitution({
    exerciseId: "db_ohp",
    equipment: ["dumbbell", "bench"],
    restrictions: [{ id: "r1", bodyArea: "shoulder", affectedPatterns: ["vertical-push"], note: "pain" }],
    exercises: BUILT_IN_EXERCISES,
  });
  assert.equal(result.value, null);
  assert.equal(result.reasonCode, "pain-blocks-movement");
});
```

- [ ] **Step 2: Write failing plan-scoring tests**

```ts
test("beginner with three days receives an equipment-safe Full Body plan", () => {
  const result = buildPlanRecommendation(beginnerThreeDayInput);
  assert.equal(result.value.program.daysPerWeek, 3);
  assert.equal(result.value.invalidPrescriptionIds.length, 0);
  assert.ok(result.evidence.some((item) => item.key === "availableDays" && item.value === 3));
});

test("four-day intermediate receives Upper/Lower when session duration is sufficient", () => {
  const result = buildPlanRecommendation(intermediateFourDayInput);
  assert.equal(result.value.program.id, "upper-lower-4");
});
```

- [ ] **Step 3: Run tests and confirm missing functions**

Run: `npm run test`

Expected: missing module/function failures.

- [ ] **Step 4: Implement availability and ranked substitution**

Candidate ranking order:

1. Same movement pattern.
2. Same primary muscle.
3. All required equipment available.
4. No affected contraindication tag or restricted movement.
5. Tracking mode compatible with the original progression family.
6. Prefer an explicit alternative before a global library candidate.

Return `null` instead of the unavailable original when no candidate is safe.

- [ ] **Step 5: Implement plan scoring**

Use deterministic scores:

```ts
const scoreProgram = (program: TrainingProgram, input: PlanBuilderInput) => {
  let score = 0;
  if (program.daysPerWeek === input.availableDays) score += 100;
  if (input.experience === "beginner" && program.id === "full-body-3") score += 30;
  if (input.experience === "intermediate" && program.id === "upper-lower-4") score += 20;
  if (input.sessionMinutes < 60 && program.daysPerWeek > 4) score -= 40;
  return score;
};
```

Resolve every prescription through the substitution engine. Remove a blocked accessory; for a blocked primary prescription, insert a safe same-pattern candidate or mark the plan invalid and fall back to the safe default.

- [ ] **Step 6: Run tests and commit**

Run: `npm run lint && npm run test`

```bash
git add src/features/coach/substitution.ts src/features/coach/plan-builder.ts tests/coach-plan-builder.test.ts
git commit -m "feat: recommend equipment-safe Guided Coach plans"
```

### Task 3: Implement readiness adjustment engine

**Files:**
- Create: `src/features/coach/readiness.ts`
- Create: `tests/coach-readiness.test.ts`
- Modify: `src/types.ts`

**Interfaces:**
- Produces: `adjustWorkoutForReadiness(workout, input): CoachDecision<ReadinessAdjustment>`.
- Consumes: prescription priorities, optional flags, pain restrictions, available time, and substitution engine.

- [ ] **Step 1: Write failing readiness tests**

```ts
test("short sessions remove optional accessories before primary work", () => {
  const result = adjustWorkoutForReadiness(fullWorkout, {
    energy: "normal",
    soreness: "manageable",
    pain: null,
    availableMinutes: 35,
  });
  assert.ok(result.value.removedPrescriptionIds.length > 0);
  assert.ok(result.value.prescriptions.every((item) => item.priority !== "accessory" || !item.optional));
  assert.equal(result.reasonCode, "session-time-shortened");
});

test("low energy reduces working sets but preserves primary patterns", () => {
  const result = adjustWorkoutForReadiness(fullWorkout, {
    energy: "low",
    soreness: "manageable",
    pain: null,
    availableMinutes: 60,
  });
  assert.ok(result.value.prescriptions.filter((item) => item.priority === "primary").length >= 2);
  assert.ok(result.value.changedSetCounts.length > 0);
});

test("sharp knee pain blocks squat and lunge patterns", () => {
  const result = adjustWorkoutForReadiness(fullWorkout, {
    energy: "normal",
    soreness: "none",
    pain: { bodyArea: "knee", severity: "sharp", affectedPatterns: ["squat", "lunge"] },
    availableMinutes: 60,
  });
  assert.ok(result.value.blockedPrescriptionIds.length > 0);
  assert.equal(result.value.allowStart, false);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm run test`

Expected: readiness module missing.

- [ ] **Step 3: Implement adjustment priority exactly**

1. Apply safety/pain blocks.
2. Preserve at least one primary push, pull, and lower-body pattern when safe.
3. Remove optional accessories until estimated duration fits.
4. Reduce one working set from secondary/accessory work when energy is low or soreness high.
5. Reduce target effort by one RIR equivalent when recovery is poor.
6. Return a low-confidence unchanged workout when evidence is insufficient.

Do not mutate input objects; clone prescriptions and set schemes.

- [ ] **Step 4: Add readiness snapshot to drafts**

```ts
export type ReadinessSnapshot = {
  energy: "low" | "normal" | "high";
  soreness: "none" | "manageable" | "high";
  pain: PainConcern | null;
  availableMinutes: number;
  appliedReasonCodes: CoachReasonCode[];
};
```

- [ ] **Step 5: Run tests and commit**

Run: `npm run lint && npm run test`

```bash
git add src/features/coach/readiness.ts src/types.ts tests/coach-readiness.test.ts
git commit -m "feat: adjust workouts from readiness input"
```

### Task 4: Replace onboarding with a four-step guided flow

**Files:**
- Create: `src/features/onboarding/OnboardingFlow.tsx`
- Create: `src/features/onboarding/onboarding.css`
- Modify: `src/components/Onboarding.tsx`
- Modify: `src/App.tsx`
- Modify: `src/state.ts`

**Interfaces:**
- Produces: `OnboardingFlow({ initial, onComplete })` and state action `completeOnboarding(profile, recommendation)`.
- Consumes: `buildPlanRecommendation` and structured profile types.

- [ ] **Step 1: Extract a state-machine reducer**

```ts
export type OnboardingStep = "goal" | "schedule" | "experience" | "preview";

type Action =
  | { type: "next" }
  | { type: "back" }
  | { type: "patch-profile"; patch: Partial<UserProfile> };
```

The reducer must prevent advancing without required equipment and schedule values.

- [ ] **Step 2: Build Step 1 and Step 2**

Step 1 offers only `hypertrophy`, `strength`, and `general`; render fat loss as explanatory secondary context. Step 2 collects days, session minutes, equipment profile, and preferred days.

- [ ] **Step 3: Build Step 3 calibration**

Collect consistency, movement familiarity, optional recent loads, and effort language. Do not require load estimates.

- [ ] **Step 4: Build Step 4 plan preview**

Render program name, estimated duration, selection reasons, substitutions, estimated stimulus label, and warning state. Submit the exact `PlanRecommendation` shown; do not recompute a different result after confirmation.

- [ ] **Step 5: Wire state completion**

```ts
const completeOnboarding = useCallback((profile: UserProfile, recommendation: PlanRecommendation) => {
  setState((current) => touch({
    ...current,
    profile: { ...profile, onboardingComplete: true },
    settings: {
      ...current.settings,
      programId: recommendation.program.id,
      weeklyGoal: recommendation.program.daysPerWeek,
      trainingDays: [...recommendation.program.recommendedDays],
    },
  }));
}, []);
```

Persist generated/substituted plan variants as custom plans only when they differ from the canonical built-in program.

- [ ] **Step 6: Preserve compatibility export and commit**

```ts
export { OnboardingFlow as Onboarding } from "../features/onboarding/OnboardingFlow.js";
```

Run: `npm run check`

```bash
git add src/features/onboarding src/components/Onboarding.tsx src/App.tsx src/state.ts
git commit -m "feat: add four-step Guided Coach onboarding"
```

### Task 5: Add pre-workout readiness confirmation

**Files:**
- Create: `src/features/workout/ReadinessCheck.tsx`
- Modify: `src/App.tsx`
- Modify: `src/state.ts`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: state actions `prepareWorkout(dayId)`, `confirmReadiness(input)`, and `cancelPreparedWorkout()`.
- Consumes: `adjustWorkoutForReadiness` and current planned workout prescriptions.

- [ ] **Step 1: Split preparation from draft creation**

`prepareWorkout(dayId)` stores a transient `PreparedWorkout` containing the base prescriptions and program snapshot. It must not create a draft yet.

- [ ] **Step 2: Build the three-question readiness form**

Use large 44px+ buttons for energy and soreness, an explicit “không đau bất thường” default, optional body-area pain selector, and an available-time control.

- [ ] **Step 3: Render the adjustment preview**

Show exactly what changes: removed accessories, reduced sets, changed effort, substitutions, and safety block. Every row displays `decision.explanation`.

- [ ] **Step 4: Create the draft only after confirmation**

`confirmReadiness` applies the returned prescription list, stores `ReadinessSnapshot`, and creates logged-set rows. If `allowStart` is false, show stop/professional-advice copy and do not create a draft.

- [ ] **Step 5: Run full check and commit**

Run: `npm run check`

```bash
git add src/features/workout/ReadinessCheck.tsx src/App.tsx src/state.ts src/styles.css
git commit -m "feat: add pre-workout readiness coaching"
```

## Milestone Verification

Run:

```bash
npm ci
npm run check
```

Manual assertions:

- A beginner can complete onboarding and see one recommended plan.
- A no-rack equipment profile never receives a rack exercise.
- A 35-minute readiness selection removes accessories before primary work.
- A sharp-pain selection blocks unsafe start and contains no diagnostic claim.
- Confirming readiness creates a draft; cancelling leaves the base program unchanged.
