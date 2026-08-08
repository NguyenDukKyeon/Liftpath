import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CoachRecommendation } from "../../../src/v5/domain/coaching/recommendation";
import { CoachRecommendationCard } from "../../../src/v5/presentation/components/CoachRecommendationCard";

const recommendation: CoachRecommendation = {
  id: "recommendation-1",
  createdAt: "2026-08-08T04:00:00.000Z",
  updatedAt: "2026-08-08T04:00:00.000Z",
  revision: 1,
  type: "progression",
  priority: "progression",
  reasonCode: "PROGRESSION_TOP_RANGE",
  evidenceIds: ["set-1", "set-2", "set-3"],
  confidence: "medium",
  proposedPatch: { kind: "set_load", exerciseId: "lat-pulldown", loadKg: 52.5 },
  expectedIntent: "Progress load after repeated top-of-range work at target effort.",
  decisionState: "pending",
  coachPolicyVersion: "1.0.0",
  programmingPolicyVersion: "1.0.0",
};

describe("CoachRecommendationCard", () => {
  it("explains the recommendation and waits for an explicit decision", async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();
    const onModify = vi.fn();
    const onSkip = vi.fn();

    render(
      <CoachRecommendationCard
        recommendation={recommendation}
        onAccept={onAccept}
        onModify={onModify}
        onSkip={onSkip}
      />,
    );

    expect(screen.getByRole("heading", { name: "Coach recommendation" })).toBeInTheDocument();
    expect(screen.getByText(/52\.5 kg/i)).toBeInTheDocument();
    expect(screen.getByText(/top-of-range work/i)).toBeInTheDocument();
    expect(screen.getByText(/medium confidence/i)).toBeInTheDocument();
    expect(screen.getByText(/3 training records/i)).toBeInTheDocument();
    expect(onAccept).not.toHaveBeenCalled();
    expect(onModify).not.toHaveBeenCalled();
    expect(onSkip).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Accept" }));
    expect(onAccept).toHaveBeenCalledWith("recommendation-1");

    await user.click(screen.getByRole("button", { name: "Modify" }));
    expect(onModify).toHaveBeenCalledWith("recommendation-1");

    await user.click(screen.getByRole("button", { name: "Skip" }));
    expect(onSkip).toHaveBeenCalledWith("recommendation-1");
  });
});
