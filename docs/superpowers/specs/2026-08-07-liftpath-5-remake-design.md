# LiftPath 5 Remake — Design Specification

**Date:** 2026-08-07  
**Status:** Design approved for planning  
**Scope:** Product, training-system, UX, data, safety, testing, and release design only  
**Implementation:** Not authorized by this document

## 1. Purpose

LiftPath 5 is a clean-slate remake of LiftPath as an offline-first personal training coach for beginner-to-intermediate users. The product must do more than store workout logs or ship fixed templates: it must generate a suitable training prescription from a user’s goal, specialization, constraints, and selected training structure; observe real training data; diagnose meaningful patterns; and propose bounded, explainable adaptations that the user explicitly accepts, modifies, or skips.

The flagship use case is **Hypertrophy + V-Shape specialization**, but the architecture must remain general enough to support additional physique and strength specializations without creating a separate hard-coded program for each combination.

The remake is intentionally not backward-compatible with LiftPath 4 data. LiftPath 4 storage must nevertheless remain untouched and recoverable; LiftPath 5 must use separate storage identity and must not silently clear, convert, or overwrite V4 data.

## 2. Approved Product Decisions

The following decisions are locked for the design and must not be silently reinterpreted during planning or implementation:

1. **Product mode:** Personal Coach, not a full social fitness platform.
2. **Audience:** Build for the primary owner/use case first, but design the engine so other users can use it.
3. **Training level:** Beginner through intermediate.
4. **Primary goals:** Hypertrophy, Strength, General Fitness.
5. **Specializations:** Physique and Strength.
6. **Specialization model:** A specialization modifies a primary goal rather than replacing it.
7. **Specialization capacity:** One primary specialization and at most one secondary focus.
8. **Flagship specialization:** V-Shape / V-Taper.
9. **Physique assessment:** Training data only; no body measurements or photo analysis are required for Coach decisions about physique specialization progress. Readiness inputs such as energy, soreness, and user-reported pain remain allowed because they are training-state inputs, not physique measurements.
10. **Coach authority:** Coach recommends; the user accepts, modifies, or skips material program changes.
11. **Training structure ownership:** The user owns the selected split/training structure. Coach must not automatically change it or proactively propose changing it during normal adaptation. Re-selection occurs only when the user explicitly enters a change-structure flow.
12. **Split selection:** Coach proposes 2–3 suitable structures and the user chooses one.
13. **Core engine:** Deterministic constraint-based prescription plus bounded adaptation rules, not an LLM-generated training program.
14. **Data strategy:** Clean-slate V5 schema, no V4 migration requirement.
15. **Runtime strategy:** Local-first and offline-capable; no mandatory account or backend.

## 3. Product Thesis

LiftPath 5 must feel like a coach preparing and adapting training, not like a database dashboard.

The main training loop is:

```text
Assess
  -> Prescribe
  -> Train
  -> Observe
  -> Diagnose
  -> Recommend
  -> User Approves / Modifies / Skips
  -> Adapt
  -> Repeat
```

The core product behavior is governed by **Minimum Effective Intervention**: if the current prescription is working, the Coach should not change it. When a change is needed, it should prefer the smallest meaningful intervention that addresses the diagnosed problem while preserving useful training continuity.

## 4. Training Journey A–Z

### 4.1 First-time assessment

Onboarding gathers only variables that materially affect prescription:

- training experience and familiarity with common resistance-training movements;
- primary goal;
- primary specialization and optional secondary focus;
- weekly training-day availability;
- desired session-duration limit;
- available equipment;
- disliked exercises or meaningful preferences;
- movement restrictions and user-reported pain flags.

The app does not need physique photos, shoulder/waist measurements, or inferred body-composition estimates to make Coach decisions about specialization progress.

### 4.2 Primary goals

V5.0 supports:

- Hypertrophy;
- Strength;
- General Fitness.

The primary goal controls broad programming policy such as progression emphasis, rep-range suitability, exercise specificity, and workload distribution.

### 4.3 Specialization system

Specializations are modifiers layered over the primary goal.

Initial physique specializations:

- V-Shape / V-Taper;
- Chest;
- Shoulders;
- Arms;
- Back Width;
- Back Thickness;
- Quads;
- Posterior Chain / Glutes-Hamstrings.

Initial strength specializations:

- Bench Press;
- Squat;
- Deadlift;
- Overhead Press.

V-Shape is the reference specialization and receives the deepest initial implementation.

