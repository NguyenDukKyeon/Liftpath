# Guided Coach 04 — Test Infrastructure, Accessibility, and Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the Guided Coach core flows, migration safety, accessibility, and production build in CI before any merge or production rollout.

**Architecture:** Keep Node’s deterministic domain suite, add Vitest/Testing Library for component behavior, Playwright for critical browser flows, and axe checks for accessibility. CI runs fast checks first and browser checks after a successful build.

**Tech Stack:** React 19, TypeScript 5.8, Vite 8, Node 22, Node `node:test`, Vitest, Testing Library, Playwright, `@axe-core/playwright`, GitHub Actions, Vercel status checks.

## Global Constraints

- Requires completion of plans 01–03.
- Do not merge automatically.
- Do not deploy production until migration, CI, and manual mobile review pass.
- Five critical E2E flows are mandatory.
- Primary gym-floor touch targets must be at least 44 CSS pixels.
- Core flow must work at 360, 390, and 430 pixel widths.
- `npm run check` must include type checking, domain tests, component tests, production build, and critical E2E tests.
- Release version and visible product version must be exactly `4.0.0` / `LiftPath 4.0`.

---

## File Map

- Modify `package.json`: 4.0.0 version, test scripts, and dev dependencies.
- Modify `package-lock.json`: lock new test tools.
- Create `vitest.config.ts`.
- Create `playwright.config.ts`.
- Create `tests/setup.ts`.
- Create `tests/components/onboarding.test.tsx`.
- Create `tests/components/readiness.test.tsx`.
- Create `tests/components/set-table.test.tsx`.
- Create `tests/components/recap.test.tsx`.
- Create `tests/e2e/onboarding-first-workout.spec.ts`.
- Create `tests/e2e/progression.spec.ts`.
- Create `tests/e2e/readiness-short-session.spec.ts`.
- Create `tests/e2e/pain-safety.spec.ts`.
- Create `tests/e2e/migration-active-draft.spec.ts`.
- Create `tests/e2e/accessibility.spec.ts`.
- Create `tests/helpers/seed-state.ts`.
- Modify `.github/workflows/deploy.yml`.
- Modify `README.md`.
- Create `CHANGELOG.md`.
- Create `docs/releases/4.0-manual-review.md`.
- Modify `index.html`, `public/manifest.webmanifest`, and visible version strings.

### Task 1: Add component and browser test infrastructure

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `tests/setup.ts`
- Create: `tests/helpers/seed-state.ts`

**Interfaces:**
- Produces scripts `test:domain`, `test:component`, `test:e2e`, `test:a11y`, and `check`.
- Consumes existing Vite app and schema-v4 storage key.

- [ ] **Step 1: Update package version and scripts**

```json
{
  "version": "4.0.0",
  "scripts": {
    "dev": "vite --host 0.0.0.0 --port 3000",
    "build": "tsc -b && vite build",
    "lint": "tsc -b --pretty false",
    "test:domain": "node -e \"require('fs').rmSync('.test-dist',{recursive:true,force:true})\" && tsc -p tsconfig.test.json && node --test .test-dist/tests/*.test.js",
    "test:component": "vitest run",
    "test:e2e": "playwright test --grep-invert @a11y",
    "test:a11y": "playwright test --grep @a11y",
    "check:fast": "npm run lint && npm run test:domain && npm run test:component && npm run build",
    "check": "npm run check:fast && npm run test:e2e"
  }
}
```

Keep `test` as an alias for `test:domain` until all existing documentation is updated.

- [ ] **Step 2: Install exact test tool families**

Run:

```bash
npm install --save-dev vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom @playwright/test @axe-core/playwright
npx playwright install chromium
```

Expected: lockfile updates and Chromium installation succeeds.

- [ ] **Step 3: Configure Vitest**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/components/**/*.test.tsx"],
    restoreMocks: true,
  },
});
```

- [ ] **Step 4: Configure Playwright web server and mobile projects**

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  use: { baseURL: "http://127.0.0.1:4173", trace: "retain-on-failure" },
  webServer: { command: "npm run build && npm run preview -- --port 4173", port: 4173, reuseExistingServer: !process.env.CI },
  projects: [
    { name: "mobile-360", use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 800 } } },
    { name: "mobile-390", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } },
    { name: "mobile-430", use: { ...devices["Desktop Chrome"], viewport: { width: 430, height: 932 } } },
  ],
});
```

- [ ] **Step 5: Add deterministic storage seeding helper**

```ts
export const seedState = async (page: Page, state: AppState) => {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), ["liftpath-personal-v4", JSON.stringify(state)]);
};
```

- [ ] **Step 6: Verify empty suites and commit**

Run: `npm run lint && npm run test:domain && npm run test:component -- --passWithNoTests && npm run build`

```bash
git add package.json package-lock.json vitest.config.ts playwright.config.ts tests/setup.ts tests/helpers/seed-state.ts
git commit -m "test: add Guided Coach browser test infrastructure"
```

