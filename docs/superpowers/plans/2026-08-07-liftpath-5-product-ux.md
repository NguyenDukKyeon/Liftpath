# LiftPath 5 Product UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the proven V5 foundation/workout/prescription/Coach slices into the final Personal Coach information architecture: Today, Program, Progress, History, and a focused Workout Mode that is fast on mobile and useful on desktop without dashboard overload.

**Architecture:** Build a thin presentation/query layer over existing application use cases. Today answers “what now?”, Program explains the active prescription and change history, Progress summarizes evidence before charts, and History remains the authoritative record browser. Advanced tools use progressive disclosure and Coach material decisions remain explicit.

**Tech Stack:** React 19.2, TypeScript, existing lucide-react icons, CSS modules/files under `src/v5/styles`/feature folders, Vitest + Testing Library, Playwright E2E/a11y/device tests.

## Global Constraints

- Bottom navigation: Today, Program, Progress, History; Settings/Profile is secondary, not a fifth core destination.
- One dominant action per screen.
- Today answers what to do now, not a metric dashboard.
- Coach speaks only when useful; actionable recommendations are prominent, informational state is quiet.
- Workout Mode hides primary app navigation and optimizes set logging.
- Most returning-user sets require only 1–3 primary interactions.
- Recap answers What happened? / What mattered? / What next? before detailed stats.
- No fake precision or unsupported physique claims.
- User explicitly enters Change Training Structure; Coach does not surface unsolicited split-change recommendations.
- Preserve dark athletic/lime DNA while reducing oversized hero text, excessive card nesting, uppercase, borders, and desktop dead space.
- Core flows must support keyboard/screen-reader use and >=44px practical touch targets where applicable.

---

## File Map

**Create**
- `src/v5/presentation/AppShell.tsx`
- `src/v5/presentation/navigation.ts`
- `src/v5/presentation/query/use-v5-controller.ts`
- `src/v5/presentation/today/TodayScreen.tsx`
- `src/v5/presentation/today/CoachDecisionQueue.tsx`
- `src/v5/presentation/workout/ReadinessQuickCheck.tsx`
- `src/v5/presentation/workout/WorkoutHeader.tsx`
- `src/v5/presentation/workout/ExercisePanel.tsx`
- `src/v5/presentation/workout/ExerciseActions.tsx`
- `src/v5/presentation/workout/WorkoutRecap.tsx`
- `src/v5/presentation/program/ProgramScreen.tsx`
- `src/v5/presentation/program/ProgramChangeTimeline.tsx`
- `src/v5/presentation/program/ChangeStructureFlow.tsx`
- `src/v5/presentation/progress/ProgressScreen.tsx`
- `src/v5/presentation/progress/SpecializationSummary.tsx`
- `src/v5/presentation/progress/ExerciseTrend.tsx`
- `src/v5/presentation/history/HistoryScreen.tsx`
- `src/v5/presentation/history/SessionDetail.tsx`
- `src/v5/presentation/settings/SettingsPanel.tsx`
- `src/v5/styles/tokens.css`
- `src/v5/styles/app-shell.css`
- `src/v5/styles/typography.css`
- `src/v5/styles/responsive.css`
- `tests/components/v5/AppShell.test.tsx`
- `tests/components/v5/TodayScreen.test.tsx`
- `tests/components/v5/ReadinessQuickCheck.test.tsx`
- `tests/components/v5/WorkoutRecap.test.tsx`
- `tests/components/v5/ProgramScreen.test.tsx`
- `tests/components/v5/ProgressScreen.test.tsx`
- `tests/components/v5/HistoryScreen.test.tsx`
- `tests/e2e/v5/core-funnel.spec.ts`
- `tests/e2e/v5/navigation-a11y.spec.ts`

**Modify**
- `src/v5/app/V5PreviewApp.tsx` — replace temporary slice harness with `AppShell` while retaining preview-only entry.
- `src/v5/presentation/workout/WorkoutMode.tsx`
- `src/v5/presentation/workout/SetLogger.tsx`
- `src/v5/presentation/workout/workout.css`
- `src/v5/presentation/components/CoachRecommendationCard.tsx`

## Presentation Query Contract

Do not expose IndexedDB directly to React components. `useV5Controller` consumes application services and returns view models/actions:

```ts
export interface V5Controller {
  route: "today" | "program" | "progress" | "history" | "settings" | "workout";
  today: TodayViewModel;
  program: ProgramViewModel;
  progress: ProgressViewModel;
  history: HistoryViewModel;
  activeWorkout: ActiveWorkoutViewModel | null;
  navigate(route: V5Controller["route"]): void;
  startTodayWorkout(): Promise<void>;
  submitReadiness(input: ReadinessInput): Promise<void>;
  completeSet(input: CompleteSetInput): Promise<void>;
  finishWorkout(): Promise<void>;
}
```