### 4.4 V-Shape policy intent

For Hypertrophy + V-Shape, the engine should generally treat:

- lats as specialization priority;
- side delts as specialization priority;
- rear delts and upper back as high supporting priorities;
- upper chest as moderate-high support where appropriate;
- arms as normal-to-moderate support;
- remaining torso and lower body as balanced development/maintenance according to the user’s level and total workload budget.

V-Shape does **not** mean abandoning balanced whole-body training, maximizing back volume indiscriminately, or claiming that the app can directly measure visual V-taper development.

### 4.5 Training structure selection

After assessment, LiftPath proposes 2–3 suitable structures based on goal, specialization, availability, session duration, experience, and equipment. Each option must explain:

- why it fits;
- expected session duration;
- useful frequency characteristics;
- specialization distribution;
- meaningful trade-offs.

Once the user chooses a structure, Coach adaptations must remain within that structure. A separate user-initiated **Change Training Structure** flow can later re-run proposal logic.

### 4.6 Prescription sequence

The Prescription Engine solves, in order:

1. muscle or movement priority;
2. total workload budget;
3. frequency/exposure distribution within the chosen structure;
4. exercise selection;
5. exercise order;
6. sets, rep ranges, effort targets, and rest guidance;
7. initial load calibration where necessary.

### 4.7 Volume and specialization budget

V5 must not encode a universal fixed weekly set number for every muscle and every user. It should use policy-defined workload bands/bounds that consider:

- experience;
- primary goal;
- specialization;
- current tolerance/history;
- total session capacity;
- distribution across the selected training structure.

Specialization should preferentially **redistribute** training resources before simply increasing total workload. If more side-delt emphasis is needed, the first question is whether lower-priority workload can be reduced or rearranged before adding total weekly sets.

The design intentionally does not lock exact set ceilings, indirect-set coefficients, or rep-range tables. Those values must be defined as versioned policy constants during implementation planning and validated through tests/scenarios rather than presented as universal physiological truths.

### 4.8 Direct and indirect workload

The engine may model direct and meaningful indirect work separately. A simple first heuristic may use direct-set credit and partial indirect-set credit, but any coefficient is an explicit, versioned programming heuristic rather than a claim of physiological precision.

The UI must not present fabricated exactness such as an opaque “muscle stimulus = 87/100” metric.

### 4.9 Exercise metadata

Exercise identity is stable and independent of display name. The catalog should support metadata including:

- primary and secondary muscles;
- movement pattern;
- equipment;
- stability/setup characteristics;
- skill requirement;
- fatigue class/cost;
- suitable rep ranges;
- progression suitability;
- goal compatibility;
- substitution/training-intent groups.

The initial catalog should be curated rather than maximal; roughly 100–200 well-described common gym movements are more useful than thousands of weakly tagged entries.

### 4.10 Exercise ordering

Specialization affects not only weekly sets but also exercise order and placement. Priority work may be moved earlier when late-session fatigue repeatedly limits performance, provided the selected training structure itself is unchanged.

### 4.11 Initial load calibration

For a new or uncalibrated exercise, LiftPath should guide the user through a conservative calibration flow using target reps and an effort estimate such as RIR. The engine may suggest a small load adjustment between sets when the observed result is clearly too easy or too hard, but the user remains in control. A user-confirmed within-session calibration adjustment is an execution aid, not a silent program-version change.

### 4.12 Working prescription

A prescription is explicit and practical, for example:

```text
Lat Pulldown
3 working sets
8–12 reps
Target RIR 2
Rest 2–3 min
```

Rep range and progression policy depend on exercise and goal; there is no requirement that every exercise use identical progression rules.

### 4.13 In-workout Coach behavior

The Coach should remain quiet during ordinary successful training. It may surface a compact intervention only when observed data materially warrants attention, such as severe set-to-set drop-off, a pain flag, or a constraint problem.

Normal workout logging must never depend on the Coach being available.

### 4.14 Progression

V5 may support multiple progression policies, including:

- double progression;
- load progression;
- rep progression.

Progression decisions use performance **and** effort. Reaching the top of a rep range at an excessive effort level does not necessarily imply an immediate load increase.

### 4.15 Post-workout recap

The first recap view should answer three questions:

1. **What happened?**
2. **What mattered?**
3. **What happens next?**

Deep statistics remain available as secondary detail rather than replacing the summary.

### 4.16 Session-to-session adaptation

