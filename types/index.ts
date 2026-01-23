export interface Exercise {
  id: number;
  name: string;
  muscle_groups: string[]; // JSON array
  equipment: string;
  is_custom: boolean;
  media_paths: string[]; // JSON array
  notes: string;
  created_at: string; // ISO timestamp
}

export interface Workout {
  id: number;
  date: string; // ISO timestamp
  duration_minutes: number | null;
  notes: string;
  completed: boolean;
}

export interface Set {
  id: number;
  workout_id: number;
  exercise_id: number;
  weight: number;
  reps: number;
  order_in_workout: number;
  timestamp: string; // ISO timestamp
}

export interface WorkoutWithSets extends Workout {
  sets: (Set & { exercise: Exercise })[];
}

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'legs'
  | 'glutes'
  | 'core'
  | 'cardio';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'cable'
  | 'machine'
  | 'bodyweight'
  | 'resistance_band'
  | 'other';