### Task 1: V5 design tokens and four-destination shell

**Files:** tokens/app-shell/typography/responsive CSS, `AppShell.tsx`, `navigation.ts`, tests.

- [ ] **Step 1: Write failing shell test**

Render `AppShell` and assert exactly four primary nav labels: `Hôm nay`, `Giáo án`, `Tiến bộ`, `Nhật ký`. Assert `Cài đặt` is available through a secondary profile/settings button, not primary nav.

- [ ] **Step 2: Run focused component test**

Run: `npx vitest run tests/components/v5/AppShell.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement navigation model**

```ts
export const PRIMARY_NAV = [
  { id: "today", label: "Hôm nay" },
  { id: "program", label: "Giáo án" },
  { id: "progress", label: "Tiến bộ" },
  { id: "history", label: "Nhật ký" },
] as const;
```

Use bottom navigation on narrow screens and a compact left rail on desktop. Do not duplicate five-tab V4 IA.

- [ ] **Step 4: Implement design tokens**

Define semantic CSS custom properties for background/surface/text/muted/accent/danger/focus, spacing, radii, type scale, and content widths. Keep lime as accent but avoid applying accent to every border/card.

- [ ] **Step 5: Run component test and commit**

```bash
npx vitest run tests/components/v5/AppShell.test.tsx
git add src/v5/presentation/AppShell.tsx src/v5/presentation/navigation.ts src/v5/styles tests/components/v5/AppShell.test.tsx
git commit -m "feat(v5): add four-destination product shell"
```

### Task 2: Controller/query boundary

**Files:** `use-v5-controller.ts`, tests in `AppShell.test.tsx`.

- [ ] **Step 1: Write failing test with application-service fakes**

Assert changing route is presentation-only state, while `startTodayWorkout` calls the injected start-workout use case and then exposes `activeWorkout` from the returned persisted session.

- [ ] **Step 2: Run test and verify failure**

Run: `npx vitest run tests/components/v5/AppShell.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement controller**

The controller composes application services/repository-backed query functions. No component imports `openLiftPathV5Db`, raw IDB stores, or Coach pure-domain modules directly.

- [ ] **Step 4: Run test and commit**

```bash
npx vitest run tests/components/v5/AppShell.test.tsx
git add src/v5/presentation/query/use-v5-controller.ts tests/components/v5/AppShell.test.tsx
git commit -m "feat(v5): isolate presentation query controller"
```

### Task 3: Today screen and Coach decision queue

**Files:** `TodayScreen.tsx`, `CoachDecisionQueue.tsx`, Coach card, `TodayScreen.test.tsx`.

- [ ] **Step 1: Write failing Today hierarchy tests**

For a day with an assigned session and one pending recommendation, assert visible order/content:
1. session name + goal/specialization context;
2. estimated duration/exercise count;
3. one primary `Bắt đầu buổi tập` button;
4. pending Coach action count/card;
5. weekly adherence context.

Assert detailed charts/raw workload tables are not present.

- [ ] **Step 2: Run focused test**

Run: `npx vitest run tests/components/v5/TodayScreen.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement Today**

Render informational Coach state quietly; only `pending` material recommendations get a decision card. A no-change state may render one short line such as `Không cần điều chỉnh giáo án.`

- [ ] **Step 4: Run test and commit**

```bash
npx vitest run tests/components/v5/TodayScreen.test.tsx
git add src/v5/presentation/today src/v5/presentation/components/CoachRecommendationCard.tsx tests/components/v5/TodayScreen.test.tsx
git commit -m "feat(v5): make Today the coaching home"
```

### Task 4: Readiness quick check

**Files:** `ReadinessQuickCheck.tsx`, test, controller wiring.

**Interfaces:**

```ts
export interface ReadinessInput {
  energy: "low" | "normal" | "high";
  soreness: "none" | "mild" | "high";
  painExerciseIds: EntityId[];
}
```

- [ ] **Step 1: Write failing readiness test**

Assert normal path requires energy + soreness only and can continue in two selections plus submit. Pain reporting is an optional explicit action that expands movement selection rather than a mandatory questionnaire.

- [ ] **Step 2: Run focused test**

Run: `npx vitest run tests/components/v5/ReadinessQuickCheck.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement quick check and persistence action**

Persist readiness before entering Workout Mode. If persistence fails, remain on readiness and show `role="alert"`; do not silently continue.

- [ ] **Step 4: Run test and commit**

```bash
npx vitest run tests/components/v5/ReadinessQuickCheck.test.tsx
git add src/v5/presentation/workout/ReadinessQuickCheck.tsx src/v5/presentation/query/use-v5-controller.ts tests/components/v5/ReadinessQuickCheck.test.tsx
git commit -m "feat(v5): add compact readiness check"
```

