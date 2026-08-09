import { useMemo, useState } from "react";
import type { ExerciseMetadata } from "../../domain/exercises/exercise.js";
import type { ProgramProposal } from "../../domain/programming/prescription.js";
import type { TrainingProfileDraft } from "../../domain/programming/profile.js";
import type { PrimaryGoal, TrainingLevel } from "../../domain/programming/goals.js";
import type { SpecializationId } from "../../domain/programming/specializations.js";
import type { TrainingDaysPerWeek, SessionMinutes } from "../../domain/programming/constraints.js";
import { buildProgramPreview } from "../../application/programs/build-program-preview.js";
import { proposeStructures } from "../../application/programs/propose-structures.js";
import { GoalStep } from "./GoalStep.js";
import { SpecializationStep } from "./SpecializationStep.js";
import {
  ConstraintsStep,
  equipmentForPreset,
  type EquipmentPresetId,
} from "./ConstraintsStep.js";
import { StructureStep } from "./StructureStep.js";
import { ProgramPreviewStep } from "./ProgramPreviewStep.js";
import "./onboarding.css";

type OnboardingStep = "level" | "goal" | "specialization" | "constraints" | "structure" | "preview";

export interface OnboardingFlowProps {
  catalog: ExerciseMetadata[];
  onActivate(proposal: ProgramProposal, profile: TrainingProfileDraft): Promise<void>;
}

const LEVELS = [
  { value: "beginner", label: "Beginner", detail: "Build skill, consistency, and recoverable training volume." },
  { value: "intermediate", label: "Intermediate", detail: "Use more weekly workload and exercise-specific progression." },
] as const satisfies readonly { value: TrainingLevel; label: string; detail: string }[];

export function OnboardingFlow({ catalog, onActivate }: OnboardingFlowProps) {
  const [step, setStep] = useState<OnboardingStep>("level");
  const [level, setLevel] = useState<TrainingLevel>();
  const [goal, setGoal] = useState<PrimaryGoal>();
  const [specialization, setSpecialization] = useState<SpecializationId>();
  const [daysPerWeek, setDaysPerWeek] = useState<TrainingDaysPerWeek>();
  const [sessionMinutes, setSessionMinutes] = useState<SessionMinutes>();
  const [equipmentPresetId, setEquipmentPresetId] = useState<EquipmentPresetId>();
  const [structureId, setStructureId] = useState<string>();
  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState<string>();

  const draft = useMemo<TrainingProfileDraft | undefined>(() => {
    const equipment = equipmentForPreset(equipmentPresetId);
    if (!level || !goal || !specialization || !daysPerWeek || !sessionMinutes || !equipment) {
      return undefined;
    }
    return {
      level,
      goal,
      primarySpecialization: specialization,
      constraints: {
        daysPerWeek,
        sessionMinutes,
        equipment,
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
              <button
                type="button"
                className="v5-onboarding-choice"
                key={choice.value}
                aria-label={choice.label}
                onClick={() => {
                  setLevel(choice.value);
                  setStep("goal");
                }}
              >
                <strong>{choice.label}</strong>
                <span>{choice.detail}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "goal" && (
        <GoalStep
          onChoose={(value) => {
            setGoal(value);
            setSpecialization(undefined);
            setStep("specialization");
          }}
          onBack={() => setStep("level")}
        />
      )}

      {step === "specialization" && goal && (
        <SpecializationStep
          goal={goal}
          onChoose={(value) => {
            setSpecialization(value);
            setStep("constraints");
          }}
          onBack={() => setStep("goal")}
        />
      )}

      {step === "constraints" && (
        <ConstraintsStep
          daysPerWeek={daysPerWeek}
          sessionMinutes={sessionMinutes}
          equipmentPresetId={equipmentPresetId}
          canContinue={draft !== undefined}
          onDays={setDaysPerWeek}
          onMinutes={setSessionMinutes}
          onEquipment={setEquipmentPresetId}
          onBack={() => setStep("specialization")}
          onContinue={() => {
            setStructureId(undefined);
            setStep("structure");
          }}
        />
      )}

      {step === "structure" && draft && (
        <StructureStep
          proposals={structures}
          onChoose={(id) => {
            setStructureId(id);
            setStep("preview");
          }}
          onBack={() => setStep("constraints")}
        />
      )}

      {step === "preview" && draft && preview && (
        <ProgramPreviewStep
          draft={draft}
          preview={preview}
          structures={structures}
          catalog={catalog}
          activating={activating}
          activationError={activationError}
          onBack={() => setStep("structure")}
          onApprove={() => void approveProgram()}
        />
      )}
    </section>
  );
}
