# LiftPath 3.0

LiftPath is a Vietnamese, local-first workout tracker and personal progression coach.

## Core capabilities

- Built-in Full Body 3-day, Upper/Lower 4-day and PPL 6-day programs.
- Personalized onboarding and equipment-aware substitutions.
- Smart workout logging with previous values, set types, RPE and rest timer.
- Rule-based progressive overload recommendations with explanations.
- PR detection, weekly review, muscle-volume estimates and deload signals.
- Custom exercises and editable custom programs.
- Schema migration, JSON backup/restore and CSV export.
- Optional remote JSON endpoint sync.
- Responsive light/dark PWA.

## Commands

```bash
npm ci
npm run check
npm run dev
```

`npm run check` runs TypeScript validation, domain tests and a production build.

See [RELEASE_3.md](./RELEASE_3.md) and [docs/SYNC_ENDPOINT.md](./docs/SYNC_ENDPOINT.md).