### Task 5: Final focused Workout Mode

**Files:** `WorkoutMode.tsx`, `WorkoutHeader.tsx`, `ExercisePanel.tsx`, `ExerciseActions.tsx`, `SetLogger.tsx`, workout CSS, tests.

- [ ] **Step 1: Extend WorkoutMode component tests**

Assert:
- primary app nav is absent in workout;
- header shows session name, elapsed time, and exercise progress;
- current exercise shows prescription + previous result;
- primary action is `Complete set`;
- warm-up/substitute/notes/tools are secondary disclosure actions;
- after commit, rest state and next target appear without modal interruption.

- [ ] **Step 2: Run focused test**

Run: `npx vitest run tests/components/v5/WorkoutMode.test.tsx`

Expected: FAIL until final layout exists.

- [ ] **Step 3: Implement progressive disclosure**

Keep only exercise, set ordinal, load, reps, RIR, previous result, and primary completion action in the first layer. Move substitution/warmup/plate/notes/history to `ExerciseActions` disclosure.

- [ ] **Step 4: Implement responsive containment**

On mobile, use one column and sticky reachable primary action without covering inputs when the virtual keyboard opens. On desktop, cap primary set-logging width and place nonessential context in a side region rather than stretching mobile cards.

- [ ] **Step 5: Run component test and commit**

```bash
npx vitest run tests/components/v5/WorkoutMode.test.tsx
git add src/v5/presentation/workout tests/components/v5/WorkoutMode.test.tsx
git commit -m "feat(v5): refine focused Workout Mode"
```

### Task 6: Training-intent substitutions

**Files:** `ExerciseActions.tsx`, domain catalog/substitution helper if not already present, tests.

- [ ] **Step 1: Write failing component/domain test**

Given a lat-pulldown exercise and available cable equipment, assert recommended replacements are from the same `substitutionGroup`/compatible training intent and appear before `Browse all`. Assert an unrelated barbell row is not promoted merely because it is broadly “back”.

- [ ] **Step 2: Run focused tests**

Run: `npm run test:domain -- --test-name-pattern="substitution" && npx vitest run tests/components/v5/WorkoutMode.test.tsx`

Expected: FAIL before helper/UI exists.

- [ ] **Step 3: Implement deterministic compatible-substitution ranking**

Filter by equipment/restrictions, preserve primary training intent, then rank lower skill/fatigue cost when otherwise tied; stable-ID tie breaker.

- [ ] **Step 4: Run tests and commit**

```bash
npm run test:domain
npx vitest run tests/components/v5/WorkoutMode.test.tsx
git add src/v5/domain/exercises src/v5/presentation/workout tests/v5/domain tests/components/v5/WorkoutMode.test.tsx
git commit -m "feat(v5): recommend intent-preserving exercise swaps"
```

### Task 7: Three-part workout recap

**Files:** `WorkoutRecap.tsx`, test, controller wiring.

- [ ] **Step 1: Write failing recap test**

Given a completed session and a stored Coach outcome, assert headings/content for `Điều gì đã xảy ra`, `Điều gì đáng chú ý`, `Tiếp theo`, plus a secondary `Xem chi tiết` action. Assert raw tables are hidden initially.

- [ ] **Step 2: Run focused test**

Run: `npx vitest run tests/components/v5/WorkoutRecap.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement recap view model and UI**

Summary uses observed facts and stored Coach result; it cannot claim direct muscle growth. `Done` returns to Today only after completed session state is already committed.

- [ ] **Step 4: Run test and commit**

```bash
npx vitest run tests/components/v5/WorkoutRecap.test.tsx
git add src/v5/presentation/workout/WorkoutRecap.tsx tests/components/v5/WorkoutRecap.test.tsx
git commit -m "feat(v5): summarize workouts in three parts"
```

### Task 8: Program screen and change history

**Files:** `ProgramScreen.tsx`, `ProgramChangeTimeline.tsx`, test.

- [ ] **Step 1: Write failing Program tests**

Assert header exposes goal, specialization, days/week, block/week label; session list; priority summary; rationale; program-change timeline with reason/decision. Default mode is read-only.

- [ ] **Step 2: Run focused test**

Run: `npx vitest run tests/components/v5/ProgramScreen.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement Program view**

Distinguish `Coach change` vs `User override` in timeline view models. Do not provide inline accidental editing controls in read-only mode.

- [ ] **Step 4: Run test and commit**

```bash
npx vitest run tests/components/v5/ProgramScreen.test.tsx
git add src/v5/presentation/program tests/components/v5/ProgramScreen.test.tsx
git commit -m "feat(v5): explain active program and change history"
```

### Task 9: User-initiated Change Training Structure flow