The engine separately tracks lifecycle, performance trend, effort status, and adherence rather than collapsing them into one vague state.

Example lifecycle states:

- UNCALIBRATED;
- CALIBRATING;
- ACTIVE;
- REVIEW_REQUIRED;
- PAUSED.

Example performance states:

- INSUFFICIENT_DATA;
- IMPROVING;
- STABLE;
- DECLINING.

Example effort states:

- TOO_EASY;
- ON_TARGET;
- TOO_HARD;
- INCONSISTENT.

Adherence states may include COMPLETE, PARTIAL, and MISSED.

### 4.17 Plateau diagnosis

A plateau must not automatically trigger added volume. Diagnosis should consider, in priority order:

1. safety/pain;
2. exercise execution or calibration issues;
3. adherence;
4. inappropriate effort;
5. session fatigue/order;
6. broader recovery/fatigue patterns;
7. actual progression plateau;
8. prescription adjustment.

The Coach must distinguish “not progressing because the user is repeatedly missing prescribed work” from “not progressing despite consistent adherence and on-target effort.”

### 4.18 Deload

V5 may support scheduled deload logic, but the default experience should not require a fixed deload every N weeks. Material deload recommendations should be evidence-backed, such as broad performance regression combined with fatigue/recovery signals, and require user approval.

### 4.19 Exercise replacement

Exercise replacement should preserve training intent. A movement should not be changed solely because another exercise targets the same broad body part. Reasons to consider replacement include pain/discomfort, equipment availability, persistent execution problems, strong user dislike, prolonged plateau after simpler interventions, or a changed specialization need.

### 4.20 Training blocks

Beginner-to-intermediate training may use stable blocks/mesocycles to avoid constant program churn. End-of-block review considers progression, adherence, fatigue, and specialization response before proposing a next block.

### 4.21 Goal or specialization changes

A user may intentionally switch goal or specialization. Coach should prefer a bounded transition that preserves useful movements and training history rather than destroying the whole program without cause.

## 5. Coach Engine Architecture

### 5.1 Core architecture

The Coach uses four conceptual layers:

```text
Prescription Layer
  -> Observation Layer
  -> Diagnosis Layer
  -> Recommendation Layer
```

The Coach core is deterministic and implemented as pure domain logic. It does not call a language model to generate the prescription.

### 5.2 CoachContext

Application code builds an immutable `CoachContext` snapshot containing only the data needed for the current evaluation, such as:

- profile;
- goal;
- specialization;
- active training structure/program;
- recent exercise exposures;
- recent workload summaries;
- adherence;
- readiness inputs;
- relevant policy versions.

The engine must not scan an entire multi-year history on every set completion.

### 5.3 Recommendation model

A material recommendation contains at least:

- recommendation type / proposed change;
- reason code;
- human-readable explanation;
- evidence references;
- expected outcome or intent;
- confidence band;
- affected prescription/program scope;
- policy version;
- user decision state: pending / accepted / modified / skipped;
- effective point such as next session, next week, or next block.

### 5.4 Recommendation priority

When rules compete, priority is:

1. safety;
2. explicit constraint violations;
3. adherence problems;
4. excessive fatigue;
5. progression;
6. specialization optimization.

Safety must always outrank a performance recommendation.

### 5.5 Evidence and confidence

The Coach must not diagnose a plateau from one bad workout. Evidence confidence gates intervention size:

- low evidence -> no or very small intervention;
- medium evidence -> modest intervention may be proposed;
- high evidence -> material program intervention may be proposed.

Larger changes such as replacing an exercise, materially changing workload, or recommending a deload require stronger evidence than continuing a current load or adding a small rep progression target.

### 5.6 Change budget

A material adaptation should normally alter one primary variable at a time. For example, excessive effort should first trigger an effort/load correction before simultaneously changing exercise, rep range, set count, and order. This preserves causal interpretability and training continuity.

### 5.7 Goal policy and specialization policy

The engine composes goal and specialization policies instead of creating one hard-coded program per combination:

```text
Goal Policy
  + Specialization Policy
  + User Constraints
  + Current Training State
  -> Prescription / Recommendation
```

V-Shape, Arms, Bench, and other specializations share common engine machinery while expressing different bounded priority policies.

### 5.8 No fake physique inference

With training-data-only assessment, the Coach may say that lat training performance is improving, stable, or declining. It must not claim that the user’s lats “grew by 4%,” that body proportions changed, or that physique development is optimal without measurements capable of supporting such claims.

