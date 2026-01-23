import { create } from 'zustand';
import type { Workout, Exercise, Set } from '../types';

interface WorkoutState {
  currentWorkout: Workout | null;
  currentWorkoutSets: (Set & { exercise: Exercise })[];
  isWorkoutActive: boolean;

  setCurrentWorkout: (workout: Workout | null) => void;
  setCurrentWorkoutSets: (sets: (Set & { exercise: Exercise })[]) => void;
  setIsWorkoutActive: (active: boolean) => void;

  addSetToWorkout: (set: Set & { exercise: Exercise }) => void;
  removeSetFromWorkout: (setId: number) => void;
  clearWorkout: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set) => ({
  currentWorkout: null,
  currentWorkoutSets: [],
  isWorkoutActive: false,

  setCurrentWorkout: (workout) => set({ currentWorkout: workout }),
  setCurrentWorkoutSets: (sets) => set({ currentWorkoutSets: sets }),
  setIsWorkoutActive: (active) => set({ isWorkoutActive: active }),

  addSetToWorkout: (newSet) =>
    set((state) => ({
      currentWorkoutSets: [...state.currentWorkoutSets, newSet],
    })),

  removeSetFromWorkout: (setId) =>
    set((state) => ({
      currentWorkoutSets: state.currentWorkoutSets.filter(s => s.id !== setId),
    })),

  clearWorkout: () =>
    set({
      currentWorkout: null,
      currentWorkoutSets: [],
      isWorkoutActive: false,
    }),
}));