### Task 2: Cover the four critical React components

**Files:**
- Create: `tests/components/onboarding.test.tsx`
- Create: `tests/components/readiness.test.tsx`
- Create: `tests/components/set-table.test.tsx`
- Create: `tests/components/recap.test.tsx`

**Interfaces:**
- Consumes public component props and pure coach fixtures; does not reach into component internals.
- Produces behavioral coverage for onboarding, readiness, inline previous copy, optional effort, and recap explanations.

- [ ] **Step 1: Test onboarding navigation and preview**

```ts
it("shows one equipment-safe plan and submits the plan displayed in preview", async () => {
  const complete = vi.fn();
  render(<OnboardingFlow initial={defaultProfile()} onComplete={complete} />);
  // Choose goal, schedule, equipment, calibration and advance.
  expect(await screen.findByText(/điểm khởi đầu/i)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /bắt đầu lộ trình/i }));
  expect(complete).toHaveBeenCalledTimes(1);
  expect(complete.mock.calls[0][1].invalidPrescriptionIds).toHaveLength(0);
});
```

- [ ] **Step 2: Test readiness adjustment explanation**

Select low energy and 35 minutes. Assert that the preview names removed accessories and renders the reason, then confirm and assert the callback receives the exact displayed adjustment.

- [ ] **Step 3: Test inline previous-set copy and optional effort**

```ts
it("copies the previous corresponding set and completes with blank effort", async () => {
  render(<SetTable {...weightRepsFixture} />);
  await user.click(screen.getByRole("button", { name: /sao chép lần trước cho hiệp 1/i }));
  expect(weightRepsFixture.updateSet).toHaveBeenCalledWith(0, expect.objectContaining({ weightKg: 20, reps: 10 }));
  expect(screen.getByRole("button", { name: /hoàn thành hiệp 1/i })).toBeEnabled();
});
```

- [ ] **Step 4: Test recap information hierarchy**

Assert `Điều đã làm tốt`, `Cần chú ý`, and `Buổi sau thay đổi gì` are visible before raw volume details; verify every next-time item contains an explanation.

- [ ] **Step 5: Run component tests and commit**

Run: `npm run test:component`

```bash
git add tests/components
git commit -m "test: cover Guided Coach React interactions"
```

### Task 3: Add the five mandatory end-to-end flows

**Files:**
- Create: `tests/e2e/onboarding-first-workout.spec.ts`
- Create: `tests/e2e/progression.spec.ts`
- Create: `tests/e2e/readiness-short-session.spec.ts`
- Create: `tests/e2e/pain-safety.spec.ts`
- Create: `tests/e2e/migration-active-draft.spec.ts`

**Interfaces:**
- Consumes only visible UI and `seedState` for returning-user fixtures.
- Produces acceptance evidence for the design spec’s five critical flows.

- [ ] **Step 1: Implement beginner onboarding and first workout**

Scenario:

1. Open empty app.
2. Complete four onboarding steps with 3 days and dumbbell/machine/cable equipment.
3. Confirm the plan preview.
4. Start today’s workout.
5. Complete readiness with normal values.
6. Enter and complete one working set with effort blank.
7. Finish the workout and see three-part recap.

- [ ] **Step 2: Implement returning-user progression flow**

Seed a completed prior session at the top of the rep range. Start the matching workout, assert the load-increase explanation, copy the previous value, apply the suggested load, and finish the set.

- [ ] **Step 3: Implement low-readiness shortened session**

Seed an existing user. Choose low energy and 35 minutes. Assert accessories are removed, primary work remains, and the workout header reflects the reduced total.

- [ ] **Step 4: Implement pain safety flow**

Choose sharp knee pain affecting squat/lunge patterns. Assert the unsafe movement is blocked, no start button is available for the unchanged session, and copy says LiftPath does not diagnose injury.

- [ ] **Step 5: Implement v3 migration with active draft**

Seed raw `liftpath-personal-v3` fixture, open the app, assert visible history totals, resume the migrated draft, complete a set, and finish without data reset.

- [ ] **Step 6: Run Chromium flows and commit**

Run: `npx playwright install chromium && npm run test:e2e`

```bash
git add tests/e2e/onboarding-first-workout.spec.ts tests/e2e/progression.spec.ts tests/e2e/readiness-short-session.spec.ts tests/e2e/pain-safety.spec.ts tests/e2e/migration-active-draft.spec.ts
git commit -m "test: add Guided Coach critical browser flows"
```

### Task 4: Add accessibility and responsive assertions

**Files:**
- Create: `tests/e2e/accessibility.spec.ts`
- Modify: `src/styles.css`
- Modify: affected feature components only when tests expose a failure.

**Interfaces:**
- Produces automated axe scans, touch-target checks, focus visibility checks, and responsive overflow checks.
- Consumes onboarding, readiness, workout, and recap routes.

- [ ] **Step 1: Add axe scans tagged `@a11y`**

