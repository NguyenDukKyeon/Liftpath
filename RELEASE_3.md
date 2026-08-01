# LiftPath 3.0 — implementation scope

## 2.1 Reliability

- Schema v3 with deep normalization and migration from `liftpath-personal-v2` and `liftpath-min-v1`.
- Per-program cycle start and progression settings.
- Confirmed program switching with keep-schedule/reset-cycle choices.
- Program, workout and exercise metadata snapshots inside every new session.
- JSON backup/restore, CSV export and destructive reset confirmation.
- Error boundary and domain tests.
- Historical streaks use each session's goal snapshot instead of the current goal.

## 2.2 Smarter logging

- Previous workout values inside the active exercise.
- Automatic load prefilling based on the progression recommendation.
- Warm-up, working and drop-set types.
- Copy previous set, undo completed set and editable notes.
- Exercise substitution for the current workout.
- Wake Lock support when available.
- Post-workout feedback, recap and PR detection.

## 2.3 Progression coach

- Transparent double-progression rules using rep range and RPE.
- Weight/rep/volume/estimated-1RM PR detection.
- Weekly review, adherence, volume change and RPE signals.
- Per-muscle working-set estimates with half credit for secondary muscles.
- Plateau signal from recent exercise performance.
- Data-driven deload suggestion; no silent automatic set reduction.

## 2.4 Personalization

- Onboarding for goal, experience, available days, session duration, equipment, priority muscles and limitations.
- Program recommendation based on sustainable weekly availability.
- Equipment-aware exercise fallback.
- Custom exercises.
- Custom program copies with editable days, exercise order, add/remove controls.

## 3.0 Optional sync

- Local-first remains the default.
- Optional HTTPS JSON endpoint with bearer-token support.
- Explicit Push and Pull to prevent silent conflicts.
- Endpoint contract documented in `docs/SYNC_ENDPOINT.md`.

## Deliberate limits

- No hosted account backend is bundled with the static app.
- Browser background timers and reminders cannot be guaranteed when the OS suspends the PWA.
- Progression suggestions are training heuristics, not medical advice.
