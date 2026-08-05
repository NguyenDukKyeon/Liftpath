# LiftPath 4.0 Guided Coach — Plan 02: Plan Builder, Onboarding and Readiness

> **Execution status:** Checkpoint B implemented on `agent/liftpath-4-guided-coach` at `d7a16821d483c371302175d760bac0f599941d6c`. Verification: GitHub Actions run `31011163577` passed type check, 40 tests, and production build. PR #4 remains draft and unmerged.

## Goal

Build the explainable plan recommendation layer, four-step onboarding, safe exercise substitution, readiness adjustment, and pre-workout confirmation flow on top of schema v4.

## Checkpoint acceptance

- [x] Coach decisions expose stable reason codes, evidence, confidence, and Vietnamese explanations.
- [x] Legacy profile notes migrate into structured coach fields without data loss.
- [x] Plan selection is deterministic across schedule, experience, goal, equipment, and duration.
- [x] Exercise substitution never falls back to an unavailable or restricted original movement.
- [x] Primary patterns without a safe replacement invalidate the plan instead of silently continuing.
- [x] Readiness adjustment prioritizes pain blocks, time shortening, set reduction, then effort reduction.
- [x] Sharp or unusual pain blocks unsafe workout start without diagnostic claims.
- [x] Guided onboarding follows goal → schedule/equipment → calibration → exact plan preview.
- [x] The exact previewed recommendation is persisted when onboarding is confirmed.
- [x] Workout selection creates transient preparation only; draft creation occurs after readiness confirmation.
- [x] Readiness snapshots survive storage normalization.
- [x] Responsive onboarding and readiness views build successfully.

## Implemented modules

### Coach contracts and explanations

- `src/features/coach/contracts.ts`
- `src/features/coach/explanations.ts`
- structured fields added to `UserProfile`
- compatibility normalization in `src/domain/storage.ts`

### Equipment-safe plan builder

- `src/features/coach/substitution.ts`
- `src/features/coach/plan-builder.ts`
- explicit alternatives → same movement pattern → same primary muscle
- equipment and restriction filters run before scoring
- unsafe primary prescriptions produce invalid-plan evidence

### Readiness engine

- `src/features/coach/readiness.ts`
- severe pain block
- accessory-first time reduction
- secondary/accessory set reduction under poor recovery
- effort reduction with immutable prescription cloning

### Four-step onboarding

- `src/features/onboarding/onboarding-state.ts`
- `src/features/onboarding/OnboardingFlow.tsx`
- `src/features/onboarding/onboarding.css`
- compatibility export in `src/components/Onboarding.tsx`
- exact recommendation persistence in `src/guided-state.ts`

### Pre-workout confirmation

- `src/features/workout/preparation.ts`
- `src/features/workout/ReadinessCheck.tsx`
- `src/features/workout/readiness.css`
- transient `PreparedWorkout`
- readiness-gated `GuidedDraft`
- storage preservation for readiness snapshots

## Verification evidence

Exact head:

```text
d7a16821d483c371302175d760bac0f599941d6c
```

GitHub Actions run:

```text
31011163577
```

Fresh result:

```text
Type check: success
Tests: 40 passed, 0 failed, 0 skipped
Production build: success
Deploy job: skipped
```

The workflow still reports one pre-existing moderate npm audit advisory. Dependencies were not changed as part of Checkpoint B.

## Deferred to later checkpoints

- Workout-session coaching and progression logic: Checkpoint C.
- Component tests, E2E tests, accessibility audit, browser/mobile manual review, and release gates: Checkpoint D.
