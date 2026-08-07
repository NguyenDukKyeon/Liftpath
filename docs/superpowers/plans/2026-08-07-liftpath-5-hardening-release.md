# LiftPath 5 Hardening and Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove LiftPath 5 is safe to become the default by hardening Coach correctness, persistence/recovery, large-history performance, accessibility, offline behavior, storage isolation, preview release flow, and rollback behavior.

**Architecture:** Treat release readiness as executable gates, not subjective polish. Add deterministic scenario/invariant suites, browser-level corruption/error injection, synthetic history benchmarks, PWA/offline verification, and an explicit runtime switch that keeps V4 rollback possible while V5 uses its own database identity.

**Tech Stack:** Existing TypeScript/React/Vite stack, Node `node:test`, Vitest, Playwright, existing service worker/PWA setup, browser Performance API.

## Global Constraints

- No release claim without fresh verification evidence.
- V4 storage remains untouched even after V5 becomes default.
- Rollback to V4 must not require reading V5 schema or destroying V5 DB.
- No silent data loss; failed writes/imports/migrations remain visible and recoverable.
- Coach determinism and safety invariants are release blockers.
- Core functionality works offline after first successful app load/install.
- Performance gates include large historical datasets and set-completion latency.
- Core funnel target: returning user can reach first working set quickly; use measured browser timing, not assertion by inspection.
- Accessibility: zero serious/critical automated violations in V5 core funnel plus manual keyboard/focus verification.
- No backend/cloud requirement is introduced by release hardening.

---

## File Map

**Create**
- `tests/v5/scenarios/coach-invariants.test.ts`
- `tests/v5/scenarios/coach-determinism.test.ts`
- `tests/v5/fixtures/history-factory.ts`
- `tests/v5/performance/query-budget.test.ts`
- `tests/e2e/v5/corruption-recovery.spec.ts`
- `tests/e2e/v5/storage-failure.spec.ts`
- `tests/e2e/v5/backup-roundtrip.spec.ts`
- `tests/e2e/v5/large-history.spec.ts`
- `tests/e2e/v5/offline-pwa.spec.ts`
- `tests/e2e/v5/v4-storage-isolation.spec.ts`
- `tests/e2e/v5/release-gate.spec.ts`
- `src/v5/application/recovery/recovery-state.ts`
- `src/v5/application/recovery/repair-database.ts`
- `src/v5/presentation/settings/RecoveryPanel.tsx`
- `src/v5/presentation/settings/BackupPanel.tsx`
- `src/v5/presentation/settings/storage-errors.tsx`
- `src/v5/app/runtime-config.ts`
- `docs/releases/liftpath-5-release-checklist.md`

**Modify**
- `src/main.tsx`
- `src/v5/app/select-runtime.ts`
- `src/v5/app/V5PreviewApp.tsx`
- `src/v5/presentation/settings/SettingsPanel.tsx`
- `src/v5/infrastructure/db/open-db.ts`
- `src/v5/application/backup/import-backup.ts`
- `public/sw.js` if V5 assets/offline routes require explicit cache-list updates; preserve same-origin cache rules.
- `package.json` only if a new explicit V5 verification script materially improves reproducibility; do not add runtime dependencies.

## Release Runtime Contract

```ts
export type RuntimeMode = "v4" | "v5";

export interface RuntimeConfig {
  defaultRuntime: RuntimeMode;
  allowV5PreviewQuery: boolean;
}
```

During preview: `{ defaultRuntime: "v4", allowV5PreviewQuery: true }`.
After final gate: `{ defaultRuntime: "v5", allowV5PreviewQuery: true }` so `?v5=0` or an explicit rollback build can still expose V4 during the controlled transition.

### Task 1: Coach invariant and determinism release suite

**Files:** scenario test files.

- [ ] **Step 1: Add safety invariant matrix**

Generate representative contexts across goals/specializations and assert:
- any affected-exercise pain flag => no normal `set_load` increase for that exercise;
- normal Coach adaptation never changes structure ID/session count;
- workload set-count patches remain inside policy bounds;
- `evidenceIds` are non-empty for material recommendations;
- `decisionState` is never auto-accepted by pure Coach output.

- [ ] **Step 2: Add determinism matrix**

For each golden context, evaluate 100 times and deep-equal the serialized domain output. Evaluate under two browser/node timezone settings using an explicit fixed `context.now`; output must remain identical.

- [ ] **Step 3: Run focused suite**

