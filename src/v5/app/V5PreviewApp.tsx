import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  loadStorageHealth as loadDefaultStorageHealth,
  type StorageHealth,
  type StorageHealthLoader,
} from "../application/backup/storage-health.js";
import type { CompleteSetInput } from "../application/workouts/complete-set.js";
import { LiftPathV5Error } from "../domain/common/errors.js";
import type { CoachRecommendation } from "../domain/coaching/recommendation.js";
import type { ExerciseMetadata } from "../domain/exercises/exercise.js";
import type { ProgramProposal } from "../domain/programming/prescription.js";
import type { TrainingProfileDraft } from "../domain/programming/profile.js";
import type { ProgramVersion, PrescribedSet } from "../domain/programming/program.js";
import type { CompletedSet } from "../domain/training/set.js";
import type { TrainingSession } from "../domain/training/session.js";
import { CoachRecommendationCard } from "../presentation/components/CoachRecommendationCard.js";
import { OnboardingFlow } from "../presentation/onboarding/OnboardingFlow.js";
import { WorkoutMode } from "../presentation/workout/WorkoutMode.js";
import type { SetValues } from "../presentation/workout/SetLogger.js";
import { createV5Services } from "./create-v5-services.js";
import { installPreviewDiagnostics } from "./preview-diagnostics.js";
import type { V5Services } from "./v5-services.js";

interface V5PreviewAppProps {
  loadStorageHealth?: StorageHealthLoader;
  workoutMode?: ReactNode;
  services?: V5Services;
}

interface ActiveWorkoutView {
  session: TrainingSession;
  sets: CompletedSet[];
  program: ProgramVersion;
}

interface PlannedSet {
  exerciseId: string;
  exerciseName: string;
  prescription: PrescribedSet;
}

const PREVIEW_EXERCISE_ID = "lat-pulldown";
const PREVIEW_EXERCISE_NAME = "Lat Pulldown";
const PREVIEW_PROGRAM: ProgramVersion = {
  id: "workout-core-preview-v1",
  versionNumber: 1,
  name: "Workout Core Preview",
  sessions: [
    {
      key: "upper-a",
      name: "Upper A",
      exercises: [
        {
          exerciseId: PREVIEW_EXERCISE_ID,
          order: 1,
          sets: [1, 2, 3, 4].map((ordinal) => ({
            ordinal,
            minReps: 8,
            maxReps: 12,
            targetRir: 2,
            prescribedLoadKg: 30,
          })),
        },
      ],
    },
  ],
  createdAt: "2026-08-07T08:00:00.000Z",
  updatedAt: "2026-08-07T08:00:00.000Z",
  revision: 1,
};

function storageFailure(error: unknown): StorageHealth {
  const detail = error instanceof LiftPathV5Error ? error.message : "Unknown storage failure";
  return { status: "error", message: detail };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "LiftPath 5 failed";
}

function isWorkoutCoreDemo(search: string): boolean {
  return new URLSearchParams(search).get("demo") === "workout-core";
}

function exerciseName(catalog: readonly ExerciseMetadata[], exerciseId: string): string {
  return catalog.find((exercise) => exercise.id === exerciseId)?.name ??
    (exerciseId === PREVIEW_EXERCISE_ID ? PREVIEW_EXERCISE_NAME : exerciseId);
}

function flattenPlan(
  catalog: readonly ExerciseMetadata[],
  program: ProgramVersion,
  sessionKey: string,
): PlannedSet[] {
  const session = program.sessions.find((candidate) => candidate.key === sessionKey);
  if (!session) throw new LiftPathV5Error("CORRUPTED_DATA", `Missing session ${sessionKey}`);

  return [...session.exercises]
    .sort((left, right) => left.order - right.order)
    .flatMap((exercise) =>
      [...exercise.sets]
        .sort((left, right) => left.ordinal - right.ordinal)
        .map((prescription) => ({
          exerciseId: exercise.exerciseId,
          exerciseName: exerciseName(catalog, exercise.exerciseId),
          prescription,
        })),
    );
}

function setKey(exerciseId: string, ordinal: number): string {
  return `${exerciseId}:${ordinal}`;
}

function prescribedValues(set: PrescribedSet): SetValues {
  const values: SetValues = { reps: set.maxReps, rir: set.targetRir };
  if (set.prescribedLoadKg !== undefined) values.loadKg = set.prescribedLoadKg;
  return values;
}

function completedValues(set: CompletedSet | undefined): SetValues | undefined {
  if (!set) return undefined;
  const values: SetValues = {};
  if (set.loadKg !== undefined) values.loadKg = set.loadKg;
  if (set.reps !== undefined) values.reps = set.reps;
  if (set.rir !== undefined) values.rir = set.rir;
  return values;
}

