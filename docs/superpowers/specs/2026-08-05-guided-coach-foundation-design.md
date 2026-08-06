# LiftPath 4.0 — Guided Coach Foundation

**Status:** Proposed design approved in principle by the product owner; awaiting written-spec review before implementation.

**Date:** 2026-08-05

## 1. Product decision

LiftPath 4.0 will prioritize beginner and intermediate lifters who want the app to tell them what to do, rather than experienced lifters who want a highly configurable logger.

The core promise is:

> Open LiftPath, understand today's plan, complete each set quickly, and know what will change next time.

The coach will be deterministic and rule-based. Every meaningful adjustment must include a short explanation and a confidence level. A generative chatbot is not part of the decision-making core.

## 2. Target user

Primary users:

- Adults with roughly 0–24 months of consistent resistance-training experience.
- Usually train 3 or 4 days per week.
- Primarily want hypertrophy, general strength, or improved body composition.
- Do not want to design programs, calculate progression, or interpret training science.
- Need clear Vietnamese guidance and fast gym-floor interaction.
- Do not require clinical rehabilitation or injury management.

The 6-day PPL option remains available, but it is not the default recommendation and is not the primary optimization target for 4.0.

## 3. Approaches considered

### A. Patch the current v3 model

Keep global exercise defaults and add more conditional logic around the existing `WorkoutDay.exercises: ExerciseId[]` model.

**Advantages:** smaller initial diff and lower migration cost.

**Rejected because:** a single exercise cannot have different set schemes, rest periods, RIR targets, progression rules, or coaching instructions in different sessions. Complexity would move into scattered conditionals and become difficult to test.

### B. Schema v4 plus deterministic coach engine — selected

Introduce session-specific exercise prescriptions, structured readiness input, tracking modes, multiple progression strategies, and explicit coach decisions.

**Advantages:** supports real programming, remains explainable, works offline, and can be tested deterministically.

**Cost:** requires a data migration and a substantial refactor of program creation and workout execution.

### C. AI-generated workouts backed by a cloud service

Use an LLM to generate and modify sessions.

**Deferred because:** it introduces cost, latency, privacy, reliability, and explainability problems before the deterministic training model is mature.

## 4. Scope

LiftPath 4.0 Guided Coach Foundation includes four product pillars:

1. A program schema capable of representing real session prescriptions.
2. Guidance before, during, and after each workout.
3. A progression engine with strategy-specific rules.
4. Sufficient automated coverage to change coaching rules safely.

### Explicit non-goals

The following are not part of this implementation cycle:

- Hosted account system or automatic cloud sync.
- Social feed, leaderboards, community programs, or marketplace.
- AI chatbot that changes training plans.
- Nutrition tracking.
- Native Apple Health, Health Connect, watch, or wearable integration.
- A large exercise-media library.
- Clinical injury diagnosis or rehabilitation programming.

## 5. Experience design

### 5.1 Onboarding v2

Replace the current long single-page form with a four-step guided flow.

#### Step 1 — Goal

Choices:

- Build muscle.
- Get stronger.
- General fitness.

Fat loss is presented as a secondary context, not a distinct resistance-training progression model. The app explains that nutrition primarily determines weight loss while training helps preserve or build muscle.

#### Step 2 — Schedule and environment

Collect:

- 2–6 available days, with 3 and 4 emphasized.
- Typical session duration.
- Training location or equipment profile.
- Preferred training days.

Equipment profiles are structured and reusable. A plan must never silently include an exercise that cannot be performed with the selected equipment.

#### Step 3 — Experience calibration

Collect:

- Training consistency.
- Familiarity with squat, hinge, press, and pull patterns.
- Optional recent loads for familiar exercises.
- Preferred effort language: simple reps-in-reserve wording or RPE.

Years of experience remain useful, but they are not the only calibration signal.

#### Step 4 — Plan preview

Show:

- Recommended split.
- Expected duration.
- Weekly estimated stimulus by muscle group.
- Why the plan was selected.
- Any equipment substitutions.
- A clear confirmation action.

The user may change the plan, but LiftPath presents one strong default instead of an undifferentiated list.

### 5.2 Pre-workout readiness check

Before starting a planned workout, ask three short questions:

- Energy: low, normal, high.
- Muscle soreness: none, manageable, high.
- Pain or movement concern: none, or selected body area.

Also allow the user to shorten the available session time.

The readiness engine may:

- Keep the session unchanged.
- Remove lower-priority accessory work.
- Reduce working sets.
- Lower the target effort.
- Substitute an exercise affected by a pain flag.
- Recommend skipping the workout and seeking professional advice when the user reports sharp, unusual, or worsening pain.

The app does not diagnose injury. Every adjustment states its reason.