Run: `npm run test:domain -- --test-name-pattern="invariant|determinism|VSHAPE-"`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/v5/scenarios
git commit -m "test(v5): lock Coach safety and determinism gates"
```

### Task 2: Recovery state instead of empty-app fallback

**Files:** recovery application files, `RecoveryPanel.tsx`, corruption E2E.

**Interfaces:**

```ts
export type RecoveryState =
  | { kind: "healthy" }
  | { kind: "corrupt"; message: string; rawExportAvailable: boolean; snapshotIds: EntityId[] };
```

- [ ] **Step 1: Write failing corruption E2E**

Create valid V5 DB, deliberately write a structurally invalid authoritative record using direct browser IndexedDB, reload, and assert the app displays recovery mode rather than onboarding/empty history.

- [ ] **Step 2: Run focused E2E and verify failure**

Run: `npx playwright test tests/e2e/v5/corruption-recovery.spec.ts`

Expected: FAIL.

- [ ] **Step 3: Implement startup validation and recovery state**

Validate required record shape/references during hydration/query boundaries. On corruption, keep raw DB untouched, return `RecoveryState.corrupt`, and offer actions: export raw recovery bundle, restore known snapshot, attempt bounded repair, reset V5 only.

- [ ] **Step 4: Implement bounded repair**

Repair may rebuild derived caches/indexable state from authoritative records and remove only invalid derived records. It must not invent or silently drop invalid authoritative workout sets; if authoritative data cannot be safely repaired, keep recovery mode.

- [ ] **Step 5: Run corruption E2E and commit**

```bash
npx playwright test tests/e2e/v5/corruption-recovery.spec.ts
git add src/v5/application/recovery src/v5/presentation/settings/RecoveryPanel.tsx tests/e2e/v5/corruption-recovery.spec.ts
git commit -m "feat(v5): enter recovery mode on corrupted data"
```

### Task 3: Storage/quota failure injection

**Files:** storage error presentation, test.

- [ ] **Step 1: Write failing storage-failure E2E**

Patch the V5 repository transaction call in the test harness to reject on set completion. Assert entered load/reps remain on screen, `Set saved` never appears, a persistent error explains data was not saved, and Retry can complete after the injected failure is removed.

- [ ] **Step 2: Run focused E2E**

Run: `npx playwright test tests/e2e/v5/storage-failure.spec.ts`

Expected: FAIL until injection/UI path is wired.

- [ ] **Step 3: Standardize storage error copy/state**

Provide one presentation mapper from `LiftPathV5Error` to recoverable actions. Do not use empty catches around authoritative persistence.

- [ ] **Step 4: Run E2E and commit**

```bash
npx playwright test tests/e2e/v5/storage-failure.spec.ts
git add src/v5/presentation/settings/storage-errors.tsx src/v5/presentation/workout tests/e2e/v5/storage-failure.spec.ts
git commit -m "test(v5): prove workout storage failures are visible"
```

### Task 4: Backup/import destructive-action gate

**Files:** `BackupPanel.tsx`, import use case, backup E2E.

- [ ] **Step 1: Write full backup round-trip E2E**

Seed profile, active program with multiple versions, 100 sessions, sets, recommendations/decisions, and recovery metadata. Export backup, record authoritative IDs/counts, reset V5 DB, import backup, and compare every authoritative ID/count and selected representative values.

- [ ] **Step 2: Add malformed/tampered import cases**

Tamper checksum, remove required record, and change unsupported schema version. Assert preview rejects each case before any DB mutation.

- [ ] **Step 3: Add pre-import snapshot assertion**

Before a valid destructive import, seed current local records; after import, assert a recovery snapshot containing the pre-import IDs exists.

- [ ] **Step 4: Run E2E**

Run: `npx playwright test tests/e2e/v5/backup-roundtrip.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/v5/presentation/settings/BackupPanel.tsx src/v5/application/backup/import-backup.ts tests/e2e/v5/backup-roundtrip.spec.ts
git commit -m "test(v5): verify backup preview recovery and round trip"
```

### Task 5: Synthetic large-history fixtures and query budget

**Files:** history factory, query performance test.

**Interfaces:**

```ts
export function buildSyntheticHistory(input: {
  sessionCount: 500 | 2000 | 10000;
  setsPerSession: number;
  startAt: ISODateTime;
}): { sessions: TrainingSession[]; sets: CompletedSet[] };
```

- [ ] **Step 1: Write deterministic fixture test**

Generate 500 sessions twice from same input and assert IDs/timestamps/data are identical. Generate 10,000 sessions and assert no duplicate IDs.

- [ ] **Step 2: Implement fixture factory**

Use deterministic index-derived IDs/timestamps; do not call random UUID or current clock.

- [ ] **Step 3: Write query-budget tests**

Instrument repository/query functions to count returned/scanned records. Assert Today/start-workout queries do not request all historical sessions/sets; History defaults to a 20-session page; CoachContext builder limits exercise/session windows.

- [ ] **Step 4: Run tests**

Run: `npm run test:domain -- --test-name-pattern="synthetic history|query budget"`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/v5/fixtures/history-factory.ts tests/v5/performance/query-budget.test.ts
git commit -m "test(v5): enforce bounded large-history queries"
```