export function V5PreviewApp({
  loadStorageHealth = loadDefaultStorageHealth,
  workoutMode,
  services: providedServices,
}: V5PreviewAppProps = {}) {
  const services = useMemo(() => providedServices ?? createV5Services(), [providedServices]);
  const [storageHealth, setStorageHealth] = useState<StorageHealth | null>(null);
  const [storageAttempt, setStorageAttempt] = useState(0);
  const [activeProgram, setActiveProgram] = useState<ProgramVersion | null>(null);
  const [coachRecommendations, setCoachRecommendations] = useState<CoachRecommendation[]>([]);
  const [coachDecisionPending, setCoachDecisionPending] = useState(false);
  const [modifyRequestId, setModifyRequestId] = useState<string | null>(null);
  const [workout, setWorkout] = useState<ActiveWorkoutView | null>(null);
  const [workoutReady, setWorkoutReady] = useState(false);
  const [workoutPending, setWorkoutPending] = useState(false);
  const [workoutError, setWorkoutError] = useState<string | null>(null);
  const [workoutCompleted, setWorkoutCompleted] = useState(false);
  const workoutCoreDemo = useMemo(
    () => typeof window !== "undefined" && isWorkoutCoreDemo(window.location.search),
    [],
  );

  useEffect(() => {
    let active = true;
    setStorageHealth(null);

    void loadStorageHealth()
      .then((health) => {
        if (active) setStorageHealth(health);
      })
      .catch((error: unknown) => {
        if (active) setStorageHealth(storageFailure(error));
      });

    return () => {
      active = false;
    };
  }, [loadStorageHealth, storageAttempt]);

  useEffect(() => installPreviewDiagnostics(window.location.search), []);

  const databaseInfo = storageHealth?.status === "ready" ? storageHealth.databaseInfo : null;
  const canUseV5Storage =
    databaseInfo !== null && workoutMode === undefined && typeof globalThis.indexedDB !== "undefined";

  useEffect(() => {
    if (!canUseV5Storage) {
      if (databaseInfo && workoutMode !== undefined) setWorkoutReady(true);
      return;
    }

    let active = true;
    setWorkoutReady(false);
    setWorkoutError(null);
    setModifyRequestId(null);

    void (async () => {
      try {
        const [resumed, pendingRecommendations] = await Promise.all([
          services.workouts.resume(),
          services.coach.listPending(),
        ]);
        if (!active) return;
        setCoachRecommendations(pendingRecommendations);

        if (resumed) {
          const program = await services.programs.get(resumed.session.programVersionId);
          if (!program) {
            throw new LiftPathV5Error(
              "CORRUPTED_DATA",
              `Missing program version ${resumed.session.programVersionId}`,
            );
          }
          if (!active) return;
          setActiveProgram(program);
          setWorkout({ ...resumed, program });
          setWorkoutReady(true);
          return;
        }

        const program = workoutCoreDemo ? PREVIEW_PROGRAM : await services.programs.getActive();
        if (!active) return;
        setActiveProgram(program ?? null);
        setWorkout(null);
        setWorkoutReady(true);
      } catch (error: unknown) {
        if (!active) return;
        setWorkoutError(errorMessage(error));
        setWorkoutReady(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [canUseV5Storage, databaseInfo, services, workoutCoreDemo, workoutMode]);

  const plan = useMemo(
    () =>
      workout
        ? flattenPlan(services.catalog, workout.program, workout.session.sessionKey)
        : [],
    [services, workout],
  );
  const completedKeys = useMemo(
    () => new Set(workout?.sets.map((set) => setKey(set.exerciseId, set.setOrdinal)) ?? []),
    [workout],
  );
  const completedCount = plan.filter((item) =>
    completedKeys.has(setKey(item.exerciseId, item.prescription.ordinal)),
  ).length;
  const current =
    plan.find((item) => !completedKeys.has(setKey(item.exerciseId, item.prescription.ordinal))) ??
    plan.at(-1);
  const previous = current
    ? [...(workout?.sets ?? [])].reverse().find((set) => set.exerciseId === current.exerciseId)
    : undefined;

  async function refreshPendingRecommendations(): Promise<void> {
    setCoachRecommendations(await services.coach.listPending());
  }

  async function activateApprovedProgram(
    proposal: ProgramProposal,
    profile: TrainingProfileDraft,
  ): Promise<void> {
    const activated = await services.programs.activate(proposal, profile);
    setActiveProgram(activated.program);
    setWorkoutCompleted(false);
    setWorkoutError(null);
  }

  async function acceptCoachRecommendation(id: string): Promise<void> {
    if (coachDecisionPending) return;
    setCoachDecisionPending(true);
    setWorkoutError(null);
    setModifyRequestId(null);
    try {
      const nextProgram = await services.coach.accept(id);
      if (nextProgram) setActiveProgram(nextProgram);
      setCoachRecommendations(await services.coach.listPending());
    } catch (error: unknown) {
      setWorkoutError(errorMessage(error));
    } finally {
      setCoachDecisionPending(false);
    }
  }

  async function skipCoachRecommendation(id: string): Promise<void> {
    if (coachDecisionPending) return;
    setCoachDecisionPending(true);
    setWorkoutError(null);
    setModifyRequestId(null);
    try {
      await services.coach.skip(id);
      setCoachRecommendations(await services.coach.listPending());
    } catch (error: unknown) {
      setWorkoutError(errorMessage(error));
    } finally {
      setCoachDecisionPending(false);
    }
  }

  function requestCoachModification(id: string): void {
    if (coachDecisionPending) return;
    setModifyRequestId(id);
  }

  async function beginWorkout(): Promise<void> {
    if (!activeProgram) {
      throw new LiftPathV5Error("VALIDATION_ERROR", "An approved program is required before starting");
    }
    const firstSession = activeProgram.sessions[0];
    if (!firstSession) {
      throw new LiftPathV5Error("CORRUPTED_DATA", "Active program has no training sessions");
    }

    setWorkoutPending(true);
    setWorkoutError(null);
    setWorkoutCompleted(false);
    try {
      if (workoutCoreDemo) await services.programs.save(PREVIEW_PROGRAM);
      const session = await services.workouts.start({
        programVersion: activeProgram,
        sessionKey: firstSession.key,
      });
      setWorkout({ session, sets: [], program: activeProgram });
    } catch (error: unknown) {
      setWorkoutError(errorMessage(error));
    } finally {
      setWorkoutPending(false);
    }
  }

  async function commitSet(input: CompleteSetInput): Promise<CompletedSet> {
    const completed = await services.workouts.completeSet(input);
    setWorkout((currentWorkout) =>
      currentWorkout && currentWorkout.session.id === completed.sessionId
        ? { ...currentWorkout, sets: [...currentWorkout.sets, completed] }
        : currentWorkout,
    );
    return completed;
  }

  async function finishWorkout(): Promise<void> {
    if (!workout || completedCount < plan.length || plan.length === 0) {
      throw new LiftPathV5Error("VALIDATION_ERROR", "All prescribed sets must be saved first");
    }
    await services.workouts.completeWorkout(workout.session.id);
    setWorkout(null);
    setWorkoutCompleted(true);
    await refreshPendingRecommendations();
  }

  return (
    <main data-testid="v5-preview-root">
      <p>LIFTPATH 5 PREVIEW</p>
      <h1>Personal Coach foundation</h1>

      {storageHealth?.status === "error" && (
        <section role="alert" aria-live="assertive">
          <strong>Không thể lưu dữ liệu LiftPath 5</strong>
          <p>{storageHealth.message}</p>
          <button type="button" onClick={() => setStorageAttempt((attempt) => attempt + 1)}>
            Thử lại
          </button>
        </section>
      )}

      {databaseInfo && (
        <>
          <output
            data-testid="v5-db-info"
            data-db-name={databaseInfo.name}
            data-db-stores={databaseInfo.stores.join(",")}
          />

          {workoutMode ?? (
            <>
              {!workoutReady && <p>Restoring LiftPath 5…</p>}
              {workoutError && <p role="alert">{workoutError}</p>}

              {workoutReady && !workout && !activeProgram && (
                <OnboardingFlow
                  catalog={[...services.catalog]}
                  onActivate={activateApprovedProgram}
                />
              )}

              {workoutReady && !workout && activeProgram && (
                <>
                  {coachRecommendations.length > 0 && (
                    <section aria-label="Coach decisions" aria-busy={coachDecisionPending}>
                      {coachRecommendations.map((recommendation) => (
                        <CoachRecommendationCard
                          key={recommendation.id}
                          recommendation={recommendation}
                          onAccept={acceptCoachRecommendation}
                          onModify={requestCoachModification}
                          onSkip={skipCoachRecommendation}
                        />
                      ))}
                      {modifyRequestId && (
                        <p role="status">
                          No change applied. Custom patch editing is not available in this preview slice.
                        </p>
                      )}
                    </section>
                  )}

                  <section aria-label="Active program">
                    <p>Program active</p>
                    <h2>{activeProgram.name}</h2>
                    <output data-testid="v5-active-program-id">{activeProgram.id}</output>
                    {activeProgram.structureId && <p>Structure: {activeProgram.structureId}</p>}
                    {activeProgram.policyVersion && <p>Policy: {activeProgram.policyVersion}</p>}
                    {workoutCompleted && <p>Workout completed</p>}
                    <button type="button" disabled={workoutPending || coachDecisionPending} onClick={() => void beginWorkout()}>
                      {workoutPending ? "Starting…" : "Start workout"}
                    </button>
                  </section>
                </>
              )}

              {workout && current && (
                <section aria-label="Workout Core">
                  <output data-testid="v5-active-session-id">{workout.session.id}</output>
                  <WorkoutMode
                    sessionId={workout.session.id}
                    exerciseId={current.exerciseId}
                    exerciseName={current.exerciseName}
                    setOrdinal={current.prescription.ordinal}
                    prescribed={prescribedValues(current.prescription)}
                    previous={completedValues(previous)}
                    onCompleteSet={commitSet}
                    clock={services.clock}
                    completedSetCount={completedCount}
                    totalSetCount={plan.length}
                    onCompleteWorkout={finishWorkout}
                  />
                </section>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}
