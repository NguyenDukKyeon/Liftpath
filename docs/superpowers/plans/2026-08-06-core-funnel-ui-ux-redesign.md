# LiftPath 4.1 Core Funnel UI/UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the LiftPath core funnel into the approved Athletic Precision / Focused Coach experience while preserving all LiftPath 4.0 domain and storage behavior.

**Architecture:** Keep the current React/Vite state and domain layers intact. Add a focused visual token layer and make bounded component-level interaction changes: optional onboarding disclosures, fast readiness, collapsed workout coaching/advanced editing and a flatter recap. Component tests define the new interaction contracts before production changes; Playwright verifies mobile hierarchy and regressions.

**Tech Stack:** React 19, TypeScript, Vite, CSS, Vitest, Testing Library, Playwright, axe-core, GitHub Actions.

## Global Constraints

- Work only on `agent/liftpath-4-1-ui-ux-redesign`, based on exact LiftPath 4.0 head `4f89213a41a6ffb6a47673ba8f86d97aa3e58631`.
- Do not change schema v4, migration, plan-builder, progression, storage or PWA semantics.
- No new runtime dependency.
- Athlete imagery appears only in onboarding plan preview.
- Active set controls and complete-set CTA must be visible at 390 × 844 without scrolling.
- Primary touch targets remain at least 44 × 44 px.
- Existing 65 domain tests, 4 component tests, 15 critical browser cases, 12 accessibility/responsive cases and 10 D2 cases must remain green.

---

### Task 1: Focused Coach visual foundation

**Files:**
- Create: `src/features/core-funnel/focused-coach.css`
- Modify: `src/main.tsx`
- Modify: `src/accessibility.css`
- Test: `tests/e2e/accessibility.spec.ts`

**Interfaces:**
- Produces CSS tokens and reusable class contracts for onboarding, readiness, workout and recap.
- Does not alter React state or domain APIs.

- [ ] **Step 1: Add a failing browser assertion for the new core-funnel theme marker**

Add an assertion that the rendered core funnel exposes `data-ui="focused-coach"` and that its primary CTA has at least a 44 px height.

- [ ] **Step 2: Run the accessibility/browser test and confirm it fails because the marker is absent**

Run: `npm run test:a11y -- --project=mobile-390`
Expected: FAIL on missing `[data-ui="focused-coach"]`.

- [ ] **Step 3: Add the visual foundation stylesheet and import it after existing feature CSS**

Define semantic tokens for charcoal surfaces, lime accent, strong numeric typography, compact radii, focus rings, open section rhythm and reduced motion. Add `data-ui="focused-coach"` to each core-funnel root as later tasks touch the components.

- [ ] **Step 4: Run the targeted accessibility test**

Expected: PASS for the theme marker and touch-target assertion.

- [ ] **Step 5: Commit**

`git commit -m "style: add focused coach visual foundation"`

### Task 2: Onboarding progressive disclosure and plan preview

**Files:**
- Modify: `src/features/onboarding/OnboardingFlow.tsx`
- Modify: `src/features/onboarding/onboarding.css`
- Create: `public/images/liftpath-athlete-preview.png`
- Test: `tests/components/onboarding.test.tsx`
- Test: `tests/e2e/onboarding-first-workout.spec.ts`

**Interfaces:**
- Preserves `OnboardingFlow({ initial, onComplete })`.
- Preserves exact `UserProfile` and `PlanRecommendation` values sent to `onComplete`.

- [ ] **Step 1: Write failing component tests**

Assert that:
- optional calibration content is collapsed by default;
- pressing `Tùy chỉnh nâng cao` reveals restrictions and recent-load controls;
- plan preview includes local athlete imagery with empty alt text because it is decorative.

- [ ] **Step 2: Run the onboarding component test and verify RED**

Run: `npm run test:component -- tests/components/onboarding.test.tsx`
Expected: FAIL because the disclosure and image do not exist.

- [ ] **Step 3: Implement the bounded markup changes**

Keep the four-step reducer. Move restrictions, notes and recent loads into semantic `<details>` disclosures. Recompose the plan preview into plan facts, decision list and athlete media. Do not change recommendation computation.

- [ ] **Step 4: Implement responsive Athletic Precision styling**

Use vertical goal rows on mobile, compact progress indicators, sticky footer and image-safe plan preview. Hide athlete imagery below 340 px only if required to prevent control compression.

- [ ] **Step 5: Run component and onboarding E2E tests**

Expected: component test PASS; onboarding-first-workout remains PASS at all configured viewports.

- [ ] **Step 6: Commit**

`git commit -m "feat: redesign guided onboarding flow"`

### Task 3: Fast readiness and correct duration default

**Files:**
- Modify: `src/features/workout/ReadinessCheck.tsx`
- Modify: `src/features/workout/readiness.css`
- Test: `tests/components/readiness.test.tsx`
- Test: `tests/e2e/readiness-short-session.spec.ts`
- Test: `tests/e2e/pain-safety.spec.ts`

**Interfaces:**
- Preserves `confirm(input: ReadinessInput)` and `cancel()`.
- Initial quick-start submits the neutral readiness input with prepared duration.
- Detailed mode continues to call `adjustWorkoutForReadiness` with the same contract.

- [ ] **Step 1: Write failing component tests**

Assert that:
- `Tập như kế hoạch` is visible initially;
- detailed controls are hidden initially;
- `Tôi cần điều chỉnh` reveals the controls;
- quick start calls `confirm` with `energy: "normal"`, `soreness: "manageable"`, `pain: null` and the prepared workout duration.

- [ ] **Step 2: Run readiness tests and verify RED**