### Task 6: Browser large-history performance gate

**Files:** `large-history.spec.ts`.

- [ ] **Step 1: Seed 500 / 2,000 / 10,000-session databases in browser**

Use bulk seed helper in test setup, not production UI.

- [ ] **Step 2: Measure four critical operations**

Use `performance.now()` around:
- V5 startup to Today ready;
- opening History first page;
- entering Workout Mode;
- completing/persisting one set.

Record values into Playwright test annotations/output.

- [ ] **Step 3: Add conservative release thresholds**

For local CI reference hardware, require set persistence/UI acknowledgement under 200 ms at 10,000 sessions and require no worse than 2x the 500-session time for Today/start-workout paths. Keep Web Vitals product targets as separate browser metrics rather than pretending local CI equals field p75.

- [ ] **Step 4: Run focused performance suite**

Run: `npx playwright test tests/e2e/v5/large-history.spec.ts --project=chromium`

Expected: PASS with timing annotations.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/v5/large-history.spec.ts
git commit -m "test(v5): gate large-history interaction performance"
```

### Task 7: Accessibility and device gate

**Files:** navigation/a11y specs plus release gate spec.

- [ ] **Step 1: Add axe checks to all core V5 states**

Test onboarding, Today, recommendation card/dialog, readiness, Workout Mode, recap, Program, Progress, History, Settings/Recovery. Fail on serious/critical violations.

- [ ] **Step 2: Add manual-behavior automated checks**

Verify dialog initial focus, focus trap, Escape close where allowed, focus restoration, visible `:focus-visible`, keyboard-only set logging, and accessible labels for numeric inputs.

- [ ] **Step 3: Add viewport/device coverage**

Run 360x800 mobile, 390x844 mobile, tablet, and 1440x900 desktop. Assert no horizontal overflow on core screens and primary actions remain reachable.

- [ ] **Step 4: Run suites**

Run: `npm run test:a11y && npx playwright test tests/e2e/v5/navigation-a11y.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/v5/navigation-a11y.spec.ts tests/e2e/v5/release-gate.spec.ts src/v5/styles
git commit -m "test(v5): enforce accessibility and device gates"
```

### Task 8: Offline PWA core-flow gate

**Files:** `offline-pwa.spec.ts`, optional `public/sw.js` adjustment.

- [ ] **Step 1: Write offline E2E**

Load/install V5 preview online once, seed active program, reload to ensure assets are cached, set browser context offline, then navigate Today -> readiness -> Workout Mode -> complete set -> complete workout -> History. Assert all authoritative operations work offline.

- [ ] **Step 2: Run focused E2E and inspect failures**

Run: `npx playwright test tests/e2e/v5/offline-pwa.spec.ts`

Expected before any needed service-worker update: test reveals exactly which V5 asset/route is missing.

- [ ] **Step 3: Update service-worker cache policy only if test proves necessity**

Keep same-origin-only asset caching and avoid caching arbitrary remote/network content. Do not introduce background network dependency for Coach.

- [ ] **Step 4: Re-run offline E2E and commit**

```bash
npx playwright test tests/e2e/v5/offline-pwa.spec.ts
git add public/sw.js tests/e2e/v5/offline-pwa.spec.ts
git commit -m "test(v5): verify offline workout core"
```

If `public/sw.js` required no change, omit it from `git add`.

### Task 9: V4 storage isolation gate

**Files:** `v4-storage-isolation.spec.ts`.

- [ ] **Step 1: Seed representative V4 storage before opening V5**

Capture V4 localStorage key/value snapshot and any known V4 database names visible through `indexedDB.databases()` when supported.

- [ ] **Step 2: Exercise V5 destructive operations**

Create V5 data, export/import, reset V5, restore V5 snapshot, reload.

- [ ] **Step 3: Assert V4 snapshot remains byte-for-byte unchanged**

The test fails if any V4 key/value or database is deleted/rewritten.

- [ ] **Step 4: Run and commit**

```bash
npx playwright test tests/e2e/v5/v4-storage-isolation.spec.ts
git add tests/e2e/v5/v4-storage-isolation.spec.ts
git commit -m "test(v5): prove V4 storage isolation"
```

### Task 10: Preview soak configuration and release checklist

**Files:** `runtime-config.ts`, `select-runtime.ts`, release checklist.

- [ ] **Step 1: Replace query-only logic with explicit config**

```ts
export const RUNTIME_CONFIG: RuntimeConfig = {
  defaultRuntime: "v4",
  allowV5PreviewQuery: true,
};
```

`selectRuntime(search, config)` uses explicit `v5=1`/`v5=0` override only when allowed, otherwise returns `defaultRuntime`.

- [ ] **Step 2: Write selector tests for preview and rollback modes**

Assert preview config defaults V4; release config defaults V5; explicit rollback query can choose V4 during transition.

- [ ] **Step 3: Create release checklist document**

The checklist contains exact commands from Task 11 and a field for observed result/commit SHA. It is not a substitute for command output.

- [ ] **Step 4: Commit**

```bash
git add src/v5/app/runtime-config.ts src/v5/app/select-runtime.ts docs/releases/liftpath-5-release-checklist.md tests/components/v5/V5PreviewApp.test.tsx
git commit -m "chore(v5): prepare preview soak and release switch"
```

### Task 11: Full release verification before changing default

**Files:** none unless verification finds a defect.

- [ ] **Step 1: Run fast/static build gate**

Run: `npm run check:fast`

Expected: exit 0.

- [ ] **Step 2: Run full V5 domain/scenario suite**

Run: `npm run test:domain`

Expected: 0 failures, including V4 domain tests and all V5 golden/invariant tests.

- [ ] **Step 3: Run V5 component suite**

Run: `npx vitest run tests/components/v5`

Expected: 0 failures.

- [ ] **Step 4: Run V5 E2E gate set**

Run:

```bash
npx playwright test \
  tests/e2e/v5/core-funnel.spec.ts \
  tests/e2e/v5/coach-adaptation.spec.ts \
  tests/e2e/v5/backup-roundtrip.spec.ts \
  tests/e2e/v5/corruption-recovery.spec.ts \
  tests/e2e/v5/storage-failure.spec.ts \
  tests/e2e/v5/offline-pwa.spec.ts \
  tests/e2e/v5/v4-storage-isolation.spec.ts \
  tests/e2e/v5/navigation-a11y.spec.ts