### 5.3 During-workout guidance

The workout screen follows a “one current task” hierarchy:

1. Current exercise and set.
2. Suggested load and rep target.
3. Previous corresponding set inline.
4. One concise technique cue.
5. Completion action.
6. Rest timer and next action.

Requirements:

- Previous values appear directly in each set row, not behind a disclosure panel.
- Tapping a previous value copies it.
- RPE/RIR input is optional and must not block set completion.
- Beginners see plain language such as “stop with about 2 reps left.”
- Users can add, remove, reorder, or substitute exercises without editing the base template.
- The coach records deviations and can use repeated substitutions or skipped exercises as future preference signals.
- Warm-up sets are calculated separately and excluded from progression metrics.
- Plate calculator and warm-up calculator are available for compatible exercises.

### 5.4 Post-workout coaching recap

The recap answers three questions:

1. What went well?
2. What needs attention?
3. What will change next time?

It may show:

- Completed planned work.
- New personal records.
- Exercises progressed.
- Exercises held or reduced.
- Readiness-adjustment outcome.
- Technique or pain notes.
- One concrete next-session action.

Raw volume remains available but is not the main success message for beginners.

## 6. Data architecture

### 6.1 Schema version

Increment `AppState.schemaVersion` from 3 to 4.

Historical session snapshots remain immutable. Migration must preserve all v3 sessions, custom exercises, custom programs, settings, and body data.

### 6.2 Exercise definition

`Exercise` describes stable exercise metadata, not a complete prescription.

Add structured fields:

```ts
type TrackingMode =
  | "weight-reps"
  | "bodyweight-reps"
  | "assisted-reps"
  | "weighted-bodyweight-reps"
  | "duration"
  | "distance";

type MovementPattern =
  | "squat"
  | "hinge"
  | "horizontal-push"
  | "vertical-push"
  | "horizontal-pull"
  | "vertical-pull"
  | "lunge"
  | "isolation"
  | "carry"
  | "core";
```

Exercise metadata also records unilateral behavior, compatible equipment, contraindication tags, and progression-compatible alternatives.

### 6.3 Exercise prescription

Replace `WorkoutDay.exercises: ExerciseId[]` with ordered prescriptions.

```ts
type ExercisePrescription = {
  id: string;
  exerciseId: ExerciseId;
  order: number;
  setScheme: SetPrescription[];
  restSeconds: number;
  targetEffort: EffortTarget;
  progression: ProgressionStrategy;
  coachingCue?: string;
  optional: boolean;
  priority: "primary" | "secondary" | "accessory";
  supersetGroup?: string;
};
```

A prescription belongs to a workout day. The same exercise may therefore use different programming in different sessions.

### 6.4 Set prescriptions and logged sets

Use discriminated unions so each tracking mode stores appropriate data.

Examples:

- Weight and reps.
- Bodyweight plus optional added load.
- Assistance load and reps.
- Duration.
- Distance.

Logged set snapshots include the prescription target used at the time. Future program edits cannot rewrite historical intent.

### 6.5 Program and mesocycle

A program contains:

- Program metadata.
- One or more mesocycle blocks.
- Workout-day prescriptions.
- Progression defaults.
- Deload policy.

For the first 4.0 release, built-in programs use a simple repeating block with optional coach-recommended deload. The model must support future multi-block programs without requiring another schema redesign.

## 7. Coach architecture

Create isolated domain modules with explicit inputs and outputs.

```text
src/features/coach/
  plan-builder.ts
  readiness.ts
  progression.ts
  substitution.ts
  recap.ts
  explanations.ts
```

### 7.1 Coach decision contract

Every recommendation returns:

```ts
type CoachDecision<T> = {
  value: T;
  reasonCode: string;
  explanation: string;
  confidence: "low" | "medium" | "high";
  evidence: CoachEvidence[];
};
```

The UI renders the explanation. Tests assert both the decision and its reason code.

### 7.2 Plan builder

Inputs:

- Goal.
- Experience calibration.
- Available days.
- Session duration.
- Equipment profile.
- Priority muscles.
- Structured movement restrictions.

Outputs:

- One recommended built-in plan variant.
- Equipment-safe prescriptions.
- Estimated session duration.
- Human-readable selection reasons.

If no safe substitution exists, the builder removes or replaces the movement with a compatible pattern and rebalances the session. It never falls back silently to unavailable equipment.

### 7.3 Readiness engine

Readiness produces a temporary session adjustment. It does not mutate the base program.

Adjustment priority:

1. Safety and pain flags.
2. Preserve primary movement patterns.
3. Remove optional accessories when time is short.
4. Reduce set count before changing the entire session.
5. Reduce target effort when recovery is poor.