## 6. Core Coach Invariants

The following invariants are mandatory:

1. **User owns training structure.** Normal Coach adaptation cannot replace the chosen split.
2. **User approval for material changes.** Coach recommends; user accepts, modifies, or skips.
3. **Raw training history is authoritative.** Coach must not rewrite historical results.
4. **No fake physique inference.** Training performance is not direct body-composition evidence.
5. **Minimum Effective Intervention.** Do not change a working program without evidence.
6. **Evidence before adaptation.** One anomalous session is generally insufficient for a major change.
7. **Safety outranks progression.** Pain/safety state can block normal progression recommendations.
8. **Specialization redistributes first.** Do not blindly grow total workload.
9. **Explain material changes.** Every Coach change must have a traceable reason/evidence record.
10. **Deterministic core.** Same `CoachContext` + same policy version produces the same domain decision.

## 7. Product and Data Architecture

### 7.1 Layering

V5 uses five logical layers:

```text
Presentation (React/PWA)
  -> Application use cases/orchestration
  -> Domain Core (training/programming/coaching)
  -> Repository ports/interfaces
  -> Infrastructure (IndexedDB/backup/future sync)
```

Domain code must not depend on React, browser UI state, network access, or IndexedDB directly.

### 7.2 Domain Core

The domain core is pure TypeScript with functions/use cases conceptually similar to:

- create/evaluate prescription;
- evaluate exercise performance;
- diagnose training state;
- generate recommendations;
- validate approved changes.

Domain input produces domain output without side effects.

### 7.3 Application Layer

Application code coordinates validation, persistence, transactions, and Coach invocation. For example, completing a set follows:

```text
Record Set
  -> Validate invariants
  -> Persist atomically
  -> Update session state
  -> Build relevant CoachContext
  -> Evaluate if needed
  -> Persist recommendation if one exists
  -> Notify UI
```

### 7.4 Primary storage

IndexedDB is the primary persistent database for V5. LocalStorage must not contain a giant serialized whole-app state as the primary storage model.

Data is normalized into domain-oriented stores/tables such as profiles, programs, program versions, sessions, exercises-in-session, sets, recommendations, recommendation decisions, exercise states, muscle states, readiness entries, settings, metadata, backup/recovery metadata, and derived summaries.

Exact store names remain an implementation detail, but the normalized separation is required.

### 7.5 Data classes

Data is classified as:

**Authoritative records**
- completed sets;
- completed sessions;
- explicit user decisions;
- goal/specialization changes;
- program versions.

**Current state**
- active program/version;
- current prescription;
- current exercise/muscle state.

**Derived/cached data**
- weekly workload summaries;
- adherence percentages;
- trend calculations;
- chart aggregates.

Derived data must be rebuildable from authoritative records.

### 7.6 Atomic set persistence

A completed set is persisted immediately. UI may confirm success only after the storage transaction succeeds. If persistence fails, the app must surface an explicit persistent warning and provide retry/recovery options. Storage errors must not be silently swallowed.

### 7.7 Crash recovery

An in-progress workout is recoverable from IndexedDB after browser/tab/PWA interruption. Resume must reconstruct from persisted session data rather than relying on still-live React state.

### 7.8 Transaction boundaries

Actions such as accepting a Coach recommendation and activating a new program version must be transactional. Either all related records update or none do.

### 7.9 Program versioning

Material program changes create a new program version. Historical sessions remain linked to the version that prescribed them. Prior versions are not mutated retroactively.

### 7.10 Coach policy versioning

Recommendations store the policy version that generated them. New engine heuristics do not retroactively change the explanation of historical decisions.

### 7.11 Exercise identity

Exercise IDs are stable and not derived from display names. Metadata/display-copy changes do not invalidate historical references.

### 7.12 Workout edits

V5 does not require full event sourcing. Edited training records should use bounded revision/correction history sufficient to preserve auditability for material changes. The exact revision representation is an implementation detail to be settled in planning, but silent undetectable historical mutation is not preferred.

### 7.13 Backup

Backup is distinct from sync. A V5 backup bundle includes a versioned manifest, authoritative user/training/program data, recommendation history, settings as appropriate, schema/app versions, record counts, and integrity metadata/checksum where practical.

Import flow:

```text
Select backup
  -> Validate bundle/manifest/schema/records
  -> Show preview
  -> Create pre-import recovery snapshot
  -> User confirms
  -> Transactional import
```

