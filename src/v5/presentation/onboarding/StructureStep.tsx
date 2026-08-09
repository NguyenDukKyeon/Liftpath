import type { StructureProposal } from "../../domain/programming/structure-proposals.js";

interface StructureStepProps {
  proposals: StructureProposal[];
  onChoose(structureId: string): void;
  onBack(): void;
}

export function StructureStep({ proposals, onChoose, onBack }: StructureStepProps) {
  return (
    <div className="v5-onboarding-step">
      <h2>Choose your training structure</h2>
      <p>LiftPath recommends structures that match your exact weekly availability. You own this choice.</p>
      <div className="v5-structure-grid">
        {proposals.map((proposal) => (
          <article className="v5-structure-card" key={proposal.id}>
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
        ))}
      </div>
      <button type="button" className="v5-onboarding-back" onClick={onBack}>Back</button>
    </div>
  );
}
