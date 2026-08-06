# LiftPath 4.0 Guided Coach — Plan 02: Plan Builder, Onboarding and Readiness

> **Execution status:** Checkpoint B implemented and verified. Branch head `7afc90e0eb82656c37da521752cd2e3dbaa93656`; GitHub Actions run `31011584213` passed type check, 40 tests, and production build. PR #4 remains draft and unmerged.

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

- `src/features/coach/contracts.ts`
- `src/features/coach/explanations.ts`
- `src/features/coach/substitution.ts`
- `src/features/coach/plan-builder.ts`
- `src/features/coach/readiness.ts`
- `src/features/onboarding/onboarding-state.ts`
- `src/features/onboarding/OnboardingFlow.tsx`
- `src/features/onboarding/onboarding.css`
- `src/features/workout/preparation.ts`
- `src/features/workout/ReadinessCheck.tsx`
- `src/features/workout/readiness.css`
- `src/guided-state.ts`

## Verification evidence

```text
Branch head: 7afc90e0eb82656c37da521752cd2e3dbaa93656
Workflow run: 31011584213
Type check: success
Tests: 40 passed, 0 failed, 0 skipped
Production build: success
Deploy job: skipped
```

The workflow still reports one pre-existing moderate npm audit advisory. Dependencies were not changed as part of Checkpoint B.

## Deferred

- Checkpoint C: workout-session coaching, progression, and recap.
- Checkpoint D: component tests, E2E, accessibility audit, browser/mobile manual review, and release gates.
