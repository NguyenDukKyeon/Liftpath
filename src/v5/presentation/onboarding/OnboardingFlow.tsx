import { useMemo, useState } from "react";
import type { ExerciseMetadata } from "../../domain/exercises/exercise.js";
import type { ProgramProposal } from "../../domain/programming/prescription.js";
import type { TrainingProfileDraft } from "../../domain/programming/profile.js";
import type { PrimaryGoal, TrainingLevel } from "../../domain/programming/goals.js";
import type { SpecializationId } from "../../domain/programming/specializations.js";
import type { TrainingDaysPerWeek, SessionMinutes } from "../../domain/programming/constraints.js";
import type { StructureProposal } from "../../domain/programming/structure-proposals.js";
import { buildProgramPreview } from "../../application/programs/build-program-preview.js";
import { proposeStructures } from "../../application/programs/propose-structures.js";
import "./onboarding.css";

type OnboardingStep = "level" | "goal" | "specialization" | "constraints" | "structure" | "preview";

export interface OnboardingFlowProps {
  catalog: ExerciseMetadata[];
  onActivate(proposal: ProgramProposal, profile: TrainingProfileDraft): Promise<void>;
}

interface Choice<T extends string> {
  value: T;
  label: string;
  detail: string;
}

const LEVELS: readonly Choice<TrainingLevel>[] = [
  { value: "beginner", label: "Beginner", detail: "Build skill, consistency, and recoverable training volume." },
  { value: "intermediate", label: "Intermediate", detail: "Use more weekly workload and exercise-specific progression." },
];

const GOALS: readonly Choice<PrimaryGoal>[] = [
  { value: "hypertrophy", label: "Build muscle", detail: "Prioritize muscle growth with controlled effort and repeatable progression." },
  { value: "strength", label: "Get stronger", detail: "Prioritize strength practice while keeping balanced supporting work." },
  { value: "general_fitness", label: "General fitness", detail: "Build broad strength and training capacity without a single performance target." },
];

