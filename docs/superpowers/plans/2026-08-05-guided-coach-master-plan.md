# LiftPath 4.0 Guided Coach Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver LiftPath 4.0 as an explainable, equipment-safe Guided Coach for beginner and intermediate lifters while preserving all v3 user data.

**Architecture:** Implementation is split into four sequential, independently verifiable plans. Schema and migration establish stable contracts; plan building/readiness generate safe sessions; workout/progression/recap deliver the coaching loop; quality/release adds browser acceptance gates and prepares a draft PR without merging.

**Tech Stack:** React 19, TypeScript 5.8, Vite 8, Node 22, Node `node:test`, Vitest, Testing Library, Playwright, axe, GitHub Actions, Vercel preview checks.

## Global Constraints

- Implement only on `agent/liftpath-4-guided-coach`.
- Use TDD: failing test, verified failure, minimal implementation, verified pass, then commit.
- Do not merge, deploy production, or mark accepted automatically.
- Preserve v3 history, active draft, custom exercises/programs, body stats, settings, and backup/sync token sanitization.
- All automatic changes expose a stable reason code, Vietnamese explanation, confidence, and evidence.
- Pain behavior is conservative and non-diagnostic.
- No account system, social features, nutrition, AI-generated programming, wearables, or exercise-media expansion in this cycle.

---

## Execution Order

1. `docs/superpowers/plans/2026-08-05-guided-coach-01-schema-migration.md`
2. `docs/superpowers/plans/2026-08-05-guided-coach-02-plan-builder-onboarding-readiness.md`
3. `docs/superpowers/plans/2026-08-05-guided-coach-03-workout-progression-recap.md`
4. `docs/superpowers/plans/2026-08-05-guided-coach-04-quality-release.md`

Do not begin a later plan until the prior plan’s milestone verification passes at the exact branch head.

## Self-Review Decisions That Override Ambiguity

### Supported schedule values

`UserProfile.availableDays` becomes exactly:

```ts
export type AvailableTrainingDays = 2 | 3 | 4 | 5 | 6;
```

Plan generation rules:

- **2 days:** derive a two-day Full Body variant from `full-body-3`, alternating A/B and retaining balanced push, pull, squat/hinge, and optional accessory coverage.
- **3 days:** recommend canonical `full-body-3` for beginners and most intermediates.
- **4 days:** recommend canonical `upper-lower-4` when the user can sustain the session duration.
- **5 days:** derive `upper-lower-4` plus one explicitly optional short coach day using priority-muscle accessories; weekly goal remains 4 by default until the user confirms five sessions are sustainable.
- **6 days:** retain `ppl-6`, but do not recommend it to beginners and label it as a high-frequency choice.

Derived 2-day and 5-day variants are stored as custom generated programs only after confirmation. They must use the same equipment and restriction safety checks as canonical programs.

### Exact workout state actions

The implementation must expose consistent signatures:

```ts
updateSet(exerciseIndex: number, setIndex: number, patch: LoggedSetPatch): void;
completeSet(exerciseIndex: number, setIndex: number): number | null;
copyPreviousSet(exerciseIndex: number, setIndex: number): void;
addExerciseToDraft(prescription: ExercisePrescription, position?: number): void;
removeExerciseFromDraft(exerciseIndex: number): void;
moveExerciseInDraft(fromIndex: number, toIndex: number): void;
replaceExerciseInDraft(exerciseIndex: number, replacementId: ExerciseId, persistence: "session" | "always"): void;
```

Components may adapt these callbacks, but tests must assert the public state-action signatures above.

### Exact effort semantics

Logged effort is nullable:

```ts
export type LoggedEffort =
  | { mode: "rir"; value: number }
  | { mode: "rpe"; value: number }
  | null;
```

A set is completable from its tracking metrics alone. Blank effort lowers coaching confidence but never blocks completion.

### Exact migration behavior

- `STORAGE_KEY` becomes `liftpath-personal-v4`.
- Legacy lookup order is v3, v2, then v1.
- Migration warnings are persisted in memory/state for user-visible diagnostics but are excluded from normal coaching evidence.
- An unsupported logged set becomes manual-compatible data with a warning; it is not silently coerced into misleading tonnage.
- Historical snapshot fields are never recomputed from current exercise metadata after migration.

### Exact safety behavior

- `sharp`, `unusual`, `worsening`, or joint-specific pain sets `allowStart: false` for affected prescriptions until the user removes the concern or chooses a safe unrelated session.
- Manageable muscle soreness may reduce sets/effort but does not trigger diagnostic language.
- The UI copy must contain: “LiftPath không chẩn đoán chấn thương.”

### Exact test targets

Before the draft PR is eligible for manual review:

- At least 40 passing focused domain tests.
- Four passing component suites: onboarding, readiness, set logging, recap.
- Five passing mandatory E2E flows.
- Axe serious/critical violation count of zero on onboarding, readiness, workout, and recap.
- All three Playwright viewport projects pass: 360×800, 390×844, 430×932.

## Spec Coverage Map

| Design requirement | Implementation owner |
|---|---|
| Schema v4, prescription model, tracking modes | Plan 01 Tasks 1–2 |
| v3 migration and warning isolation | Plan 01 Tasks 3–5 |
| Explainable coach decision contract | Plan 02 Task 1 |
| Equipment-safe plan generation | Plan 02 Task 2 |
| 2–6 day recommendation behavior | Plan 02 Task 2 plus master schedule rules |
| Readiness and pain safety | Plan 02 Tasks 3 and 5 |
| Four-step onboarding and preview | Plan 02 Task 4 |
| Multiple progression strategies | Plan 03 Task 1 |
| Warm-up and plate calculators | Plan 03 Task 2 |
| Inline previous values and optional effort | Plan 03 Task 3 |
| Add/remove/reorder/substitute and preferences | Plan 03 Task 4 |
| One-current-task workout hierarchy | Plan 03 Task 5 |
| Three-question recap | Plan 03 Task 6 |
| Component/E2E/accessibility coverage | Plan 04 Tasks 1–4 |
| Version consistency, changelog, CI, draft PR | Plan 04 Tasks 5–6 |

## Checkpoints

- [ ] **Checkpoint A — Schema foundation:** `npm run check` passes and v3 fixture preservation assertions are green.
- [ ] **Checkpoint B — Session generation:** onboarding produces an equipment-safe preview and readiness creates a temporary, explained adjustment.
- [ ] **Checkpoint C — Coaching loop:** previous-set copy, optional effort, strategy progression, explicit substitution, and recap pass domain/build checks.
- [ ] **Checkpoint D — Release candidate:** complete local gate and CI pass at an exact commit SHA; PR remains draft pending manual mobile review.

## Plan Self-Review Result

- Spec coverage: every design section maps to at least one task above.
- Placeholder scan: no `TBD`, `TODO`, “implement later,” or unspecified test steps remain.
- Type consistency: schedule values, effort type, state-action signatures, storage key, and safety output are fixed in this master plan.
- Scope: four plans are sequential and independently reviewable; no deferred product subsystem is hidden inside implementation tasks.