```

Expected: 0 failures.

- [ ] **Step 5: Run large-history gate separately**

Run: `npx playwright test tests/e2e/v5/large-history.spec.ts --project=chromium`

Expected: thresholds pass and output contains measured timings.

- [ ] **Step 6: Run existing V4 regression suites**

Run: `npm run test:e2e && npm run test:a11y && npm run test:d2`

Expected: 0 failures.

- [ ] **Step 7: Inspect repository scope**

Run:

```bash
git status --short
git diff --stat main...HEAD
git diff --check main...HEAD
```

Expected: clean worktree before release-switch commit; no whitespace errors.

- [ ] **Step 8: Do not change default if any command fails**

Record the actual failing command/output, fix via a focused task/commit, and rerun the complete relevant gate. Never mark the release checklist PASS from older CI evidence.

### Task 12: Change default to V5 only after Task 11 passes

**Files:** `src/v5/app/runtime-config.ts`, `src/main.tsx`, release checklist.

- [ ] **Step 1: Change one explicit config value**

```ts
export const RUNTIME_CONFIG: RuntimeConfig = {
  defaultRuntime: "v5",
  allowV5PreviewQuery: true,
};
```

Do not delete V4 imports/runtime path in the same commit; controlled rollback remains possible.

- [ ] **Step 2: Run selector/core smoke tests**

Run: `npx vitest run tests/components/v5/V5PreviewApp.test.tsx && npx playwright test tests/e2e/v5/core-funnel.spec.ts`

Expected: root `/` opens V5 and core funnel passes; `/?v5=0` still opens V4 during transition.

- [ ] **Step 3: Run V4 storage isolation test again with V5 default**

Run: `npx playwright test tests/e2e/v5/v4-storage-isolation.spec.ts`

Expected: PASS.

- [ ] **Step 4: Commit release switch**

```bash
git add src/v5/app/runtime-config.ts src/main.tsx docs/releases/liftpath-5-release-checklist.md
git commit -m "feat(v5): make LiftPath 5 the default runtime"
```

### Task 13: Post-switch verification and handoff

- [ ] **Step 1:** Run `npm run check` — expected exit 0.
- [ ] **Step 2:** Run V5 large-history suite — expected PASS.
- [ ] **Step 3:** Run `git status --short` — expected empty.
- [ ] **Step 4:** Request code review with `superpowers:requesting-code-review`; do not merge solely because CI is green.
- [ ] **Step 5:** Keep rollback procedure explicit: revert the single default-runtime commit/config value without deleting V5 IndexedDB; V4 can resume reading its unchanged storage.