### 7.4 Progression strategies

Initial supported strategies:

- **Double progression:** default hypertrophy strategy. Add reps within a range, then increase load.
- **Linear load progression:** beginner compound strategy with conservative increments.
- **Rep progression:** bodyweight movements.
- **Duration progression:** timed core or conditioning movements.
- **Manual:** coach displays history but makes no automatic load change.

A strategy considers completed working sets, target effort, recent interruptions, pain flags, and available load increments. One poor session is insufficient to classify a plateau.

### 7.5 Preference learning

4.0 records explicit signals only:

- User marks an exercise as preferred or avoided.
- User chooses “always use this substitution.”
- User provides a reason when repeatedly skipping an exercise.

The coach does not infer strong preferences from a single edit.

## 8. Safety behavior

- RPE/RIR is guidance, not a medical measurement.
- Sharp, unusual, worsening, or joint-specific pain blocks automatic progression for the affected movement.
- Pain flags trigger substitution or a recommendation to stop, not a diagnosis.
- The app must distinguish normal muscle effort from pain in its copy.
- No automatic deload or load increase occurs without a visible explanation.
- The user can override non-safety recommendations.

## 9. Migration from schema v3

Migration steps:

1. Copy stable exercise metadata into the v4 exercise format.
2. Convert each built-in and custom workout exercise ID into an `ExercisePrescription` using the current exercise defaults.
3. Assign `double-progression` to rep-range resistance exercises, `rep-progression` to bodyweight exercises, and `duration-progression` to timed exercises.
4. Convert existing `SetEntry` records into the matching v4 logged-set variant.
5. Preserve all historical snapshots and weekly-goal snapshots.
6. Preserve active drafts and make them completable after migration.
7. Record migration warnings rather than deleting malformed individual records.

A v3 backup imported into v4 must produce the same visible history totals within the limits of the old schema.

## 10. Error handling and degradation

- Missing exercise metadata falls back to the immutable session snapshot.
- An unsupported prescription is displayed as manual logging rather than crashing.
- Failed plan generation returns a safe default Full Body plan with a visible warning.
- Corrupt records are isolated and reported; they do not reset the full state.
- Readiness and progression engines return low-confidence manual guidance when evidence is insufficient.
- Service-worker or notification failures do not block workout logging.

## 11. Testing strategy

### Domain tests

Cover:

- v3-to-v4 migration.
- Equipment-safe plan generation.
- Each progression strategy.
- Readiness adjustments.
- Pain-blocked progression.
- Session-duration reduction.
- Historical snapshot preservation.
- Bodyweight, assisted, weighted-bodyweight, and duration tracking.
- Coach explanation reason codes.

Target at least 40 focused domain tests before merge.

### Component tests

Cover:

- Onboarding flow.
- Readiness form.
- Inline previous-set copy.
- Optional effort input.
- Substitution flow.
- Workout recap.

### End-to-end tests

Playwright scenarios:

1. New beginner completes onboarding and first workout.
2. Returning user receives and applies a progression recommendation.
3. Low-readiness user receives a shortened session.
4. Pain flag substitutes or blocks an affected exercise.
5. Existing v3 state migrates and completes an active workout.

### Accessibility and responsive checks

- Automated accessibility scan on onboarding and workout screens.
- Keyboard completion of the core flow.
- Mobile widths at 360, 390, and 430 pixels.
- Touch targets at least 44 pixels for primary gym-floor actions.
- No focused input hidden behind mobile navigation or the soft keyboard.

## 12. Success criteria

The implementation is acceptable when:

- A new user can reach a recommended first workout in under three minutes.
- A returning user can start today's workout from the home screen in under ten seconds.
- A normal set can be logged in under five seconds without mandatory RPE input.
- No generated plan contains unavailable equipment.
- Every automatic load, set-count, exercise, or effort adjustment includes a visible reason.
- All v3 fixtures migrate without losing history.
- The five end-to-end critical flows pass in CI.
- `npm run check` includes type checking, domain tests, component tests, production build, and critical E2E tests.

## 13. Proposed delivery sequence

1. Schema v4 and migration foundation.
2. Prescription-based built-in programs and equipment-safe plan builder.
3. Onboarding v2 and readiness check.
4. Workout logger redesign around inline guidance.
5. Progression strategies and coaching explanations.
6. Post-workout recap and explicit preference signals.
7. Component/E2E/accessibility coverage.
8. Release documentation and production rollout.

Each stage must leave the app buildable and must preserve v3 user data.

## 14. Release policy

Implementation will occur on `agent/liftpath-4-guided-coach` and be reviewed through a draft pull request. The branch will not be merged automatically. Production deployment occurs only after CI, migration verification, and manual mobile review are complete.
