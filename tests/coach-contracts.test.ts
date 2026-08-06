import test from "node:test";
import assert from "node:assert/strict";
import { normalizeState } from "../src/domain/storage.js";
import { explainReason } from "../src/features/coach/explanations.js";
import type {
  CoachDecision,
  PlanBuilderInput,
  ReadinessAdjustment,
  ReadinessInput,
} from "../src/features/coach/contracts.js";

const decision: CoachDecision<number> = {
  value: 3,
  reasonCode: "schedule-prefers-three-days",
  explanation: explainReason("schedule-prefers-three-days"),
  confidence: "high",
  evidence: [{ key: "availableDays", value: 3 }],
};

const planInput: PlanBuilderInput = {
  goal: "hypertrophy",
  experience: "beginner",
  availableDays: 3,
  sessionMinutes: 60,
  equipment: ["dumbbell", "bodyweight", "bench"],
  preferredDays: [1, 3, 5],
  priorityMuscles: [],
  restrictions: [],
  effortLanguage: "simple-rir",
  movementFamiliarity: "new",
  consistencyWeeks: 0,
  recentLoads: {},
};

const readiness: ReadinessInput = {
  energy: "normal",
  soreness: "manageable",
  pain: null,
  availableMinutes: 60,
};

const adjustment: ReadinessAdjustment = {
  prescriptions: [],
  removedPrescriptionIds: [],
  blockedPrescriptionIds: [],
  changedSetCounts: [],
  changedEffortPrescriptionIds: [],
  substitutions: [],
  allowStart: true,
  appliedReasonCodes: [],
};

test("coach decisions expose stable machine and human explanations", () => {
  assert.equal(decision.reasonCode, "schedule-prefers-three-days");
  assert.match(decision.explanation, /3 buổi/);
  assert.equal(planInput.equipment.length, 3);
  assert.equal(readiness.availableMinutes, 60);
  assert.equal(adjustment.allowStart, true);
});

test("every public reason code resolves to non-empty Vietnamese copy", () => {
  const codes = [
    "schedule-prefers-three-days",
    "schedule-prefers-four-days",
    "equipment-safe-substitution",
    "equipment-prescription-removed",
    "session-time-shortened",
    "readiness-low-energy",
    "readiness-high-soreness",
    "readiness-effort-reduced",
    "pain-blocks-movement",
    "insufficient-evidence",
    "safe-default-plan",
  ] as const;
  for (const code of codes) {
    assert.ok(explainReason(code).trim().length > 20, code);
  }
});

test("legacy profile notes are preserved in structured coach fields", () => {
  const state = normalizeState({
    schemaVersion: 3,
    profile: {
      onboardingComplete: true,
      goal: "hypertrophy",
      experience: "beginner",
      availableDays: 3,
      sessionMinutes: 60,
      equipment: ["bodyweight", "dumbbell"],
      priorityMuscles: [],
      limitations: "Đau vai khi đẩy qua đầu",
    },
  });
  assert.equal(state.profile.profileNotes, "Đau vai khi đẩy qua đầu");
  assert.deepEqual(state.profile.restrictions, []);
  assert.equal(state.profile.effortLanguage, "simple-rir");
});