Run: `npm run test:component -- tests/components/readiness.test.tsx`
Expected: FAIL because the current screen always renders detailed controls and defaults to 60 minutes.

- [ ] **Step 3: Implement fast readiness**

Add `mode: "quick" | "adjust"`. Derive initial minutes from `prepared.estimatedDurationMinutes` when present, then profile/session fallback exposed by `PreparedWorkout`; clamp to 25–90. Quick start calls `confirm` directly with the neutral input. Detailed mode preserves live adjustment and pain blocking.

- [ ] **Step 4: Recompose readiness styling**

Use a prominent quick-start row, a secondary adjust action, concise delta panel and explicit red blocked state. Detailed controls remain accessible after disclosure.

- [ ] **Step 5: Run component and relevant E2E tests**

Expected: readiness component PASS; short-session and pain-safety flows PASS.

- [ ] **Step 6: Commit**

`git commit -m "feat: add fast readiness flow"`

### Task 4: Set-first workout hierarchy

**Files:**
- Modify: `src/features/workout/WorkoutScreen.tsx`
- Modify: `src/features/workout/ExerciseCoachCard.tsx`
- Modify: `src/features/workout/SetTable.tsx`
- Modify: `src/features/workout/workout-guided.css`
- Modify: `src/features/workout/touch-targets.css`
- Test: `tests/components/set-table.test.tsx`
- Create: `tests/components/workout-screen.test.tsx`
- Modify: `tests/e2e/progression.spec.ts`
- Modify: `tests/e2e/accessibility.spec.ts`

**Interfaces:**
- Preserves all `useGuidedAppState` workout mutation methods.
- `ExerciseCoachCard` gains a collapsed-by-default disclosure without changing `decision` input.
- Advanced editing remains available under a semantic disclosure.

- [ ] **Step 1: Write failing tests for collapsed disclosures**

Assert that:
- coach explanation details are hidden until `Xem lý do` is activated;
- `Chi tiết & chỉnh sửa` is collapsed initially;
- replace, warm-up, plate calculator and add-set shortcuts remain directly available;
- effort remains optional and a valid set can complete without it.

- [ ] **Step 2: Run component tests and verify RED**

Run: `npm run test:component`
Expected: FAIL on missing disclosures/new hierarchy.

- [ ] **Step 3: Recompose WorkoutScreen**

Move set table immediately below a one-line coach summary. Keep timer context adjacent to the active set. Place direct shortcuts after the complete-set action. Move reorder, remove exercise, add exercise and note into `Chi tiết & chỉnh sửa`.

- [ ] **Step 4: Recompose SetTable for mobile**

Use large numeric fields, compact completed rows and an explicit previous-value strip. Preserve tracking modes, copy previous, undo and set-kind editing.

- [ ] **Step 5: Add above-the-fold browser assertion**

At 390 × 844, focus the first set input and assert the complete-set control intersects the viewport before scrolling. Keep no-overflow and focus visibility checks.

- [ ] **Step 6: Run component, progression and accessibility tests**

Expected: all PASS.

- [ ] **Step 7: Commit**

`git commit -m "feat: make workout logging set first"`

### Task 5: Flatter value-first recap

**Files:**
- Modify: `src/features/workout/WorkoutRecap.tsx`
- Modify: `src/features/workout/recap.css`
- Test: `tests/components/recap.test.tsx`
- Test: `tests/e2e/progression.spec.ts`

**Interfaces:**
- Preserves immutable recap data and `dismissRecap` behavior.
- Uses existing `wentWell`, `attention`, `nextTime` and `prs` arrays without recomputation.

- [ ] **Step 1: Write failing recap hierarchy test**

Assert that the first `nextTime` item is promoted as the primary next action, the three question sections remain present and metrics are secondary.

- [ ] **Step 2: Run recap test and verify RED**

Run: `npm run test:component -- tests/components/recap.test.tsx`
Expected: FAIL because no primary next-action hero exists.

- [ ] **Step 3: Implement the flatter recap composition**

Promote the first next action, render the three coaching sections as open list rows, keep PR highlight distinct and move metrics below coaching content.

- [ ] **Step 4: Run recap and progression tests**

Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat: redesign workout recap hierarchy"`

### Task 6: Full verification and stacked PR

**Files:**
- Modify: `docs/releases/4.0-manual-review.md` only if a redesign-specific manual note is required.
- Modify: PR metadata only for evidence.

**Interfaces:**
- Produces an exact verified branch head and stacked PR against `agent/liftpath-4-guided-coach`.

- [ ] **Step 1: Run whitespace integrity**

Run: `git diff --check 4f89213a41a6ffb6a47673ba8f86d97aa3e58631...HEAD`
Expected: no output.

- [ ] **Step 2: Run fast gate**

Run: `npm run check:fast`
Expected: TypeScript, 65 domain tests, component tests and production build PASS.

- [ ] **Step 3: Run browser gates**

Run: `npm run test:e2e && npm run test:a11y`
Expected: all critical and accessibility cases PASS at 360, 390 and 430 px.

- [ ] **Step 4: Run D2 regression gate**

Run the configured D2 Playwright matrix.
Expected: simulated iOS, Android, desktop and PWA/offline cases PASS.

- [ ] **Step 5: Inspect screenshots against the approved concept**

Compare onboarding, readiness, active workout and recap at 390 × 844. Record any intentional deviations; fix all clipped controls, hierarchy drift, palette drift and typography regressions.

- [ ] **Step 6: Open a draft stacked PR**

Base: `agent/liftpath-4-guided-coach`
Head: `agent/liftpath-4-1-ui-ux-redesign`

PR must remain draft until exact-head CI and visual review are recorded.
