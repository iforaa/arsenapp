import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useWorkoutStore } from '../store';
import { createWorkout, completeWorkout, getWorkout, deleteWorkout } from '../../db/queries';

interface UseWorkoutSessionReturn {
  // State
  workoutStarted: boolean;
  activeSeries: string | null;
  seriesCount: number;

  // Actions
  startWorkout: () => Promise<void>;
  finishWorkout: (logCurrentSet?: () => Promise<boolean>) => Promise<void>;
  goBackToHistory: () => void;
  nextSeries: (logCurrentSet?: () => Promise<boolean>) => Promise<void>;
}

export function useWorkoutSession(onWorkoutEnd?: () => void): UseWorkoutSessionReturn {
  const { currentWorkout, currentWorkoutSets, setCurrentWorkout, clearWorkout } = useWorkoutStore();
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [activeSeries, setActiveSeries] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);

  // Calculate series count from current sets
  const uniqueSeriesIds = new Set(
    currentWorkoutSets.filter((s) => s.series_id).map((s) => s.series_id)
  );
  const seriesCount = uniqueSeriesIds.size;

  const startWorkout = useCallback(async () => {
    try {
      const workoutId = await createWorkout();
      const workout = await getWorkout(workoutId);
      if (workout) {
        setCurrentWorkout(workout);
        setActiveSeries(`series_${Date.now()}`);
        setStartTime(Date.now());
        setWorkoutStarted(true);
      }
    } catch (error) {
      console.error('Failed to start workout:', error);
    }
  }, [setCurrentWorkout]);

  const finishWorkout = useCallback(
    async (logCurrentSet?: () => Promise<boolean>) => {
      if (!currentWorkout) return;

      try {
        // Log current set if provided
        if (logCurrentSet) {
          await logCurrentSet();
        }

        // If no sets were added, delete the empty workout
        if (currentWorkoutSets.length === 0) {
          await deleteWorkout(currentWorkout.id);
        } else {
          // Use local startTime to avoid timezone issues with database
          const duration = startTime
            ? Math.floor((Date.now() - startTime) / 1000 / 60)
            : 0;
          await completeWorkout(currentWorkout.id, duration);
        }

        clearWorkout();
        setActiveSeries(null);
        setWorkoutStarted(false);
        onWorkoutEnd?.();
      } catch (error) {
        console.error('Failed to finish workout:', error);
        Alert.alert('Error', 'Failed to finish workout');
      }
    },
    [currentWorkout, currentWorkoutSets, clearWorkout, onWorkoutEnd, startTime]
  );

  const goBackToHistory = useCallback(async () => {
    // If no sets were added, delete the empty workout
    if (currentWorkout && currentWorkoutSets.length === 0) {
      await deleteWorkout(currentWorkout.id);
    }
    clearWorkout();
    setActiveSeries(null);
    setWorkoutStarted(false);
    onWorkoutEnd?.();
  }, [currentWorkout, currentWorkoutSets, clearWorkout, onWorkoutEnd]);

  const nextSeries = useCallback(
    async (logCurrentSet?: () => Promise<boolean>) => {
      // Log current set if provided
      if (logCurrentSet) {
        await logCurrentSet();
      }
      // Start new series
      setActiveSeries(`series_${Date.now()}`);
    },
    []
  );

  return {
    workoutStarted,
    activeSeries,
    seriesCount,
    startWorkout,
    finishWorkout,
    goBackToHistory,
    nextSeries,
  };
}