const SPECIALIZATIONS: Record<PrimaryGoal, readonly Choice<SpecializationId>[]> = {
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

const DAY_OPTIONS: readonly TrainingDaysPerWeek[] = [2, 3, 4, 5, 6];
const MINUTE_OPTIONS: readonly SessionMinutes[] = [30, 45, 60, 75, 90];

const EQUIPMENT_PRESETS = [
  {
    id: "commercial",
    label: "Commercial gym",
    detail: "Barbell, rack, bench, dumbbells, cables, and machines.",
    equipment: ["barbell", "rack", "bench", "dumbbell", "cable", "machine"],
  },
  {
    id: "machines",
    label: "Machines + cable",
    detail: "Stable machine and cable options with no barbell requirement.",
    equipment: ["machine", "cable"],
  },
  {
    id: "free-weights",
    label: "Free weights",
    detail: "Barbell, rack, bench, and dumbbells.",
    equipment: ["barbell", "rack", "bench", "dumbbell"],
  },
] as const;

function ChoiceButton<T extends string>({
  choice,
  selected,
  onChoose,
}: {
  choice: Choice<T>;
  selected?: boolean;
  onChoose(value: T): void;
}) {
  return (
    <button
      type="button"
      className="v5-onboarding-choice"
      aria-pressed={selected}
      onClick={() => onChoose(choice.value)}
    >
      <strong>{choice.label}</strong>
      <span>{choice.detail}</span>
    </button>
  );
}

function StructureCard({ proposal, onChoose }: { proposal: StructureProposal; onChoose(id: string): void }) {
  return (
    <article className="v5-structure-card">
      <div>
        <p className="v5-onboarding-eyebrow">{proposal.daysPerWeek} days · score {proposal.score}</p>
        <h3>{proposal.name}</h3>
        <p>{proposal.rationale}</p>
      </div>
      <ul>
        {proposal.tradeoffs.map((tradeoff) => <li key={tradeoff}>{tradeoff}</li>)}
      </ul>
      <button type="button" onClick={() => onChoose(proposal.id)}>
        Choose {proposal.name}
      </button>
    </article>
  );
}

export function OnboardingFlow({ catalog, onActivate }: OnboardingFlowProps) {
  const [step, setStep] = useState<OnboardingStep>("level");
  const [level, setLevel] = useState<TrainingLevel>();
  const [goal, setGoal] = useState<PrimaryGoal>();
  const [specialization, setSpecialization] = useState<SpecializationId>();
  const [daysPerWeek, setDaysPerWeek] = useState<TrainingDaysPerWeek>();
  const [sessionMinutes, setSessionMinutes] = useState<SessionMinutes>();
  const [equipmentPresetId, setEquipmentPresetId] = useState<string>();
  const [structureId, setStructureId] = useState<string>();
  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState<string>();

  const draft = useMemo<TrainingProfileDraft | undefined>(() => {
    const preset = EQUIPMENT_PRESETS.find((candidate) => candidate.id === equipmentPresetId);
    if (!level || !goal || !specialization || !daysPerWeek || !sessionMinutes || !preset) return undefined;
    return {
      level,
      goal,
      primarySpecialization: specialization,
      constraints: {
        daysPerWeek,
        sessionMinutes,
        equipment: [...preset.equipment],
        dislikedExerciseIds: [],
        restrictedMovementPatterns: [],
      },
    };
  }, [daysPerWeek, equipmentPresetId, goal, level, sessionMinutes, specialization]);

  const structures = useMemo(() => (draft ? proposeStructures(draft) : []), [draft]);
  const preview = useMemo(
    () => (draft && structureId ? buildProgramPreview(draft, structureId, { catalog }) : undefined),
    [catalog, draft, structureId],
  );

  function chooseLevel(value: TrainingLevel): void {
    setLevel(value);
    setStep("goal");
  }

  function chooseGoal(value: PrimaryGoal): void {
    setGoal(value);
    setSpecialization(undefined);
    setStep("specialization");
  }

  function chooseSpecialization(value: SpecializationId): void {
    setSpecialization(value);
    setStep("constraints");
  }

  async function approveProgram(): Promise<void> {
    if (!preview || !draft || activating) return;
    setActivating(true);
    setActivationError(undefined);
    try {
      await onActivate(preview, draft);
    } catch (error: unknown) {
      setActivationError(error instanceof Error ? error.message : "Program activation failed");
    } finally {
      setActivating(false);
    }
  }

  return (
    <section className="v5-onboarding" aria-label="LiftPath 5 onboarding">
      <header className="v5-onboarding-header">
        <p className="v5-onboarding-eyebrow">PERSONAL COACH SETUP</p>
        <p>Goal → specialization → constraints → structure → program approval</p>
      </header>

      {step === "level" && (
        <div className="v5-onboarding-step">
          <h2>What is your training level?</h2>
          <p>Choose the level that best matches your current training experience.</p>
          <div className="v5-choice-grid">
            {LEVELS.map((choice) => (
              <ChoiceButton key={choice.value} choice={choice} onChoose={chooseLevel} />
            ))}
          </div>
        </div>
      )}

      {step === "goal" && (
        <div className="v5-onboarding-step">
          <h2>What is your main goal?</h2>
          <p>The main goal controls the overall prescription. Specialization comes next.</p>
          <div className="v5-choice-grid">
            {GOALS.map((choice) => (
              <ChoiceButton key={choice.value} choice={choice} onChoose={chooseGoal} />
            ))}
          </div>
          <button type="button" className="v5-onboarding-back" onClick={() => setStep("level")}>Back</button>
        </div>
      )}

      {step === "specialization" && goal && (
        <div className="v5-onboarding-step">
          <h2>Choose one specialization</h2>
          <p>One priority focus reshapes workload allocation without replacing balanced whole-body training.</p>
          <div className="v5-choice-grid">
            {SPECIALIZATIONS[goal].map((choice) => (
              <ChoiceButton key={choice.value} choice={choice} onChoose={chooseSpecialization} />
            ))}
          </div>
          <button type="button" className="v5-onboarding-back" onClick={() => setStep("goal")}>Back</button>
        </div>
      )}

      {step === "constraints" && (
        <div className="v5-onboarding-step">
          <h2>Set your training constraints</h2>
          <p>The Coach must fit the program inside the schedule and equipment you actually have.</p>

          <fieldset>
            <legend>Training days</legend>
            <div className="v5-inline-choices">
              {DAY_OPTIONS.map((day) => (
                <button
                  type="button"
                  key={day}
                  aria-pressed={daysPerWeek === day}
                  onClick={() => setDaysPerWeek(day)}
                >
                  {day} days
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Session duration</legend>
            <div className="v5-inline-choices">
              {MINUTE_OPTIONS.map((minutes) => (
                <button
                  type="button"
                  key={minutes}
                  aria-pressed={sessionMinutes === minutes}
                  onClick={() => setSessionMinutes(minutes)}
                >
                  {minutes} min
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Equipment</legend>
            <div className="v5-choice-grid">
              {EQUIPMENT_PRESETS.map((preset) => (
                <button
                  type="button"
                  className="v5-onboarding-choice"
                  key={preset.id}
                  aria-pressed={equipmentPresetId === preset.id}
                  onClick={() => setEquipmentPresetId(preset.id)}
                >
                  <strong>{preset.label}</strong>
                  <span>{preset.detail}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="v5-onboarding-actions">
            <button type="button" className="v5-onboarding-back" onClick={() => setStep("specialization")}>Back</button>
            <button
              type="button"
              disabled={!draft}
              onClick={() => {
                setStructureId(undefined);
                setStep("structure");
              }}
            >
              See structure options
            </button>
          </div>
        </div>
      )}

      {step === "structure" && draft && (
        <div className="v5-onboarding-step">
          <h2>Choose your training structure</h2>
          <p>LiftPath recommends structures that match your exact weekly availability. You own this choice.</p>
          <div className="v5-structure-grid">
            {structures.map((proposal) => (
              <StructureCard
                key={proposal.id}
                proposal={proposal}
                onChoose={(id) => {
                  setStructureId(id);
                  setStep("preview");
                }}
              />
            ))}
          </div>
          <button type="button" className="v5-onboarding-back" onClick={() => setStep("constraints")}>Back</button>
        </div>
      )}

      {step === "preview" && draft && preview && (
        <div className="v5-onboarding-step">
          <h2>Review your program</h2>
          {draft.primarySpecialization === "v_shape" && (
            <p className="v5-specialization-note">
              V-Shape prioritizes lats and lateral delts while maintaining balanced whole-body training.
            </p>
          )}
          <div className="v5-program-summary">
            <div>
              <span>Structure</span>
              <strong>{structures.find((item) => item.id === preview.structureId)?.name ?? preview.structureId}</strong>
            </div>
            <div>
              <span>Policy</span>
              <strong>{preview.policyVersion}</strong>
            </div>
            <div>
              <span>Sessions</span>
              <strong>{preview.sessions.length} / week</strong>
            </div>
          </div>

          <div className="v5-preview-sessions">
            {preview.sessions.map((session) => (
              <article key={session.key}>
                <h3>{session.name}</h3>
                <ol>
                  {session.exercises.map((prescribed) => {
                    const exercise = catalog.find((candidate) => candidate.id === prescribed.exerciseId);
                    return (
                      <li key={prescribed.exerciseId}>
                        <strong>{exercise?.name ?? prescribed.exerciseId}</strong>
                        <span>{prescribed.sets.length} sets · {prescribed.sets[0]?.minReps}–{prescribed.sets[0]?.maxReps} reps</span>
                      </li>
                    );
                  })}
                </ol>
              </article>
            ))}
          </div>

          {activationError && <p role="alert">{activationError}</p>}
          <div className="v5-onboarding-actions">
            <button type="button" className="v5-onboarding-back" disabled={activating} onClick={() => setStep("structure")}>Back</button>
            <button type="button" disabled={activating} onClick={() => void approveProgram()}>
              {activating ? "Activating…" : "Start this program"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
