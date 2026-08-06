import type { AvailableTrainingDays, UserProfile } from "../../types.js";

export type OnboardingStep = "goal" | "schedule" | "experience" | "preview";

export type OnboardingState = {
  step: OnboardingStep;
  profile: UserProfile;
  validationMessage: string;
};

export type OnboardingAction =
  | { type: "next" }
  | { type: "back" }
  | { type: "patch-profile"; patch: Partial<UserProfile> }
  | { type: "go-to"; step: OnboardingStep };

const steps: OnboardingStep[] = ["goal", "schedule", "experience", "preview"];

const defaultPreferredDays = (availableDays: AvailableTrainingDays) => {
  if (availableDays === 2) return [1, 4];
  if (availableDays === 3) return [1, 3, 5];
  if (availableDays === 4) return [1, 2, 4, 5];
  if (availableDays === 5) return [1, 2, 3, 5, 6];
  return [1, 2, 3, 4, 5, 6];
};

const normalizeProfile = (profile: UserProfile): UserProfile => {
  const preferredDays = profile.preferredDays?.filter(
    (day) => Number.isInteger(day) && day >= 0 && day <= 6,
  ) ?? defaultPreferredDays(profile.availableDays);
  return {
    ...profile,
    preferredDays: preferredDays.slice(0, profile.availableDays),
    restrictions: profile.restrictions ?? [],
    profileNotes: profile.profileNotes ?? profile.limitations ?? "",
    effortLanguage: profile.effortLanguage ?? "simple-rir",
    movementFamiliarity: profile.movementFamiliarity ?? "new",
    consistencyWeeks: Math.max(0, Math.round(profile.consistencyWeeks ?? 0)),
    recentLoads: profile.recentLoads ?? {},
  };
};

export const createOnboardingState = (initial: UserProfile): OnboardingState => ({
  step: "goal",
  profile: normalizeProfile(initial),
  validationMessage: "",
});

const scheduleIsValid = (profile: UserProfile) =>
  profile.equipment.length > 0
  && (profile.preferredDays?.length ?? 0) >= profile.availableDays;

export const canAdvanceOnboarding = (state: OnboardingState) => {
  if (state.step === "schedule") return scheduleIsValid(state.profile);
  return state.step !== "preview";
};

export const onboardingReducer = (
  state: OnboardingState,
  action: OnboardingAction,
): OnboardingState => {
  if (action.type === "patch-profile") {
    const profile = normalizeProfile({ ...state.profile, ...action.patch });
    return { ...state, profile, validationMessage: "" };
  }

  if (action.type === "go-to") {
    return { ...state, step: action.step, validationMessage: "" };
  }

  const index = steps.indexOf(state.step);
  if (action.type === "back") {
    return {
      ...state,
      step: steps[Math.max(0, index - 1)],
      validationMessage: "",
    };
  }

  if (state.step === "schedule" && !scheduleIsValid(state.profile)) {
    return {
      ...state,
      validationMessage: "Chọn thiết bị và lịch tập trước khi tiếp tục.",
    };
  }

  return {
    ...state,
    step: steps[Math.min(steps.length - 1, index + 1)],
    validationMessage: "",
  };
};
