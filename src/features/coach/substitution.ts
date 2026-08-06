import { explainReason } from "./explanations.js";
import type {
  CoachDecision,
  SubstitutionInput,
} from "./contracts.js";
import type {
  EquipmentId,
  Exercise,
  MovementPattern,
  StructuredRestriction,
  TrackingMode,
} from "../../types.js";

const trackingFamily = (mode: TrackingMode | undefined) => {
  if (mode === "duration" || mode === "distance") return "metric";
  if (mode === "bodyweight-reps" || mode === "assisted-reps" || mode === "weighted-bodyweight-reps") {
    return "bodyweight";
  }
  return "load";
};

export const isExerciseAvailable = (exercise: Exercise | undefined, equipment: EquipmentId[]) => {
  if (!exercise) return false;
  const available = new Set(equipment);
  if (exercise.equipmentTags.includes("bodyweight")) return available.has("bodyweight");
  if (exercise.equipmentTags.includes("rack") && exercise.equipmentTags.includes("barbell")) {
    return available.has("rack") && available.has("barbell");
  }
  if (exercise.equipmentTags.includes("bench")) {
    const loadTags = exercise.equipmentTags.filter((tag) => tag !== "bench");
    if (!available.has("bench")) return false;
    return loadTags.length === 0 || loadTags.some((tag) => available.has(tag));
  }
  return exercise.equipmentTags.some((tag) => available.has(tag));
};

const restrictedPatterns = (restrictions: StructuredRestriction[]) => new Set(
  restrictions.flatMap((restriction) => restriction.affectedPatterns),
);

const isPatternRestricted = (
  pattern: MovementPattern | undefined,
  restrictions: StructuredRestriction[],
) => Boolean(pattern && restrictedPatterns(restrictions).has(pattern));

const candidateScore = (
  original: Exercise,
  candidate: Exercise,
  explicitAlternatives: Set<string>,
) => {
  let score = 0;
  if (candidate.movementPattern && candidate.movementPattern === original.movementPattern) score += 100;
  if (candidate.primary === original.primary) score += 50;
  if (explicitAlternatives.has(candidate.id)) score += 30;
  if (trackingFamily(candidate.trackingMode) === trackingFamily(original.trackingMode)) score += 10;
  return score;
};

export const findSafeSubstitution = ({
  exerciseId,
  equipment,
  restrictions,
  exercises,
}: SubstitutionInput): CoachDecision<Exercise | null> => {
  const original = exercises[exerciseId];
  if (!original) {
    return {
      value: null,
      reasonCode: "insufficient-evidence",
      explanation: explainReason("insufficient-evidence"),
      confidence: "low",
      evidence: [{ key: "exerciseId", value: exerciseId }],
    };
  }

  if (isPatternRestricted(original.movementPattern, restrictions)) {
    return {
      value: null,
      reasonCode: "pain-blocks-movement",
      explanation: explainReason("pain-blocks-movement"),
      confidence: "high",
      evidence: [
        { key: "exerciseId", value: exerciseId },
        { key: "movementPattern", value: original.movementPattern ?? "unknown" },
      ],
    };
  }

  if (isExerciseAvailable(original, equipment)) {
    return {
      value: original,
      reasonCode: "plan-equipment-safe",
      explanation: explainReason("plan-equipment-safe"),
      confidence: "high",
      evidence: [{ key: "exerciseId", value: exerciseId }],
    };
  }

  const explicitAlternatives = new Set(original.alternatives);
  const ranked = Object.values(exercises)
    .filter((candidate) => candidate.id !== original.id)
    .filter((candidate) => isExerciseAvailable(candidate, equipment))
    .filter((candidate) => !isPatternRestricted(candidate.movementPattern, restrictions))
    .map((candidate) => ({
      candidate,
      score: candidateScore(original, candidate, explicitAlternatives),
    }))
    .filter(({ score }) => score >= 50)
    .sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name));

  const replacement = ranked[0]?.candidate ?? null;
  return {
    value: replacement,
    reasonCode: replacement ? "equipment-safe-substitution" : "equipment-prescription-removed",
    explanation: explainReason(replacement ? "equipment-safe-substitution" : "equipment-prescription-removed"),
    confidence: replacement ? "high" : "medium",
    evidence: [
      { key: "exerciseId", value: exerciseId },
      { key: "availableEquipmentCount", value: equipment.length },
      { key: "candidateCount", value: ranked.length },
    ],
  };
};
