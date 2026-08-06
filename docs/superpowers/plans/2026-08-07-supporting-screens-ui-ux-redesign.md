# LiftPath 4.2 Supporting Screens UI/UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved Athletic Precision design system to the persistent application shell and the Hôm nay, Giáo án, Nhật ký, Tiến bộ and Cài đặt screens while preserving all existing business logic and persisted-data behavior.

**Architecture:** Keep the existing React screen components and domain state intact. Add explicit shell/screen identity in `App.tsx`, introduce one isolated Phase B stylesheet that overrides the legacy supporting-screen presentation through existing semantic class names, and add Playwright behavior/visual gates for every supporting destination. No schema, state, storage or coaching-engine files are modified.

**Tech Stack:** React 19, TypeScript, Vite, CSS, Lucide React, Vitest, Playwright, axe-core, GitHub Actions.

## Global Constraints

- Exact base: `6a4c1fd25fd8a477abfc0fdab46e1cd0c0dbeff9`.
- Branch: `agent/liftpath-4-2-supporting-screens-redesign`.
- Preserve schema v4, migrations, storage keys, backup format and PWA behavior.
- Preserve all visible feature inventory, navigation labels and domain decisions.
- Dark mode is the canonical Athletic Precision concept; light mode is a high-contrast companion, not the old sage-green theme.
- Existing Lucide icon family remains.
- No new runtime dependency.
- No production deployment from the feature branch.

---

### Task 1: Add an isolated Phase B CI gate

**Files:**
- Create: `.github/workflows/phase-b-ci.yml`

**Interfaces:**
- Consumes: branch `agent/liftpath-4-2-supporting-screens-redesign`, existing npm scripts.
- Produces: exact-head validate and browser jobs with uploaded Playwright artifacts.

- [ ] **Step 1: Create the branch-specific workflow**

Use Node 22. Run `git diff --check 6a4c1fd25fd8a477abfc0fdab46e1cd0c0dbeff9...HEAD`, `npm ci`, production audit, `npm run check:fast`, critical E2E, accessibility and D2 tests. Use the Playwright 1.62.1 Noble container for browser tests.

- [ ] **Step 2: Verify the workflow starts on branch pushes**

Expected: a `Phase B supporting screens checks` run appears after the next commit.

### Task 2: Lock supporting-shell identity with a failing browser test

