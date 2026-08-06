# LiftPath 4.1 Core Funnel UI/UX Redesign

## Status

Approved design direction: **Athletic Precision / Focused Coach**.

Scope is limited to the core funnel:

1. Onboarding
2. Readiness
3. Workout
4. Recap

The LiftPath 4.0 domain model, schema v4, migration logic, plan builder, readiness engine, progression engine, storage, PWA behavior and historical data semantics remain unchanged.

## Product objective

Make the app materially faster and clearer during real gym use while preserving transparent coaching and safety. The redesign must feel like a focused performance product rather than a dense configuration dashboard.

## Visual direction

- Dark charcoal foundation with high-contrast neutral text.
- Electric lime is reserved for primary actions, selected state, progress and positive coaching signals.
- Red and amber remain semantic safety colors.
- Athletic typography: compact headings, strong numeric hierarchy and restrained uppercase labels.
- Flat/open layout preferred over nested card stacks.
- Motion is brief and functional; reduced-motion settings are respected.
- Athlete imagery appears only in onboarding plan preview and must not obstruct text or controls.

## Core interaction principles

### 1. One primary action per viewport

Each screen must make the next action obvious. Secondary controls cannot visually compete with the primary CTA.

### 2. Set-first workout hierarchy

The active set inputs and complete-set button must be visible in the first mobile viewport at 390 × 844 without scrolling.

### 3. Progressive disclosure

Coach explanations and advanced workout editing remain available but are collapsed by default.

### 4. Fast readiness

Returning users can accept the planned workout immediately. Detailed energy, soreness, pain and time controls appear only after choosing to adjust.

### 5. Transparent safety

Pain-related blocking, removed exercises and reduced sets remain explicitly explained. The redesign must not weaken or hide safety decisions.

## Screen requirements

### Onboarding

- Preserve the four-step state machine and exact recommendation persistence.
- Step 1 uses a compact vertical goal list with a strong selected state.
- Step 2 retains schedule, duration, equipment and preferred-day controls.
- Step 3 shows experience and effort language first.
- Restrictions, notes and recent loads move into optional disclosure sections.
- Step 4 presents the exact plan recommendation with a local athlete image, plan facts, substitutions and warnings.
- Footer actions remain sticky within the onboarding surface.

### Readiness

- Initial state shows:
  - `Tập như kế hoạch`
  - `Tôi cần điều chỉnh`
- Default available minutes come from the prepared workout/profile duration rather than a fixed 60 minutes.
- Selecting `Tôi cần điều chỉnh` reveals energy, soreness, pain and available-time controls.
- Adjustment result is presented as concise deltas first, with full explanation available below.
- Blocked pain states remain unambiguous and cannot be bypassed through the primary CTA.

### Workout

First mobile viewport order:

1. Workout title and progress
2. Exercise title
3. Collapsed coach recommendation
4. Active set controls
5. Complete-set CTA
6. Rest/replace shortcuts

Requirements:

- Set inputs use large numeric typography and 44 px minimum touch targets.
- Previous-set value remains visible and copyable.
- Effort remains optional.
- Completed sets collapse into compact history rows with undo.
- Coach detail is collapsed by default behind `Xem lý do`.
- Direct shortcuts: replace exercise, warm-up, plate calculator and add set.
- Reorder, remove, add exercise and note editing live under `Chi tiết & chỉnh sửa`.
- Timer remains operable without shifting the active set controls out of context.

### Recap

- Preserve the three immutable coaching questions:
  1. What went well?
  2. What needs attention?
  3. What changes next time?
- Show the single most important next action first.
- PRs receive a distinct highlight treatment.
- Duration, set count and volume move to a compact secondary summary.
- Avoid nested card stacks; use clear list sections.

## Responsive requirements

- Mobile reference viewport: 390 × 844.
- Must remain usable at 360 × 800 and 430 × 932.
- Desktop remains a centered compact product shell; no stretched data-dashboard treatment.
- No horizontal overflow.
- Safe-area insets remain supported.
- Real mobile numeric keyboard must not obscure the focused field or primary set action.

## Accessibility

- WCAG AA contrast for normal text.
- 44 × 44 px minimum primary touch targets.
- Visible focus state.
- Semantic labels for icon-only controls.
- Disclosures communicate expanded state.
- Serious and critical axe findings are release-blocking.

## Acceptance criteria

- Returning user can start a planned workout in at most two primary actions.
- Active set controls and complete-set CTA appear above the fold at 390 × 844.
- Advanced workout controls are collapsed by default.
- Readiness defaults to the prepared workout duration.
- All existing domain, migration, component, browser, accessibility, PWA and offline gates remain green.
- New component tests cover fast readiness and collapsed workout disclosures.
- New browser assertions cover above-the-fold set logging at 390 × 844.
- No production behavior is introduced outside the approved core-funnel scope.
