import type { PrimaryGoal } from "../../domain/programming/goals.js";

interface GoalStepProps {
  onChoose(goal: PrimaryGoal): void;
  onBack(): void;
}

const GOALS = [
  { value: "hypertrophy", label: "Build muscle", detail: "Prioritize muscle growth with controlled effort and repeatable progression." },
  { value: "strength", label: "Get stronger", detail: "Prioritize strength practice while keeping balanced supporting work." },
  { value: "general_fitness", label: "General fitness", detail: "Build broad strength and training capacity without a single performance target." },
] as const satisfies readonly { value: PrimaryGoal; label: string; detail: string }[];

export function GoalStep({ onChoose, onBack }: GoalStepProps) {
  return (
    <div className="v5-onboarding-step">
      <h2>What is your main goal?</h2>
      <p>The main goal controls the overall prescription. Specialization comes next.</p>
      <div className="v5-choice-grid">
        {GOALS.map((choice) => (
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
