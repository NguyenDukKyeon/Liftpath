# LiftPath 4.0 — Guided Progression Coach

LiftPath is a Vietnamese, local-first workout tracker with deterministic coaching rules. Version 4.0 guides a beginner from onboarding through readiness, set logging, progression decisions and an explainable post-workout recap.

## LiftPath 4.0 capabilities

- Four-step onboarding with schedule, equipment, restriction and experience calibration.
- Equipment-safe plan recommendations and substitutions with visible explanations.
- Pre-workout readiness adjustment for available time, energy, soreness and pain concerns.
- Tracking-aware set logging for load/reps, bodyweight, assistance, duration and distance.
- Previous corresponding set values displayed and copyable inline.
- Optional effort input: a valid set can be completed without entering RPE or RIR.
- Rule-based double, linear-load, rep and duration progression with confidence and evidence.
- Warm-up and plate-loading calculators that do not invent unavailable loads.
- Live workout editing with explicit, opt-in exercise preferences.
- Three-question coaching recap: what went well, what needs attention and what changes next.
- Schema v4 migration, local persistence, JSON backup/restore and CSV export.
- Responsive light/dark PWA with optional remote JSON endpoint sync.

## Quality commands

```bash
npm ci
npm run check:fast
npx playwright install chromium
npm run test:e2e
npm run test:a11y
npm run dev
```

`npm run check:fast` runs TypeScript validation, domain tests, React component tests and a production build. `npm run check` adds the critical Playwright browser flows. Accessibility and responsive assertions run separately through `npm run test:a11y`.

## Safety and privacy boundaries

LiftPath does not diagnose injuries, prescribe medical treatment or generate coaching through a remote AI service. Coaching is deterministic and stored locally. Pain-related warnings block or review affected movements rather than claiming a diagnosis. Remote sync remains optional and user-configured.

See [CHANGELOG.md](./CHANGELOG.md), [the LiftPath 4.0 manual review checklist](./docs/releases/4.0-manual-review.md) and [docs/SYNC_ENDPOINT.md](./docs/SYNC_ENDPOINT.md).
