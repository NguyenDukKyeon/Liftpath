import type { TrainingProfileDraft } from "./profile.js";

export interface StructureProposal {
  id: string;
  name: string;
  daysPerWeek: number;
  rationale: string;
  tradeoffs: string[];
  sessionKeys: string[];
  score: number;
}

interface StructureTemplate extends Omit<StructureProposal, "score"> {
  beginnerFriendly: boolean;
  specializationExposure: number;
  preferredMinimumMinutes: number;
}

const STRUCTURES: readonly StructureTemplate[] = [
  { id: "full-body-2", name: "Full Body A/B", daysPerWeek: 2, rationale: "Two whole-body sessions maximize coverage when weekly availability is limited.", tradeoffs: ["Each session carries more total-body work."], sessionKeys: ["full-a", "full-b"], beginnerFriendly: true, specializationExposure: 2, preferredMinimumMinutes: 45 },
  { id: "upper-lower-2", name: "Upper / Lower", daysPerWeek: 2, rationale: "Separates upper and lower work for simpler session focus.", tradeoffs: ["Most muscle groups receive one direct weekly session."], sessionKeys: ["upper", "lower"], beginnerFriendly: true, specializationExposure: 1, preferredMinimumMinutes: 45 },
  { id: "full-body-3", name: "Full Body 3-Day", daysPerWeek: 3, rationale: "Frequent whole-body practice with recovery days between sessions.", tradeoffs: ["Sessions can feel dense when time is short."], sessionKeys: ["full-a", "full-b", "full-c"], beginnerFriendly: true, specializationExposure: 3, preferredMinimumMinutes: 45 },
  { id: "upper-lower-full-3", name: "Upper / Lower / Full", daysPerWeek: 3, rationale: "Combines focused days with one whole-body exposure.", tradeoffs: ["Weekly distribution is less symmetrical than pure full-body."], sessionKeys: ["upper", "lower", "full"], beginnerFriendly: true, specializationExposure: 2, preferredMinimumMinutes: 45 },
  { id: "torso-lower-full-3", name: "Torso / Lower / Full", daysPerWeek: 3, rationale: "Creates an extra torso emphasis opportunity without dropping lower-body training.", tradeoffs: ["The full-body day must stay tightly prioritized."], sessionKeys: ["torso", "lower", "full"], beginnerFriendly: false, specializationExposure: 3, preferredMinimumMinutes: 60 },
  { id: "upper-lower-4", name: "Upper / Lower x2", daysPerWeek: 4, rationale: "Balanced twice-weekly upper and lower exposures with predictable recovery.", tradeoffs: ["Upper sessions can be dense with multiple physique priorities."], sessionKeys: ["upper-a", "lower-a", "upper-b", "lower-b"], beginnerFriendly: true, specializationExposure: 2, preferredMinimumMinutes: 45 },
  { id: "torso-lower-4", name: "Torso / Lower Hybrid", daysPerWeek: 4, rationale: "Provides two torso-focused opportunities while preserving two lower-body sessions.", tradeoffs: ["Requires careful exercise ordering to keep torso sessions concise."], sessionKeys: ["torso-a", "lower-a", "torso-b", "lower-b"], beginnerFriendly: true, specializationExposure: 3, preferredMinimumMinutes: 45 },
  { id: "upper-lower-specialization-4", name: "Upper / Lower + Specialization", daysPerWeek: 4, rationale: "Keeps an upper/lower backbone while opening extra room for the selected specialization.", tradeoffs: ["Priority work must be redistributed rather than simply added."], sessionKeys: ["upper-a", "lower-a", "upper-priority", "lower-b"], beginnerFriendly: false, specializationExposure: 4, preferredMinimumMinutes: 60 },
  { id: "upper-lower-push-pull-5", name: "Upper / Lower / Push / Pull / Lower", daysPerWeek: 5, rationale: "Adds upper-body exposure while retaining two lower-body days.", tradeoffs: ["Higher weekly attendance demand."], sessionKeys: ["upper", "lower-a", "push", "pull", "lower-b"], beginnerFriendly: false, specializationExposure: 4, preferredMinimumMinutes: 45 },
  { id: "upper-lower-torso-5", name: "Upper / Lower + Torso", daysPerWeek: 5, rationale: "Uses a stable upper/lower base with one additional torso-priority day.", tradeoffs: ["Needs conservative accessory volume to avoid overlap."], sessionKeys: ["upper-a", "lower-a", "torso", "upper-b", "lower-b"], beginnerFriendly: false, specializationExposure: 4, preferredMinimumMinutes: 45 },
  { id: "full-upper-lower-5", name: "Full / Upper / Lower Hybrid", daysPerWeek: 5, rationale: "Spreads work across shorter focused sessions with one full-body anchor.", tradeoffs: ["More complex weekly sequencing."], sessionKeys: ["full", "upper-a", "lower-a", "upper-b", "lower-b"], beginnerFriendly: false, specializationExposure: 3, preferredMinimumMinutes: 45 },
  { id: "ppl-6", name: "Push / Pull / Legs x2", daysPerWeek: 6, rationale: "High-frequency focused sessions with clear movement themes.", tradeoffs: ["Requires strong schedule consistency and recovery."], sessionKeys: ["push-a", "pull-a", "legs-a", "push-b", "pull-b", "legs-b"], beginnerFriendly: false, specializationExposure: 4, preferredMinimumMinutes: 30 },
  { id: "upper-lower-6", name: "Upper / Lower x3", daysPerWeek: 6, rationale: "Frequent repeated practice with a simple alternating structure.", tradeoffs: ["Weekly workload must stay conservative despite high frequency."], sessionKeys: ["upper-a", "lower-a", "upper-b", "lower-b", "upper-c", "lower-c"], beginnerFriendly: false, specializationExposure: 3, preferredMinimumMinutes: 30 },
  { id: "torso-limbs-6", name: "Torso / Limbs x3", daysPerWeek: 6, rationale: "Creates frequent torso specialization exposure while distributing limb work.", tradeoffs: ["Less familiar structure and more programming complexity."], sessionKeys: ["torso-a", "limbs-a", "torso-b", "limbs-b", "torso-c", "limbs-c"], beginnerFriendly: false, specializationExposure: 5, preferredMinimumMinutes: 45 },
];

function scoreStructure(template: StructureTemplate, profile: TrainingProfileDraft): number {
  let score = 100;
  if (profile.level === "beginner" && template.beginnerFriendly) score += 12;
  if (profile.level === "beginner" && !template.beginnerFriendly) score -= 8;
  if (profile.constraints.sessionMinutes >= template.preferredMinimumMinutes) score += 6;
  else score -= 10;

  const wantsPriorityExposure = profile.primarySpecialization !== undefined;
  if (wantsPriorityExposure) score += Math.min(template.specializationExposure, 4) * 2;
  if (profile.goal === "general_fitness" && template.specializationExposure > 3) score -= 3;
  return score;
}

export function rankStructureProposals(profile: TrainingProfileDraft): StructureProposal[] {
  return STRUCTURES
    .filter((template) => template.daysPerWeek === profile.constraints.daysPerWeek)
    .map((template) => ({
      id: template.id,
      name: template.name,
      daysPerWeek: template.daysPerWeek,
      rationale: template.rationale,
      tradeoffs: [...template.tradeoffs],
      sessionKeys: [...template.sessionKeys],
      score: scoreStructure(template, profile),
    }))
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
    .slice(0, 3);
}
