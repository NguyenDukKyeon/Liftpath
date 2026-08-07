# LiftPath 5 Design Self-Review

Date: 2026-08-07

This review checks the approved design spec for placeholders, contradictions, ambiguity, and scope leakage before implementation planning.

## Findings

1. **Clarify training-data-only scope**
   - Risk: “training data only” could be misread as forbidding readiness inputs such as energy, soreness, or user-reported pain.
   - Resolution: clarify that the restriction applies to physique-specialization progress assessment; readiness and safety inputs remain allowed as training-state signals.

2. **Clarify within-session calibration vs program changes**
   - Risk: a load suggestion during first-exposure calibration could appear to violate “Coach recommends; user approves material program changes.”
   - Resolution: clarify that user-confirmed within-session calibration is an execution aid, not a silent persisted program-version change.

3. **Clarify policy constants**
   - Risk: workload ceilings, rep-range tables, direct/indirect workload coefficients, or similar heuristics could be mistaken for exact universal physiological truths.
   - Resolution: require these values to be explicit, versioned policy constants defined during implementation planning and covered by scenario tests.

4. **No contradiction found in split ownership**
   - Normal Coach adaptation remains constrained to the user-selected training structure; only a user-initiated change-structure flow may propose alternatives.

5. **No contradiction found in clean-slate data strategy**
   - V5 does not migrate V4 data, while V4 storage remains protected and isolated from V5 storage.

6. **No scope leak found into mandatory cloud/AI/social functionality**
   - V5.0 remains local-first with no mandatory account/backend, no generic AI chatbot, and no true cloud sync.

## Result

The design remains internally coherent after the three clarifications above are applied to the canonical spec. No implementation work is authorized by this review.