Selecting a file must not immediately replace the current database.

### 7.14 Recovery snapshots

Before destructive or high-risk operations such as import, reset, large migration, or future cloud restore, V5 creates a recovery snapshot. A small bounded number of recent recovery snapshots may be retained.

### 7.15 Corruption handling

Corrupted data must not be converted into an apparently empty new-user state. V5 enters a Recovery Mode that can attempt repair, export a raw recovery bundle, restore a snapshot, or allow an explicit reset.

### 7.16 Error taxonomy

Application errors should distinguish at least:

- validation;
- storage;
- corrupted data;
- backup;
- network;
- future sync conflict;
- Coach policy error;
- unexpected error.

The UX response depends on category.

### 7.17 Coach fail-safe

If Coach evaluation fails, workout logging and the currently active prescription remain usable. Coach is an adaptation layer, not a single point of failure.

### 7.18 Sync readiness without V5.0 sync

V5.0 does not implement true multi-device sync, but records should use stable IDs and version/revision metadata appropriate for future record-level synchronization. Future sync must not compare two giant whole-app blobs and silently choose one.

## 8. UX and Information Architecture

### 8.1 Primary navigation

The four main destinations are:

- Today;
- Program;
- Progress;
- History.

Settings/Profile is secondary and does not require a fifth primary mobile tab.

Coach, readiness, calendar, exercise tools, and analytics are workflows within these destinations rather than equal top-level navigation items.

### 8.2 Today

Today is the product home and must answer:

1. What do I train today?
2. Is there a Coach decision requiring my attention?
3. How do I start?

The dominant action is **Start Workout**. Today must not become a dense analytics dashboard.

### 8.3 Coach UX

Coach is not a generic chatbot. It appears primarily as a decision/recommendation system.

Recommendation visibility levels:

- silent/no UI interruption;
- informational;
- action required.

Only action-required recommendations receive prominent placement.

### 8.4 Readiness

Pre-workout readiness remains lightweight. A default flow may collect energy and soreness with optional user-reported pain. These inputs are used as training-state/safety signals and are not treated as measurements of physique change. Normal users should be able to begin training with very few interactions.

### 8.5 Workout Mode

Starting a workout enters a focused mode where primary app navigation is hidden. The screen prioritizes:

- current exercise;
- current set;
- prescribed load/rep/effort guidance;
- previous comparable performance;
- fast editable actual values;
- one dominant **Complete Set** action.

Secondary tools such as warm-up help, notes, rest settings, plate calculator, substitution, and history use progressive disclosure.

### 8.6 Fast logging

For a returning user following an existing prescription, most sets should require only 1–3 primary interactions. Load and useful targets are prefilled from the prescription/history.

### 8.7 Exercise substitution

Replacement UX first proposes training-intent-compatible substitutes with a short explanation, then offers full browsing if needed. “Same broad body part” is not sufficient substitution logic.

### 8.8 Workout completion

The first recap view is concise:

- what happened;
- what improved or mattered;
- what happens next.

Detailed analytics remain secondary.

### 8.9 Program

Program explains what the user is currently training and why:

- primary goal;
- specialization;
- selected weekly structure;
- current block/week;
- specialization priorities;
- sessions;
- rationale;
- material program-change history.

Normal view mode is separate from explicit edit mode. User overrides are recorded separately from Coach-authored changes.

### 8.10 Change Training Structure

Coach does not spontaneously recommend switching split. The user explicitly enters a change-structure flow, after which LiftPath can again propose 2–3 suitable structures.

### 8.11 Progress

Progress prioritizes an interpretable answer before charts. It may summarize:

- adherence;
- exercise trends;
- specialization training status;
- recent Coach assessment.

V-Shape progress reports training response of relevant movements/muscle priorities, not unmeasured body-shape change.

### 8.12 History

History is the authoritative human-readable record. It supports list and optionally calendar views, pagination, session details, actual set values, notes, program version, and linked Coach decisions.

### 8.13 Onboarding

Onboarding is a short stepwise wizard rather than one giant form. Suggested flow:

```text
Welcome
 -> Experience
 -> Primary Goal
 -> Specialization
 -> Training Days
 -> Session Duration
 -> Equipment
 -> Restrictions / Preferences
 -> 2–3 Structure Proposals
 -> Program Preview
 -> User Starts Program
```

Program generation does not silently activate before the user reviews and accepts it.

### 8.14 Visual direction

