# Guided Coach 04 — Quality and Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove LiftPath 4.0 Guided Coach works across domain, component, browser, accessibility, migration, and release boundaries without silently weakening safety or data guarantees.

**Architecture:** Fast domain/component checks run before browser gates. Playwright covers critical user paths at 360, 390, and 430 px. axe verifies serious/critical accessibility findings. Physical-device and PWA behavior remains a separate manual release decision.

**Tech Stack:** React 19, TypeScript 5.8, Vite 8, Node 22, node:test, Vitest, Testing Library, Playwright Chromium, axe-core.

## Global Constraints

- Requires completion of plans 01–03.
- Green CI is necessary but not sufficient for release acceptance.
- Do not mark physical-device, installability, offline reload, Wake Lock, vibration, or notification behavior complete from headless tests.
- PR remains draft and unmerged until manual review is recorded.

---

## Automated Checkpoint D evidence

- [x] Exact verified branch head: `94abd42c250f3a2a819d996317142e5ab24c80aa`.
- [x] GitHub Actions run `31023304644` completed successfully.
- [x] `git diff --check main...HEAD` passed.
- [x] TypeScript validation passed.
- [x] 65/65 focused domain, migration, safety, progression and persistence tests passed.
- [x] 4/4 core React component behavior tests passed.
- [x] Production build passed.
- [x] 15/15 critical Playwright flows passed across 360, 390 and 430 px Chromium projects.
- [x] 12/12 axe/responsive assertions passed across onboarding, readiness, workout and recap.
- [x] No serious or critical axe violation remained in the tested screens.
- [x] No horizontal overflow remained in the tested mobile viewports.
- [x] Primary actions tested at a minimum 44 × 44 px touch target.
- [x] A focused set field remained visible with viewport-edge spacing.
- [x] v3 history and active-draft migration completed through a browser flow without resetting valid records.
- [x] Version metadata is consistently LiftPath 4.0 in package, README, HTML and manifest.
- [x] Deployment job was skipped for the draft pull request.

## Remaining manual release review

- [ ] iOS Safari or iOS simulator review.
- [ ] Android Chrome physical-device review.
- [ ] Desktop Chrome/Edge visual review.
- [ ] Production HTTPS PWA installation and standalone launch.
- [ ] Offline reload and existing local-history availability.
- [ ] Service-worker update behavior after a new deployment.
- [ ] Real-device numeric keyboard and browser-chrome overlap.
- [ ] Real-device Wake Lock success/failure behavior.
- [ ] Notification and vibration permission denial behavior.
- [ ] Independent product-owner review of `docs/releases/4.0-manual-review.md`.
- [ ] Move PR out of draft only after the manual checklist is recorded.

## Final Verification Matrix

| Requirement | Evidence | Status |
|---|---|---|
| At least 40 focused domain tests | Node test output: 65 passed | Automated pass |
| Four core component behaviors | Vitest output: 4 passed | Automated pass |
| Five critical user flows | Five flows × three viewports: 15 passed | Automated pass |
| Accessibility | axe serious/critical count = 0 on tested screens | Automated pass |
| 360/390/430 responsiveness | Playwright project results and overflow assertions | Automated pass |
| v3 data preservation | Migration unit tests + active-draft browser flow | Automated pass |
| Complete build | `npm run build` exit 0 | Automated pass |
| Exact release version | package, UI, manifest and README use 4.0 | Automated pass |
| Diff integrity | `git diff --check` exit 0 | Automated pass |
| Physical-device/PWA behavior | Manual checklist | Pending |
| No automatic merge | PR remains draft and unmerged | Preserved |
