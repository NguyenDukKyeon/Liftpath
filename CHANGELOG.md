# Changelog

## 4.0.0 — Guided Coach Foundation

### Added

- Schema v4 contracts for tracking modes, prescription snapshots, logged effort and migration warnings.
- Four-step Guided Coach onboarding with deterministic plan recommendation evidence.
- Equipment- and restriction-aware substitution decisions.
- Pre-workout readiness preview for time, energy, soreness and pain concerns.
- Tracking-aware set table with inline previous corresponding values and optional effort.
- Quick load controls, warm-up calculation and exact/nearest plate loading guidance.
- Strategy-specific progression for double progression, linear load, reps and duration.
- Interruption, pain and repeated-failure guards before automatic load changes.
- Live draft editing and explicit preferred/avoid exercise signals.
- Immutable three-question post-workout recap with per-exercise next-time decisions.
- Vitest component coverage and Playwright mobile browser, migration, safety and accessibility gates.

### Changed

- Version metadata is now consistently LiftPath 4.0.
- Active workout hierarchy focuses on the current exercise, coach decision, inline set entry, technique cue and timer.
- A 35-minute shortened session removes optional/accessory work first, then later secondary work while preserving primary movements.
- Production deployment now depends on fast validation and Chromium browser gates.

### Migration

- Existing v3 state is migrated through the pure v3-to-v4 migration path.
- History, active draft, body stats, custom exercises and custom programs are retained when records are valid.
- Malformed records are isolated with migration warnings instead of resetting the entire user state.
- Readiness, preferences and generated recap evidence are persisted as snapshots.

### Safety and non-goals

- LiftPath does not diagnose injury or replace medical advice.
- Coaching is deterministic; version 4.0 does not provide remote AI-generated decisions.
- Account-based cloud sync, social features and coach dashboards are not included.
- Optional generic JSON endpoint sync remains a user-configured data transport, not an account service.
- Physical-device installability, offline reload and Wake Lock behavior require the separate manual review checklist before release approval.