```ts
test("@a11y workout screen has no serious axe violations", async ({ page }) => {
  await seedState(page, activeWorkoutFixture);
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => ["serious", "critical"].includes(item.impact ?? ""))).toEqual([]);
});
```

Repeat for onboarding, readiness, and recap.

- [ ] **Step 2: Assert primary touch targets**

Measure buttons used to advance onboarding, confirm readiness, complete sets, and finish workouts. Fail when width or height is below 44px unless the target has documented equivalent spacing.

- [ ] **Step 3: Assert no horizontal overflow at every configured viewport**

```ts
expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
```

- [ ] **Step 4: Assert focused inputs remain visible**

Focus the final visible set input and ensure its bounding box remains above the bottom navigation area after `scrollIntoView`.

- [ ] **Step 5: Fix only demonstrated accessibility failures**

Do not restyle unrelated screens. Prefer semantic buttons/labels, visible focus, `aria-live` for timer/coach updates, and responsive grid changes.

- [ ] **Step 6: Run and commit**

Run: `npm run test:a11y`

```bash
git add tests/e2e/accessibility.spec.ts src/styles.css src/features
git commit -m "test: enforce Guided Coach accessibility and mobile quality"
```

### Task 5: Strengthen CI and release metadata

**Files:**
- Modify: `.github/workflows/deploy.yml`
- Modify: `README.md`
- Create: `CHANGELOG.md`
- Create: `docs/releases/4.0-manual-review.md`
- Modify: `index.html`
- Modify: `public/manifest.webmanifest`
- Modify: visible version labels in React components.

**Interfaces:**
- Produces CI gates, release documentation, and consistent 4.0 metadata.
- Consumes all test scripts from Task 1.

- [ ] **Step 1: Split CI into fast and browser jobs**

```yaml
jobs:
  validate:
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run check:fast

  e2e:
    needs: validate
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - run: npm run test:a11y
```

Deployment must depend on both jobs for non-PR pushes.

- [ ] **Step 2: Create release changelog**

Document schema v4, Guided Coach onboarding/readiness, tracking modes, optional effort, progression strategies, migration behavior, and known non-goals. Do not claim account sync, medical guidance, or AI-generated coaching.

- [ ] **Step 3: Create manual mobile review checklist**

Include exact devices/viewport widths and checks for onboarding, readiness, set entry, soft keyboard, rest timer, Wake Lock fallback, recap, dark mode, installability, offline reload, and migration from a copied v3 fixture.

- [ ] **Step 4: Make version strings consistent**

Set package version to `4.0.0`, title/copy to `LiftPath 4.0`, manifest description to Guided Coach wording, and README heading/status to 4.0.

- [ ] **Step 5: Run complete local release gate**

Run:

```bash
npm ci
npx playwright install chromium
npm run check
npm run test:a11y
```

Expected: all commands exit 0.

- [ ] **Step 6: Commit release gate**

```bash
git add .github/workflows/deploy.yml README.md CHANGELOG.md docs/releases/4.0-manual-review.md index.html public/manifest.webmanifest package.json package-lock.json src
git commit -m "chore: prepare LiftPath 4.0 Guided Coach release"
```

### Task 6: Open draft PR and verify exact head commit

**Files:**
- No source changes unless verification exposes a defect.

**Interfaces:**
- Produces a draft PR from `agent/liftpath-4-guided-coach` to `main` with exact validation evidence.
- Consumes successful local/CI results and manual review status.

- [ ] **Step 1: Review branch diff**

Run:

```bash
git diff --stat main...HEAD
git diff --check main...HEAD
```

Expected: no whitespace errors and only Guided Coach scope changes.

- [ ] **Step 2: Run final gate at the exact head**

```bash
npm ci
npx playwright install chromium
npm run check
npm run test:a11y
git rev-parse HEAD
```

Record the exact SHA and command results.

- [ ] **Step 3: Open a draft pull request**

Title: `feat: LiftPath 4.0 Guided Coach foundation`

Body must list schema migration, plan builder, readiness, workout logging, progression, recap, test counts, exact head SHA, CI status, and remaining manual mobile review items.

- [ ] **Step 4: Wait for CI and inspect failed steps**

Do not label the package accepted merely because Vercel or GitHub checks are green. Fix failures on the branch, rerun the exact checks, and update evidence.

- [ ] **Step 5: Keep PR draft until manual review is recorded**

Do not merge or trigger production deployment. The product owner explicitly decides readiness after reviewing the preview and checklist.

## Final Verification Matrix

| Requirement | Evidence |
|---|---|
| At least 40 focused domain tests | Node test output count |
| Four core component behaviors | Vitest output |
| Five critical user flows | Playwright output |
| Accessibility | axe serious/critical count = 0 |
| 360/390/430 responsiveness | Playwright project results |
| v3 data preservation | migration unit + E2E fixture |
| Complete build | `npm run build` exit 0 |
| Exact release version | package, UI, manifest, README all 4.0 |
| No automatic merge | PR remains draft |