**Files:** `ChangeStructureFlow.tsx`, `ProgramScreen.tsx`, tests.

- [ ] **Step 1: Write failing test**

Assert structure proposals are not shown during normal Program render. They appear only after clicking `Change training structure`, then reuse the existing structure-proposal logic and require preview/confirmation before activation.

- [ ] **Step 2: Run test and verify failure**

Run: `npx vitest run tests/components/v5/ProgramScreen.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement explicit flow**

Use a dedicated application use case to create a new program version from the user-selected structure; label change source as user-initiated. Do not generate unsolicited structure-change recommendation records.

- [ ] **Step 4: Run test and commit**

```bash
npx vitest run tests/components/v5/ProgramScreen.test.tsx
git add src/v5/presentation/program tests/components/v5/ProgramScreen.test.tsx
git commit -m "feat(v5): add user-initiated structure changes"
```

### Task 10: Progress summary before charts

**Files:** `ProgressScreen.tsx`, `SpecializationSummary.tsx`, `ExerciseTrend.tsx`, test.

- [ ] **Step 1: Write failing Progress tests**

For V-Shape fixture, assert summary says training-status language such as `Lats: Improving`, `Side delts: Stable`, includes evidence confidence, and avoids phrases like `% muscle growth`, `V-taper +8%`, or `optimal growth`. Charts/details are secondary.

- [ ] **Step 2: Run focused test**

Run: `npx vitest run tests/components/v5/ProgressScreen.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement summary/view models**

Use derived data from recent windows: adherence, performance trend, workload direct-equivalent sets, exposure frequency. Add simple accessible SVG/HTML exercise trend only where underlying data supports it.

- [ ] **Step 4: Run test and commit**

```bash
npx vitest run tests/components/v5/ProgressScreen.test.tsx
git add src/v5/presentation/progress tests/components/v5/ProgressScreen.test.tsx
git commit -m "feat(v5): explain progress before charts"
```

### Task 11: History list, calendar toggle, and session detail

**Files:** `HistoryScreen.tsx`, `SessionDetail.tsx`, test.

- [ ] **Step 1: Write failing History tests**

Assert paginated/recent session list renders 20 items max per query page; session detail includes exercises/sets/RIR/program version and related Coach decisions; List/Calendar is a local History toggle, not another primary nav tab.

- [ ] **Step 2: Run focused test**

Run: `npx vitest run tests/components/v5/HistoryScreen.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement query-backed history**

Do not hydrate all historical sessions into global React state. Query recent page IDs then load selected detail on demand.

- [ ] **Step 4: Run test and commit**

```bash
npx vitest run tests/components/v5/HistoryScreen.test.tsx
git add src/v5/presentation/history tests/components/v5/HistoryScreen.test.tsx
git commit -m "feat(v5): add paged authoritative history"
```

### Task 12: Core-funnel and navigation E2E

**Files:** V5 preview wiring, `core-funnel.spec.ts`, `navigation-a11y.spec.ts`.

- [ ] **Step 1: Write mobile reference funnel**

Fresh V5 storage -> onboarding -> approve Hypertrophy + V-Shape program -> Today -> readiness -> first working set -> complete workout -> recap -> Today. Assert no primary navigation appears during workout.

- [ ] **Step 2: Write returning-user fast path**

Seed active program and visit Today. Start workout, submit normal readiness, reach first working-set inputs. Capture timing marker and assert test-side elapsed time is under the product target in local deterministic test conditions; keep actual release performance threshold enforcement in hardening plan.

- [ ] **Step 3: Write keyboard navigation/a11y smoke**

Tab through primary nav, settings trigger, Coach decision card, readiness, and set logger. Assert visible focus and accessible names.

- [ ] **Step 4: Run E2E**

Run: `npx playwright test tests/e2e/v5/core-funnel.spec.ts tests/e2e/v5/navigation-a11y.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/v5/app/V5PreviewApp.tsx src/v5/presentation tests/e2e/v5/core-funnel.spec.ts tests/e2e/v5/navigation-a11y.spec.ts
git commit -m "feat(v5): complete Personal Coach core funnel"
```

### Task 13: Product UX verification gate

- [ ] **Step 1:** `npm run check:fast` — exit 0.
- [ ] **Step 2:** `npx playwright test tests/e2e/v5/core-funnel.spec.ts tests/e2e/v5/navigation-a11y.spec.ts tests/e2e/v5/coach-adaptation.spec.ts` — PASS.
- [ ] **Step 3:** `npm run test:a11y` — existing V4 a11y remains green.
- [ ] **Step 4:** `npm run test:e2e` — existing V4 E2E remains green.
- [ ] **Step 5:** manually inspect mobile 360–390px and desktop 1440px screenshots from Playwright runs; do not claim visual readiness if containment/keyboard overlap issues remain.