Retain LiftPath’s strong dark athletic identity and lime/high-energy accent, but reduce excessive neon, over-large hero typography, nested cards, border density, and narrow desktop-only columns. The intended direction is **premium performance instrument + coach**, not a gaming dashboard.

Mobile remains task-first. Desktop should use available width for meaningful contextual panels rather than simply centering an enlarged mobile column.

### 8.15 UX invariants

1. One dominant action per screen.
2. Today answers “what now?”
3. Coach speaks only when useful.
4. Explanation before complexity.
5. Progressive disclosure for advanced tools.
6. Workout logging is extremely fast.
7. User decisions are explicit.
8. No fake precision.

The product should optimize for less time operating the app and more time training successfully.

## 9. V5.0 Feature Scope

### 9.1 Must-have

V5.0 includes:

- new onboarding;
- Hypertrophy / Strength / General Fitness goals;
- physique + strength specialization framework;
- fully developed V-Shape reference specialization;
- one primary specialization + optional secondary focus;
- 2–3 training-structure proposals;
- user-owned structure;
- deterministic Prescription Engine;
- curated exercise metadata/catalog;
- workload/frequency allocation;
- exercise ordering;
- initial-load calibration;
- progression policies;
- RIR/RPE support;
- lightweight readiness;
- focused Workout Mode;
- fast set logging;
- rest timer;
- intent-aware substitutions;
- Coach recommendations;
- Accept / Modify / Skip;
- plateau diagnosis;
- bounded fatigue handling;
- deload recommendations;
- program versioning;
- recommendation history;
- Progress overview;
- specialization training-status view;
- exercise performance trends;
- History;
- IndexedDB persistence;
- crash recovery;
- backup import/export;
- recovery snapshots;
- offline-first PWA behavior;
- domain validation;
- deterministic Coach tests and golden scenarios.

### 9.2 Explicitly out of V5.0

V5.0 does not include:

- mandatory login;
- mandatory backend;
- true cloud sync;
- social/community features;
- challenges/streak manipulation loops;
- trainer marketplace;
- generic AI fitness chatbot;
- physique photo analysis;
- calorie/macronutrient tracking;
- nutrition planning;
- smartwatch integration;
- Health Connect / Apple Health integration;
- advanced competitive-athlete programming;
- V4 data migration.

## 10. Future Release Scope

### 10.1 V5.1 — quality and depth

Potential V5.1 additions:

- supersets/paired sets/circuits;
- richer warm-up assistance;
- enhanced plate calculator;
- exercise cues/notes;
- more advanced custom exercises/program editing;
- rescheduling and missed-session flows;
- vacation/training-break return flow;
- richer charts and rolling workload trends;
- block comparison;
- custom specialization tooling.

### 10.2 V5.2 — optional cloud

Only after local experience is proven reliable:

- optional account;
- cloud backup;
- multi-device restore;
- eventual record-level sync.

Core training must remain usable without login.

### 10.3 Later

Potential later scope:

- import mappings from other workout trackers;
- health-platform/wearable integrations;
- conditioning/athletic goals;
- advanced strength blocks and peaking;
- optional LLM explanation/education layer that does not own core prescription logic.

## 11. Testing Strategy

### 11.1 Test pyramid

Use five main layers:

```text
Domain unit tests
 -> Coach golden-scenario tests
 -> Repository/database integrity tests
 -> Component/integration tests
 -> Critical-path E2E
```

Most Coach correctness must be testable without a browser.

### 11.2 Domain tests

Cover at least:

- progression;
- effort classification;
- adherence classification;
- workload calculation;
- direct/indirect contribution heuristics;
- exercise substitution compatibility;
- specialization allocation;
- workload redistribution;
- diagnosis order;
- recommendation priority;
- program-version generation.

### 11.3 Golden Coach scenarios

Maintain named scenarios as living behavioral specifications, including at minimum:

- healthy V-Shape progression -> no unnecessary change;
- side delts stable with high adherence/on-target effort -> specialization review, not immediate arbitrary volume increase;
- stable performance with persistent excessive effort -> effort correction before volume increase;
- pain flag -> no normal progression path;
- high specialization workload + plateau -> do not blindly add volume.

Every discovered Coach bug should create a regression scenario where appropriate.

### 11.4 Determinism

Same `CoachContext` + same policy version must produce the same domain decision. Time-dependent behavior receives an explicit supplied clock/date in context rather than reading ambient time unpredictably.

### 11.5 Property/invariant tests

