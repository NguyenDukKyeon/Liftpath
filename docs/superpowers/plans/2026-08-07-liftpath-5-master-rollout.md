# LiftPath 5 Master Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver LiftPath 5 as a clean-slate, offline-first personal training coach while keeping LiftPath 4 stable until V5 passes release gates.

**Architecture:** Build V5 in an isolated `src/v5/` namespace with a deterministic TypeScript domain core, application use cases, repository ports, native IndexedDB infrastructure, and a React presentation layer. Expose V5 through an explicit preview entry while V4 remains the default, then switch the default only after all slice plans and release gates pass.

**Tech Stack:** React 19.2, TypeScript 5.8, Vite 8, native IndexedDB, Node `node:test` domain tests, Vitest + Testing Library component tests, Playwright E2E/a11y/device tests, existing PWA service-worker approach.

## Global Constraints

- Product mode: Personal Coach, not a full social fitness platform.
- Audience: beginner through intermediate.
- Primary goals: Hypertrophy, Strength, General Fitness.
- Specialization model: one primary specialization plus at most one secondary focus.
- V-Shape / V-Taper is the flagship specialization and reference acceptance path.
- Coach authority: Coach recommends; user accepts, modifies, or skips material changes.
- User owns the selected split/training structure; normal Coach adaptation cannot replace or proactively change it.
- Coach core is deterministic; no LLM-generated prescription in V5.0.
- Physique specialization progress uses training data only; readiness inputs such as energy, soreness, and user-reported pain remain allowed training-state inputs.
- V5 uses a clean-slate schema and must not migrate, clear, convert, or overwrite V4 data.
- Runtime is local-first/offline-capable with no mandatory account or backend.
- IndexedDB is V5 primary persistence; no giant whole-app JSON blob in localStorage.
- Raw completed training records are authoritative; derived summaries may be rebuilt.
- Program and Coach policy changes are versioned.
- Specialization redistributes workload before blindly increasing total workload.
- Exact workload bounds, indirect-set coefficients, and similar heuristics are explicit versioned policy constants, not universal physiological truths.
- Safety outranks progression; pain flags block normal progression for the affected movement.
- Minimum Effective Intervention: do not change a working prescription without evidence.
- No fake physique inference or opaque precision scores.
- V5.0 excludes mandatory cloud sync, social/community, nutrition planning, generic AI chat, camera physique analysis, and V4 data migration.

---

## Plan Set and Dependency Order

Implement these plans in order. Each plan ends in a working, independently reviewable vertical slice.

1. `2026-08-07-liftpath-5-foundation-data-recovery.md`
   - Isolated V5 preview shell.
   - Domain primitives and version identifiers.
   - Native IndexedDB schema and repository ports.
   - Atomic persistence, storage errors, recovery snapshots, backup round-trip.

2. `2026-08-07-liftpath-5-workout-core.md`
   - Exercise/program/session/set domain.
   - Fast atomic set logging.
   - Active-workout resume after reload/crash.
   - Initial load calibration and basic workout completion.

3. `2026-08-07-liftpath-5-prescription-onboarding.md`
   - Goal + specialization model.
   - Curated exercise metadata seed.
   - Split proposals.
   - Constraint-based initial prescription.
   - Onboarding and program preview/approval.

4. `2026-08-07-liftpath-5-coach-vshape-adaptation.md`
   - Observation, diagnosis, confidence, recommendation priority.
   - Progression/effort/adherence reasoning.
   - Flagship V-Shape policy.
   - Accept/Modify/Skip and program-version changes.
   - Pain/deload safeguards and audit trail.

5. `2026-08-07-liftpath-5-training-lifecycle.md`
   - Persisted readiness as training-state input.
   - Stable training-block/mesocycle records.
   - End-of-block review without automatic program replacement.
   - User-initiated goal/specialization transitions that preserve structure/history.

6. `2026-08-07-liftpath-5-product-ux.md`
   - Today / Program / Progress / History IA.
   - Coach decision queue.
   - Focused Workout Mode and readiness.
   - Recap, substitutions, progressive disclosure, responsive design.

7. `2026-08-07-liftpath-5-hardening-release.md`
   - Golden Coach scenarios and invariant/property-style coverage.
   - Corruption/error injection and backup recovery.
   - Large-history performance gates.
   - Accessibility/device/offline gates.
   - Preview soak, release switch, rollback/storage isolation verification.

## File Structure Locked for V5

New V5 production code belongs under:

```text
src/v5/
  app/
  domain/
    common/
    exercises/
    training/
    programming/
    coaching/
  application/
    ports/
    workouts/
    programs/
    coaching/
    backup/
    recovery/
  infrastructure/
    db/
    repositories/
    backup/
  presentation/
    components/
    onboarding/
    today/
    workout/
    program/
    progress/
    history/
    settings/
  styles/
```

New V5 tests belong under:

```text
tests/v5/
  domain/
  application/
  fixtures/
  scenarios/
  performance/

tests/components/v5/
tests/e2e/v5/
```

Do not place new V5 domain logic into legacy files such as `src/state.ts`, `src/data.ts`, `src/domain/training.ts`, or `src/features/coach/*`. V4 remains available as a stable implementation until the release-switch task.

## Cross-Plan Interfaces

The following names are shared contracts across plans and must remain stable unless a dedicated refactor task updates every consumer and test in one commit:

```ts
export type EntityId = string;
export type ISODateTime = string;
export type PolicyVersion = `${number}.${number}.${number}`;

export type PrimaryGoal = "hypertrophy" | "strength" | "general_fitness";
export type TrainingLevel = "beginner" | "intermediate";
export type DecisionState = "pending" | "accepted" | "modified" | "skipped";

export interface Clock {
  now(): ISODateTime;
}

export interface IdGenerator {
  next(prefix: string): EntityId;
}
```

Repository ports must expose task-specific methods rather than a generic `saveAppState()` API. Transactions that change multiple authoritative records must be explicit application use cases.

## Rollout Branching Rule

At execution time, create an isolated worktree/branch using `superpowers:using-git-worktrees`. Implement each plan as a reviewable sequence of small commits. Do not implement directly on `main`.

The default application remains V4 while the V5 preview flag is being built. The preview selector may use `?v5=1` initially; the final release plan removes the temporary default-V4 assumption only after release gates pass.

## Review Gate After Each Plan

Before starting the next plan:

- run every command listed in that plan's final verification task;
- inspect `git diff --stat` and `git status --short`;
- confirm no V4 storage key/schema is modified unless the task explicitly concerns safe preview routing;
- confirm the plan's E2E acceptance path works in an actual browser;
- request code review with `superpowers:requesting-code-review` for the completed slice.

## Final Product Gate

V5 cannot become the default until all seven plans are complete and the final release plan proves:

```text
Data integrity          PASS
Crash resume            PASS
Backup round-trip       PASS
Corruption recovery     PASS
Coach determinism       PASS
V-Shape golden cases    PASS
Pain safety invariant   PASS
Training lifecycle      PASS
Core mobile E2E         PASS
Accessibility gate      PASS
Offline core flow       PASS
Large-history gate      PASS
V4 storage isolation    PASS
```

If any gate fails, keep V4 as the default and fix the failing slice; do not lower the gate to ship.