**Files:**
- Create: `tests/e2e/supporting-screens.spec.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `returningUserState()` and `seedState()` test helpers.
- Produces: `data-ui="athletic-supporting"`, `data-screen=<tab>` and tab-specific page-content classes.

- [ ] **Step 1: Write the failing test**

The test seeds a returning user, opens `/`, expects the persistent shell to expose `data-ui="athletic-supporting"` and `data-screen="today"`, then navigates through `Giáo án`, `Nhật ký`, `Tiến bộ` and `Cài đặt`, expecting `data-screen` to update for each destination while the corresponding heading remains visible.

- [ ] **Step 2: Run the branch workflow and verify RED**

Expected: browser test fails because the shell identity attributes do not exist.

- [ ] **Step 3: Implement the minimal shell identity**

In `App.tsx`:

- Add `data-ui="athletic-supporting"` and `data-screen={tab}` to `.app-shell`.
- Add `screen-${tab}` to `.page-content`.
- Do not alter navigation behavior or screen props.

- [ ] **Step 4: Verify GREEN**

Expected: the new test and existing critical E2E tests pass.

### Task 3: Implement the shared Athletic Precision shell and token layer

**Files:**
- Create: `src/features/supporting-screens/athletic-supporting.css`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: existing app-shell, navigation, header, card, button, form and modal class names.
- Produces: dark and light Athletic Precision token scopes, responsive shell, control primitives and focus states.

- [ ] **Step 1: Add a visual assertion that fails on the legacy shell**

Extend `tests/e2e/supporting-screens.spec.ts` to assert:

- desktop rail background is dark in dark mode;
- active navigation has a lime-accented state;
- the main content background differs from the legacy sage surface;
- bottom navigation targets remain at least 44 px high on mobile.

- [ ] **Step 2: Verify RED**

Expected: computed-style assertions fail against the legacy supporting-shell CSS.

- [ ] **Step 3: Add the shared stylesheet**

Define:

- dark charcoal canvas and surfaces;
- electric-lime accent and focus ring;
- light companion palette without sage tokens;
- compact desktop rail and centered frame;
- mobile header and bottom navigation;
- card, button, input, select, textarea, toggle, modal and alert primitives;
- reduced-motion handling.

Import the stylesheet last in `src/main.tsx` so it intentionally overrides legacy supporting-screen rules without changing core-funnel files.

- [ ] **Step 4: Verify GREEN**

Expected: shell visual assertions, critical E2E and existing accessibility tests pass.

### Task 4: Redesign Hôm nay and Giáo án

**Files:**
- Modify: `src/features/supporting-screens/athletic-supporting.css`
- Create: `tests/e2e-d2/supporting-visual-review.spec.ts`

**Interfaces:**
- Consumes: `.screen-today`, `.screen-programs` and current screen markup.
- Produces: exact-head screenshots for mobile and desktop.

- [ ] **Step 1: Write failing layout assertions**

For Hôm nay:

- the next-workout hero is the first major region;
- the primary `Bắt đầu tập` target is at least 44 px;
- the program selector is visually secondary;
- no horizontal overflow exists.

For Giáo án:

- selected program is visibly distinct;
- workout tabs remain usable at 360 px;
- `Bắt đầu` and editor actions remain reachable;
- exercise rows do not clip.

- [ ] **Step 2: Verify RED where legacy presentation violates the new computed-style/layout expectations**

- [ ] **Step 3: Implement screen-specific CSS**

Hôm nay:

- strong next-workout hero;
- compact weekly progress and metrics;
- secondary program rail;
- open structured exercise rows;
- restrained alerts and recent-session treatment.

Giáo án:

- compact program selector;
- dominant selected-program overview;
- dark workout tabs;
- dense exercise prescription rows;
- secondary custom-program controls.

- [ ] **Step 4: Capture screenshots**

Capture `phase-b-today.png` and `phase-b-programs.png` in iOS WebKit, Android Chromium and desktop Chromium.

### Task 5: Redesign Nhật ký and Tiến bộ

**Files:**
- Modify: `src/features/supporting-screens/athletic-supporting.css`
- Modify: `tests/e2e-d2/supporting-visual-review.spec.ts`

**Interfaces:**
- Consumes: `.screen-history`, `.screen-insights` and seeded fixture data.
- Produces: readable session timeline and analytical command-center layouts.

- [ ] **Step 1: Add failing visual/layout assertions**

Nhật ký:

- summary metrics are readable at 360 px;
- session cards use a clear timeline hierarchy;
- details and delete action remain accessible.

Tiến bộ:

- weekly score is the first analytical focal region;
- recommendation, muscle bars and body form remain distinct;
- no labels truncate at 360 px.

- [ ] **Step 2: Verify RED**

- [ ] **Step 3: Implement screen-specific CSS**

Use compact metric strips, structured list rows, lime progress bars, semantic warning surfaces and responsive analytical grids.

- [ ] **Step 4: Capture screenshots**

Capture `phase-b-history.png` and `phase-b-insights.png` across the D2 matrix.

### Task 6: Redesign Cài đặt and supporting states

**Files:**
- Modify: `src/features/supporting-screens/athletic-supporting.css`
- Modify: `tests/e2e-d2/supporting-visual-review.spec.ts`
- Modify: `tests/e2e/accessibility.spec.ts`

**Interfaces:**
- Consumes: `.screen-settings`, settings section classes, common modal/dialog classes.
- Produces: grouped settings layout and accessibility coverage for all supporting destinations.

- [ ] **Step 1: Add failing settings assertions**

Assert:

- theme buttons and day picker expose visible selected states;
- toggles and primary actions meet touch-target requirements;
- backup, sync and danger regions remain visually distinct;
- no horizontal overflow.

- [ ] **Step 2: Add supporting-screen axe coverage**

Seed a returning user and run axe on each of the five tabs at mobile widths. Reject serious and critical violations.

- [ ] **Step 3: Verify RED**

- [ ] **Step 4: Implement settings and common-state CSS**

Style theme picker, settings rows, toggles, form grids, backup/sync actions, danger region, empty states, alerts, modal surfaces and toast.

- [ ] **Step 5: Verify GREEN**

Expected: supporting-screen accessibility cases pass at 360, 390 and 430 px.

### Task 7: Exact-head fidelity and regression gate

**Files:**
- Modify only files required by defects discovered during visual review.

**Interfaces:**
- Consumes: approved concept image and Playwright screenshot artifact.
- Produces: agency-signoff fidelity ledger and exact-head evidence.

- [ ] **Step 1: Run full validation**

Required:

- diff integrity;
- production audit;
- TypeScript;
- 65 domain tests;
- all component tests;
- production build;
- critical E2E;
- accessibility/responsive;
- D2/PWA;
- supporting-screen matrix.

- [ ] **Step 2: Review screenshots directly**

Compare Hôm nay, Giáo án, Nhật ký, Tiến bộ and Cài đặt in dark mode against the approved Athletic Precision concept. Check shell, palette, hierarchy, typography, spacing, borders, icon treatment and responsive behavior.

- [ ] **Step 3: Fix every material mismatch**

Do not lower axe thresholds, force clicks or hide overflow defects.

- [ ] **Step 4: Re-run exact-head validation**

Expected: all gates pass on one exact commit.

- [ ] **Step 5: Open a draft PR to `main`**

PR body records exact head, workflow run, test counts, artifact digest, reviewed screenshots, intentional deviations and product-owner preview review as the only remaining manual gate.