Where practical, test invariants over generated inputs, including:

- pain flag never produces normal load-increase advice for the affected movement;
- Coach never changes user-owned training structure;
- invalid negative reps/load cannot persist;
- specialization cannot exceed policy hard bounds;
- program changes preserve referential/version integrity.

### 11.6 Recommendation tests

Assert structured fields such as type, reason code, evidence, confidence, affected prescription, and policy version rather than relying only on localized display copy.

### 11.7 Persistence tests

Required database tests include:

- atomic set completion;
- interruption/resume;
- transactional recommendation acceptance + new program version + activation;
- normalized referential integrity;
- safe derived-cache rebuild.

### 11.8 Backup round-trip gate

A release candidate must prove:

```text
Create representative DB
 -> Export
 -> Delete/reset V5 local DB
 -> Import
 -> Compare authoritative records
```

The acceptance requirement is authoritative-data equivalence, not merely “import did not crash.”

### 11.9 Corruption tests

Test malformed/truncated backup, invalid schema/version, invalid references, corrupted records, and checksum/integrity failure. Expected behavior is explicit recovery/repair flow, not a silent empty state.

### 11.10 Large-history performance

Synthetic datasets should include approximately:

- 100 sessions;
- 500–1,000 sessions;
- 2,000 sessions;
- 10,000 sessions stress case.

Measure startup, Today query, workout start, set completion, History pagination, and Progress aggregation. Set logging must not scale linearly with total historical record count.

### 11.11 E2E critical journeys

At minimum:

1. Fresh install -> onboarding -> V-Shape -> choose structure -> approve program -> start workout -> save set.
2. Resume interrupted workout.
3. Coach recommendation -> Accept -> new program version activates.
4. Backup export -> reset -> restore.
5. Pain flag -> normal progression blocked.
6. Offline launch -> workout remains usable.

## 12. Safety and Product Integrity

### 12.1 Scope boundary

LiftPath is a resistance-training programming tool. It is not a physician, physiotherapist, diagnostic device, or rehabilitation system.

### 12.2 Pain behavior

User-reported pain must pause normal progression for the affected movement and offer safe workflow choices such as stopping/skipping the movement or reviewing compatible alternatives. The product must not infer a medical diagnosis from the pain report.

### 12.3 Beginner safeguards

Beginner policy should prefer:

- conservative starting workload;
- no mandatory training to failure;
- lower exercise complexity where reasonable;
- stable programs with low churn;
- understandable progression;
- bounded specialization that cannot destroy balanced training.

### 12.4 Confidence wording

Copy must separate observation, inference, and recommendation. The app should say what it observed, what pattern it inferred, and what it recommends, without claiming biological certainty it cannot measure.

## 13. Accessibility and Device Quality Gates

Core funnels require:

- keyboard usability;
- visible focus;
- dialog focus trap/restore;
- semantic labels;
- usable touch targets;
- reduced-motion consideration;
- sufficient contrast;
- no serious/critical automated accessibility violations.

Device coverage includes small Android-sized viewports, mainstream mobile, iPhone-class viewport, tablet, desktop, virtual keyboard behavior, landscape, and installed-PWA standalone mode.

## 14. Performance Targets

Initial product targets:

- LCP p75 < 2.5 s where field measurement is applicable;
- INP p75 < 200 ms;
- CLS < 0.1;
- returning user can reach the first working set in under ~30 seconds in a normal existing-program flow;
- most set logs require only 1–3 primary interactions;
- large history does not create perceptible set-save lag.

These are product targets to verify, not guaranteed current-state claims.

## 15. Release Strategy

### 15.1 Development isolation

LiftPath 4 on `main` remains the stable product while V5 develops through bounded vertical slices. The implementation should not create a long-lived half-V4/half-V5 runtime on main.

### 15.2 Suggested vertical slices

1. **Foundation** — domain contracts, IDs/versioning, IndexedDB repository foundation, persistence/recovery, test harness.
2. **Workout Core** — program/session/set data, exercise catalog, workout logging, crash recovery.
3. **Prescription** — onboarding, goals, specialization framework, structure proposals, program generation.
4. **Adaptation Coach** — progression, diagnosis, recommendations, approval workflow, program versioning.
5. **V-Shape Deepening** — full flagship policy, redistribution, order adaptation, specialization status.
6. **Product UX** — Today, Program, Progress, History, polished mobile/desktop flows.
7. **Hardening** — performance, backup round-trip, corruption recovery, accessibility, PWA/offline, adversarial Coach tests.

