import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CATALOG_SEED } from "../domain/exercises/catalog-seed.js";
import {
  loadStorageHealth as loadDefaultStorageHealth,
  type StorageHealth,
  type StorageHealthLoader,
} from "../application/backup/storage-health.js";
import { activateProgram } from "../application/programs/activate-program.js";
import { completeSet, type CompleteSetInput } from "../application/workouts/complete-set.js";
import { completeWorkout } from "../application/workouts/complete-workout.js";
import { resumeWorkout } from "../application/workouts/resume-workout.js";
import { startWorkout } from "../application/workouts/start-workout.js";
import { LiftPathV5Error } from "../domain/common/errors.js";
import type { ProgramProposal } from "../domain/programming/prescription.js";
import type { TrainingProfileDraft } from "../domain/programming/profile.js";
import type { ProgramVersion, PrescribedSet } from "../domain/programming/program.js";
import type { CompletedSet } from "../domain/training/set.js";
import type { TrainingSession } from "../domain/training/session.js";
import { createProgramRepository } from "../infrastructure/repositories/program-repository.js";
import { createSessionRepository } from "../infrastructure/repositories/session-repository.js";
import { OnboardingFlow } from "../presentation/onboarding/OnboardingFlow.js";
import { WorkoutMode } from "../presentation/workout/WorkoutMode.js";
import type { SetValues } from "../presentation/workout/SetLogger.js";
import { installPreviewDiagnostics } from "./preview-diagnostics.js";

interface V5PreviewAppProps {
  loadStorageHealth?: StorageHealthLoader;
  workoutMode?: ReactNode;
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

const browserClock = { now: () => new Date().toISOString() } as const;
const browserIds = { next: (prefix: string) => `${prefix}-${crypto.randomUUID()}` } as const;

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

function exerciseName(exerciseId: string): string {
  return CATALOG_SEED.find((exercise) => exercise.id === exerciseId)?.name ??
    (exerciseId === PREVIEW_EXERCISE_ID ? PREVIEW_EXERCISE_NAME : exerciseId);
}

function flattenPlan(program: ProgramVersion, sessionKey: string): PlannedSet[] {
  const session = program.sessions.find((candidate) => candidate.key === sessionKey);
  if (!session) throw new LiftPathV5Error("CORRUPTED_DATA", `Missing session ${sessionKey}`);

  return [...session.exercises]
    .sort((left, right) => left.order - right.order)
    .flatMap((exercise) =>
      [...exercise.sets]
        .sort((left, right) => left.ordinal - right.ordinal)
        .map((prescription) => ({
          exerciseId: exercise.exerciseId,
          exerciseName: exerciseName(exercise.exerciseId),
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
}: V5PreviewAppProps = {}) {
  const [storageHealth, setStorageHealth] = useState<StorageHealth | null>(null);
  const [storageAttempt, setStorageAttempt] = useState(0);
  const [activeProgram, setActiveProgram] = useState<ProgramVersion | null>(null);
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

    void (async () => {
      try {
        const sessions = createSessionRepository();
        const programs = createProgramRepository();
        const resumed = await resumeWorkout(sessions);
        if (!active) return;

        if (resumed) {
          const program = await programs.get(resumed.session.programVersionId);
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

        const program = workoutCoreDemo ? PREVIEW_PROGRAM : await programs.getActive();
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
  }, [canUseV5Storage, databaseInfo, workoutCoreDemo, workoutMode]);

  const plan = useMemo(
    () => (workout ? flattenPlan(workout.program, workout.session.sessionKey) : []),
    [workout],
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

  async function activateApprovedProgram(
    proposal: ProgramProposal,
    profile: TrainingProfileDraft,
  ): Promise<void> {
    const activated = await activateProgram(proposal, profile, {
      programs: createProgramRepository(),
      ids: browserIds,
      clock: browserClock,
    });
    setActiveProgram(activated.program);
    setWorkoutCompleted(false);
    setWorkoutError(null);
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
      const programs = createProgramRepository();
      if (workoutCoreDemo) await programs.save(PREVIEW_PROGRAM);
      const sessions = createSessionRepository();
      const session = await startWorkout({
        programVersion: activeProgram,
        sessionKey: firstSession.key,
        sessions,
        ids: browserIds,
        clock: browserClock,
      });
      setWorkout({ session, sets: [], program: activeProgram });
    } catch (error: unknown) {
      setWorkoutError(errorMessage(error));
    } finally {
      setWorkoutPending(false);
    }
  }

  async function commitSet(input: CompleteSetInput): Promise<CompletedSet> {
    const sessions = createSessionRepository();
    const completed = await completeSet({
      input,
      sessions,
      ids: browserIds,
      clock: browserClock,
    });
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
    const sessions = createSessionRepository();
    await completeWorkout(workout.session.id, sessions, browserClock);
    setWorkout(null);
    setWorkoutCompleted(true);
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
                  catalog={[...CATALOG_SEED]}
                  onActivate={activateApprovedProgram}
                />
              )}

              {workoutReady && !workout && activeProgram && (
                <section aria-label="Active program">
                  <p>Program active</p>
                  <h2>{activeProgram.name}</h2>
                  <output data-testid="v5-active-program-id">{activeProgram.id}</output>
                  {activeProgram.structureId && <p>Structure: {activeProgram.structureId}</p>}
                  {activeProgram.policyVersion && <p>Policy: {activeProgram.policyVersion}</p>}
                  {workoutCompleted && <p>Workout completed</p>}
                  <button type="button" disabled={workoutPending} onClick={() => void beginWorkout()}>
                    {workoutPending ? "Starting…" : "Start workout"}
                  </button>
                </section>
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
