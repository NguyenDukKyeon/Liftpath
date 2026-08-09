import type { ExerciseMetadata } from "../../domain/exercises/exercise.js";
import type { ProgramProposal } from "../../domain/programming/prescription.js";
import type { TrainingProfileDraft } from "../../domain/programming/profile.js";
import type { StructureProposal } from "../../domain/programming/structure-proposals.js";

interface ProgramPreviewStepProps {
  draft: TrainingProfileDraft;
  preview: ProgramProposal;
  structures: StructureProposal[];
  catalog: ExerciseMetadata[];
  activating: boolean;
  activationError?: string;
  onBack(): void;
  onApprove(): void;
}

export function ProgramPreviewStep({
  draft,
  preview,
  structures,
  catalog,
  activating,
  activationError,
  onBack,
  onApprove,
}: ProgramPreviewStepProps) {
  return (
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
        <button type="button" className="v5-onboarding-back" disabled={activating} onClick={onBack}>Back</button>
        <button type="button" disabled={activating} onClick={onApprove}>
          {activating ? "Activating…" : "Start this program"}
        </button>
      </div>
    </div>
  );
}
