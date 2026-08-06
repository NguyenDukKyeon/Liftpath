# LiftPath 4.2 Supporting Screens UI/UX Redesign

## Status

Approved for implementation on 2026-08-07.

## Goal

Extend the approved Athletic Precision / Focused Coach design language from the core funnel to every persistent application screen without changing training logic, data semantics, migrations, storage, progression decisions, or PWA behavior.

## Scope

Phase B covers:

- Application shell and navigation
- Hôm nay
- Giáo án
- Nhật ký
- Tiến bộ
- Cài đặt
- Empty, warning, dialog, form, selected, hover, focus and responsive states used by those screens

Phase B does not change:

- Onboarding, readiness, active workout or recap behavior
- Schema v4, migration or storage keys
- Plan builder, readiness rules or progression rules
- Existing history snapshots and backup format
- Notification, sync, timer or PWA business logic
- Visible feature inventory or navigation labels

## Visual direction

Athletic Precision remains the canonical direction:

- Charcoal and near-black dark surfaces
- Electric lime primary actions and selected states
- Compact, high-contrast typography
- Thin structural borders instead of soft light-theme shadows
- Strong action hierarchy with restrained decoration
- Existing Lucide icon family retained
- Desktop uses a compact command-center shell rather than a stretched dashboard
- Mobile uses a bottom navigation bar and single-column content

The existing theme preference remains functional. Dark mode is the canonical concept. Light mode becomes a high-contrast Athletic Precision companion using white/near-white surfaces, charcoal text and the same lime action hierarchy; it must not retain the old sage-green visual language.

## Application shell

### Desktop

- Fixed left rail with brand, five destinations and theme control
- Active destination uses lime text, dark selected surface and a clear left/inner accent
- Main frame uses a dark canvas and a centered content region with a maximum readable width
- Header is compact; page title and supporting metadata remain visible without consuming a hero-sized block

### Mobile

- Compact brand/header
- Bottom navigation remains persistent and respects safe-area insets
- Active destination has a lime filled icon treatment without shrinking touch targets
- All navigation targets remain at least 44 by 44 CSS pixels

## Hôm nay

Priority order:

1. Next workout and primary start action
2. Weekly progress and coaching signal
3. Program shortcut
4. Upcoming exercises
5. Recent session
6. Backup/deload warnings only when relevant

Design requirements:

- Next-workout hero uses the strongest contrast and one obvious CTA
- Weekly metrics are compact and scan-friendly
- Program frequency control becomes secondary to starting the workout
- Upcoming exercises use structured rows, not nested cards
- Backup warning remains readable but does not dominate the page

## Giáo án

- Program choices become a compact selection rail/grid with clear active state
- Selected program overview and start action form the main focal region
- Workout-day tabs remain horizontally scrollable on mobile
- Exercise list uses dense structured rows with muscle and prescription metadata
- Custom-program creation/edit/delete actions remain available but visually secondary
- Editors and dialogs inherit the Athletic Precision modal and form system

## Nhật ký

- Summary metrics remain first
- Session history becomes a readable timeline/list with date, program, workout, volume and effort hierarchy
- Exercise details remain collapsible
- Destructive deletion is visually separated and never competes with review actions
- Empty state uses the same shell and dark/light token system

## Tiến bộ

- Weekly review and completion score form the first visual region
- Progression recommendation is the primary analytical card
- Volume-by-muscle uses clean bars with lime progress and legible labels
- Plateau warning remains semantic and does not diagnose
- Body-weight entry remains a compact real form with accessible labels and touch targets

## Cài đặt

- Settings are grouped by purpose with clear section titles and compact explanatory text
- Theme, reminders, backup, sync and destructive data controls remain separate
- Toggle, day picker, inputs, selects and buttons share one consistent control language
- Backup and sync status is visible but not visually louder than the actions
- Destructive reset remains isolated in a danger region

## Responsive behavior

Required viewports:

- 360 × 800
- 390 × 844
- 430 × 932
- 768 × 1024
- 1440 × 900

Requirements:

- No horizontal overflow
- No clipped text or controls
- Main actions remain visible and reachable
- Desktop grids collapse to one column on mobile
- Program and workout tabs may scroll horizontally, but the page itself may not
- Safe-area insets are respected

## Accessibility

- No serious or critical axe violations
- Text contrast meets WCAG AA for normal text
- Interactive targets are at least 44 by 44 CSS pixels where practical and always for primary/navigation controls
- Keyboard focus remains visible
- Selected states are not color-only
- Reduced-motion preference is respected

## Testing and acceptance

- Existing 65 domain/migration/safety tests remain green
- Existing core-funnel component tests remain green
- New supporting-shell behavior tests pass
- Existing critical E2E, accessibility and PWA suites remain green
- New supporting-screen visual and accessibility matrix passes on mobile and desktop
- Exact-head screenshots are compared against the approved Athletic Precision concept
- No business-logic or persisted-data behavior changes are introduced
