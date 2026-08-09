import type { CoachRecommendation, ProgramPatch } from "../../domain/coaching/recommendation";

export interface CoachRecommendationCardProps {
  recommendation: CoachRecommendation;
  onAccept: (id: string) => void | Promise<void>;
  onModify: (id: string) => void | Promise<void>;
  onSkip: (id: string) => void | Promise<void>;
}

function describePatch(patch: ProgramPatch): string {
  switch (patch.kind) {
    case "set_load":
      return `Set ${patch.exerciseId} load to ${patch.loadKg} kg`;
    case "set_target_rir":
      return `Set ${patch.exerciseId} target effort to RIR ${patch.targetRir}`;
    case "set_count":
      return `Set ${patch.exerciseId} to ${patch.sets} working sets`;
    case "move_exercise":
      return `Move ${patch.exerciseId} before ${patch.beforeExerciseId}`;
    case "replace_exercise":
      return `Replace ${patch.exerciseId} with ${patch.replacementExerciseId}`;
    case "reduced_volume_week":
      return `Use ${Math.round(patch.multiplier * 100)}% of normal working-set volume for one reduced-volume week`;
  }
}

export function CoachRecommendationCard({
  recommendation,
  onAccept,
  onModify,
  onSkip,
}: CoachRecommendationCardProps) {
  return (
    <article aria-labelledby={`coach-recommendation-${recommendation.id}`}>
      <header>
        <p>LiftPath Coach</p>
        <h2 id={`coach-recommendation-${recommendation.id}`}>Coach recommendation</h2>
        <p>{recommendation.confidence[0]?.toUpperCase()}{recommendation.confidence.slice(1)} confidence</p>
      </header>

      <section aria-label="Proposed change">
        <h3>Proposed change</h3>
        <p>{describePatch(recommendation.proposedPatch)}</p>
      </section>

      <section aria-label="Why Coach is suggesting this">
        <h3>Why this change</h3>
        <p>{recommendation.expectedIntent}</p>
        <p>{recommendation.evidenceIds.length} training records support this recommendation.</p>
        <p>Reason: {recommendation.reasonCode}</p>
      </section>

      <div aria-label="Recommendation actions">
        <button type="button" onClick={() => void onAccept(recommendation.id)}>Accept</button>
        <button type="button" onClick={() => void onModify(recommendation.id)}>Modify</button>
        <button type="button" onClick={() => void onSkip(recommendation.id)}>Skip</button>
      </div>
    </article>
  );
}
