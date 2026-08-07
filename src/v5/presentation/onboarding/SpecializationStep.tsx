import type { PrimaryGoal } from "../../domain/programming/goals.js";
import type { SpecializationId } from "../../domain/programming/specializations.js";

interface SpecializationStepProps {
  goal: PrimaryGoal;
  onChoose(specialization: SpecializationId): void;
  onBack(): void;
}

const SPECIALIZATIONS: Record<PrimaryGoal, readonly { value: SpecializationId; label: string; detail: string }[]> = {
  hypertrophy: [
    { value: "v_shape", label: "V-Shape", detail: "Prioritize lats and lateral delts while maintaining balanced whole-body training." },
    { value: "chest", label: "Chest", detail: "Give chest and upper-chest work more weekly priority." },
    { value: "shoulders", label: "Shoulders", detail: "Prioritize lateral and rear-delt work." },
    { value: "arms", label: "Arms", detail: "Prioritize biceps and triceps without dropping compound training." },
    { value: "back_width", label: "Back width", detail: "Prioritize lat-focused vertical pulling." },
    { value: "back_thickness", label: "Back thickness", detail: "Prioritize upper-back and rear-delt rowing work." },
    { value: "quads", label: "Quads", detail: "Prioritize knee-dominant lower-body work." },
    { value: "posterior_chain", label: "Posterior chain", detail: "Prioritize hamstrings and glutes." },
  ],
  strength: [
    { value: "bench", label: "Bench press", detail: "Increase bench-specific exposure and supporting press work." },
    { value: "squat", label: "Squat", detail: "Increase squat-pattern exposure and supporting lower-body work." },
    { value: "deadlift", label: "Deadlift", detail: "Increase hinge strength exposure and posterior-chain support." },
    { value: "overhead_press", label: "Overhead press", detail: "Increase overhead-press exposure and supporting shoulder work." },
  ],
  general_fitness: [
    { value: "v_shape", label: "V-Shape", detail: "Prioritize lats and lateral delts while maintaining balanced whole-body training." },
    { value: "arms", label: "Arms", detail: "Give arm work a modest additional priority." },
    { value: "quads", label: "Quads", detail: "Give knee-dominant training a modest additional priority." },
    { value: "posterior_chain", label: "Posterior chain", detail: "Give hamstrings and glutes a modest additional priority." },
    { value: "bench", label: "Bench press", detail: "Keep broad fitness while emphasizing bench practice." },
    { value: "squat", label: "Squat", detail: "Keep broad fitness while emphasizing squat practice." },
  ],
};

export function SpecializationStep({ goal, onChoose, onBack }: SpecializationStepProps) {
  return (
    <div className="v5-onboarding-step">
      <h2>Choose one specialization</h2>
      <p>One priority focus reshapes workload allocation without replacing balanced whole-body training.</p>
      <div className="v5-choice-grid">
        {SPECIALIZATIONS[goal].map((choice) => (
          <button
            type="button"
            className="v5-onboarding-choice"
            key={choice.value}
            aria-label={choice.label}
            onClick={() => onChoose(choice.value)}
          >
            <strong>{choice.label}</strong>
            <span>{choice.detail}</span>
          </button>
        ))}
      </div>
      <button type="button" className="v5-onboarding-back" onClick={onBack}>Back</button>
    </div>
  );
}