The detailed implementation plan may subdivide these further, but must preserve vertical verifiability and avoid a single giant rewrite merge.

### 15.3 Preview environment

Before V5 becomes the default, it should run as a separate preview/development experience long enough for real training usage to expose Coach, persistence, and workout-flow defects while V4 remains available.

### 15.4 Storage isolation

V5 uses its own IndexedDB/database identity and storage keys. It must not clear or overwrite V4 LocalStorage, IndexedDB, or backups automatically.

### 15.5 Launch gates

V5 cannot replace V4 as default until evidence demonstrates:

**Data reliability**
- no silent lost-set path in verified critical flows;
- interrupted-workout recovery;
- backup round-trip;
- corruption/recovery path.

**Coach integrity**
- golden scenarios pass;
- deterministic behavior tests pass;
- safety invariants pass.

**UX**
- onboarding-to-workout funnel works;
- fast logging target is practically met;
- Coach does not create blocking noise in normal sessions.

**Performance**
- large-history stress behavior is acceptable;
- agreed Web Vitals targets are measured where applicable.

**Accessibility**
- core funnel passes agreed automated/manual checks.

**Real usage**
- preview has been used in real training sessions enough to uncover obvious Coach behavior problems before default rollout.

### 15.6 Rollback and migration safety

Future V5 schema migrations are versioned. Risky migrations create a pre-migration recovery snapshot where feasible. A new app deployment must not casually make rollback impossible by destructively rewriting the local DB without recovery strategy.

### 15.7 Feature flags

Experimental Coach/analytics modules may be gated so that unstable optional functionality cannot block core workout logging.

## 16. Privacy and Telemetry

Core V5 functionality does not depend on telemetry. If product analytics are later added, they should be privacy-conscious and separated from Coach data. Workout history and pain-related inputs must not be uploaded by default merely for engagement analytics.

Local-first is a runtime property, not marketing copy.

## 17. Official V5.0 Non-goals

V5.0 does not attempt to:

1. replace medical or rehabilitation professionals;
2. coach elite/competitive athletes;
3. provide advanced powerlifting peaking;
4. measure muscle growth directly;
5. evaluate physique through the camera;
6. track calories/macros or provide nutrition planning;
7. become a social fitness network;
8. become a marketplace;
9. provide real-time multi-device sync;
10. provide a generic AI fitness chatbot;
11. migrate V4 user data;
12. support every sport or conditioning discipline.

## 18. V5.0 Success Model

The remake must make six capabilities excellent:

1. **Prescribe** — create a reasonable program from goal + specialization + constraints + chosen structure.
2. **Guide** — make today’s training understandable to a beginner/intermediate user.
3. **Log** — capture workout data quickly and reliably.
4. **Observe** — convert history into explainable training state.
5. **Adapt** — propose evidence-backed, bounded changes without overreacting.
6. **Preserve** — avoid silent training-data loss and provide recovery/backup paths.

## 19. Reference User Path

The primary reference path for V5 design and acceptance is:

```text
Primary Goal: Hypertrophy
Specialization: V-Shape
Level: Beginner -> Intermediate
Physique progress assessment: Training data only
Training-state inputs: Energy / soreness / user-reported pain allowed
Structure: User selects from 2–3 Coach proposals
Coach authority: Recommend / user approves
Runtime: Local-first PWA
Persistence: IndexedDB + recovery + backup
```

This path is not a special hard-coded app mode. It is the reference case used to prove the generic goal + specialization + constraints + adaptation architecture.

## 20. Planning Handoff Constraints

The implementation plan created from this design must:

- preserve all approved product decisions and invariants above;
- avoid V4 data migration work;
- preserve V4 storage while isolating V5 storage;
- avoid mandatory backend/account dependencies in V5.0;
- prioritize data integrity and workout logging before advanced Coach behavior;
- implement Coach behavior through testable deterministic domain policies;
- define policy constants (for example workload bounds and indirect-work heuristics) explicitly, version them, and cover them with scenario tests rather than treating them as universal facts;
- use V-Shape as the first deep specialization without hard-coding the entire app to that specialization;
- keep React/UI separate from Coach/domain logic;
- plan backup/recovery and failure handling as first-class features rather than end-stage polish;
- treat performance, accessibility, safety, and large-history behavior as acceptance gates;
- avoid implementation until the written design spec is reviewed and approved.
