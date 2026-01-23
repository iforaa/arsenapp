import { getDatabase } from './database';
import type { Exercise, Workout, Set, MuscleGroup, Equipment } from '../types';

// ============================================================================
// SECTION 1: WORKOUT QUERIES
// ============================================================================

/**
 * Creates a new workout with the current timestamp
 * @returns The ID of the newly created workout
 */
export async function createWorkout(): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO workouts (date, completed) VALUES (datetime("now"), 0)'
  );
  return result.lastInsertRowId;
}

/**
 * Gets a single workout by ID
 * @param id - The workout ID
 * @returns The workout or null if not found
 */
export async function getWorkout(id: number): Promise<Workout | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{
    id: number;
    date: string;
    duration_minutes: number | null;
    notes: string;
    completed: number;
  }>('SELECT * FROM workouts WHERE id = ?', [id]);

  if (!result) return null;

  return {
    id: result.id,
    date: result.date,
    duration_minutes: result.duration_minutes,
    notes: result.notes,
    completed: result.completed === 1,
  };
}

/**
 * Gets today's workout if it exists
 * @returns Today's workout or null
 */
export async function getTodaysWorkout(): Promise<Workout | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{
    id: number;
    date: string;
    duration_minutes: number | null;
    notes: string;
    completed: number;
  }>('SELECT * FROM workouts WHERE date(date) = date("now") ORDER BY date DESC LIMIT 1');

  if (!result) return null;

  return {
    id: result.id,
    date: result.date,
    duration_minutes: result.duration_minutes,
    notes: result.notes,
    completed: result.completed === 1,
  };
}

/**
 * Marks a workout as complete with the given duration
 * @param id - The workout ID
 * @param durationMinutes - Duration of the workout in minutes
 */
export async function completeWorkout(id: number, durationMinutes: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE workouts SET completed = 1, duration_minutes = ? WHERE id = ?',
    [durationMinutes, id]
  );
}

/**
 * Gets recent completed workouts
 * @param limit - Maximum number of workouts to return (default: 10)
 * @returns Array of recent completed workouts
 */
export async function getRecentWorkouts(limit: number = 10): Promise<Workout[]> {
  const db = await getDatabase();
  const results = await db.getAllAsync<{
    id: number;
    date: string;
    duration_minutes: number | null;
    notes: string;
    completed: number;
  }>('SELECT * FROM workouts WHERE completed = 1 ORDER BY date DESC LIMIT ?', [limit]);

  return results.map((row) => ({
    id: row.id,
    date: row.date,
    duration_minutes: row.duration_minutes,
    notes: row.notes,
    completed: row.completed === 1,
  }));
}

// ============================================================================
// SECTION 2: SET QUERIES
// ============================================================================

/**
 * Adds a new set to a workout
 * @param workoutId - The workout ID
 * @param exerciseId - The exercise ID
 * @param weight - Weight used (in kg)
 * @param reps - Number of repetitions
 * @param seriesId - Optional series ID for grouping sets
 * @returns The ID of the newly created set
 */
export async function addSet(
  workoutId: number,
  exerciseId: number,
  weight: number,
  reps: number,
  seriesId?: string | null
): Promise<number> {
  const db = await getDatabase();

  // Get the max order for this workout and increment
  const maxOrderResult = await db.getFirstAsync<{ max_order: number | null }>(
    'SELECT MAX(order_in_workout) as max_order FROM sets WHERE workout_id = ?',
    [workoutId]
  );

  const nextOrder = (maxOrderResult?.max_order ?? -1) + 1;

  const result = await db.runAsync(
    'INSERT INTO sets (workout_id, exercise_id, weight, reps, order_in_workout, series_id, timestamp) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))',
    [workoutId, exerciseId, weight, reps, nextOrder, seriesId]
  );

  return result.lastInsertRowId;
}

/**
 * Deletes a set by ID
 * @param id - The set ID
 */
export async function deleteSet(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM sets WHERE id = ?', [id]);
}

/**
 * Gets the most recent set for a specific exercise
 * @param exerciseId - The exercise ID
 * @returns The most recent set or null if no sets exist
 */
export async function getLastSetForExercise(exerciseId: number): Promise<Set | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{
    id: number;
    workout_id: number;
    exercise_id: number;
    weight: number;
    reps: number;
    order_in_workout: number;
    timestamp: string;
  }>(
    'SELECT * FROM sets WHERE exercise_id = ? ORDER BY timestamp DESC LIMIT 1',
    [exerciseId]
  );

  if (!result) return null;

  return {
    id: result.id,
    workout_id: result.workout_id,
    exercise_id: result.exercise_id,
    weight: result.weight,
    reps: result.reps,
    order_in_workout: result.order_in_workout,
    timestamp: result.timestamp,
  };
}

/**
 * Gets all sets for a workout with exercise information joined
 * @param workoutId - The workout ID
 * @returns Array of sets with exercise information
 */
export async function getWorkoutSets(
  workoutId: number
): Promise<(Set & { exercise: Exercise })[]> {
  const db = await getDatabase();
  const results = await db.getAllAsync<{
    id: number;
    workout_id: number;
    exercise_id: number;
    weight: number;
    reps: number;
    order_in_workout: number;
    series_id: string | null;
    timestamp: string;
    exercise_name: string;
    muscle_groups: string;
    equipment: string;
    tracking_type: string;
    is_custom: number;
    media_paths: string;
    notes: string;
    created_at: string;
  }>(
    `SELECT
      sets.*,
      exercises.name as exercise_name,
      exercises.muscle_groups,
      exercises.equipment,
      exercises.tracking_type,
      exercises.is_custom,
      exercises.media_paths,
      exercises.notes,
      exercises.created_at
    FROM sets
    INNER JOIN exercises ON sets.exercise_id = exercises.id
    WHERE sets.workout_id = ?
    ORDER BY sets.order_in_workout ASC`,
    [workoutId]
  );

  return results.map((row) => ({
    id: row.id,
    workout_id: row.workout_id,
    exercise_id: row.exercise_id,
    weight: row.weight,
    reps: row.reps,
    order_in_workout: row.order_in_workout,
    series_id: row.series_id,
    timestamp: row.timestamp,
    exercise: {
      id: row.exercise_id,
      name: row.exercise_name,
      muscle_groups: JSON.parse(row.muscle_groups) as MuscleGroup[],
      equipment: row.equipment as Equipment,
      tracking_type: row.tracking_type as any,
      is_custom: row.is_custom === 1,
      media_paths: JSON.parse(row.media_paths) as string[],
      notes: row.notes,
      created_at: row.created_at,
    },
  }));
}

// ============================================================================
// SECTION 3: EXERCISE QUERIES
// ============================================================================

/**
 * Gets all exercises with parsed JSON fields
 * @returns Array of all exercises
 */
export async function getAllExercises(): Promise<Exercise[]> {
  const db = await getDatabase();
  const results = await db.getAllAsync<{
    id: number;
    name: string;
    muscle_groups: string;
    equipment: string;
    tracking_type: string;
    is_custom: number;
    media_paths: string;
    notes: string;
    created_at: string;
  }>('SELECT * FROM exercises ORDER BY name ASC');

  return results.map((row) => ({
    id: row.id,
    name: row.name,
    muscle_groups: JSON.parse(row.muscle_groups) as MuscleGroup[],
    equipment: row.equipment as Equipment,
    tracking_type: row.tracking_type as any,
    is_custom: row.is_custom === 1,
    media_paths: JSON.parse(row.media_paths) as string[],
    notes: row.notes,
    created_at: row.created_at,
  }));
}

/**
 * Searches exercises by name (case-insensitive)
 * @param query - Search query string
 * @returns Array of matching exercises
 */
export async function searchExercises(query: string): Promise<Exercise[]> {
  const db = await getDatabase();
  const results = await db.getAllAsync<{
    id: number;
    name: string;
    muscle_groups: string;
    equipment: string;
    tracking_type: string;
    is_custom: number;
    media_paths: string;
    notes: string;
    created_at: string;
  }>('SELECT * FROM exercises WHERE name LIKE ? ORDER BY name ASC', [`%${query}%`]);

  return results.map((row) => ({
    id: row.id,
    name: row.name,
    muscle_groups: JSON.parse(row.muscle_groups) as MuscleGroup[],
    equipment: row.equipment as Equipment,
    tracking_type: row.tracking_type as any,
    is_custom: row.is_custom === 1,
    media_paths: JSON.parse(row.media_paths) as string[],
    notes: row.notes,
    created_at: row.created_at,
  }));
}

/**
 * Creates a new exercise
 * @param name - Exercise name
 * @param muscleGroups - Array of muscle groups targeted
 * @param equipment - Equipment type required
 * @param notes - Additional notes (optional)
 * @param mediaPaths - Array of media file paths (optional)
 * @returns The ID of the newly created exercise
 */
export async function createExercise(
  name: string,
  muscleGroups: MuscleGroup[],
  equipment: Equipment,
  notes: string = '',
  mediaPaths: string[] = []
): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO exercises (name, muscle_groups, equipment, is_custom, media_paths, notes, created_at) VALUES (?, ?, ?, 1, ?, ?, datetime("now"))',
    [name, JSON.stringify(muscleGroups), equipment, JSON.stringify(mediaPaths), notes]
  );
  return result.lastInsertRowId;
}

/**
 * Gets recently used exercises based on set history
 * @param limit - Maximum number of exercises to return (default: 10)
 * @returns Array of recently used exercises
 */
export async function getRecentExercises(limit: number = 10): Promise<Exercise[]> {
  const db = await getDatabase();
  const results = await db.getAllAsync<{
    id: number;
    name: string;
    muscle_groups: string;
    equipment: string;
    tracking_type: string;
    is_custom: number;
    media_paths: string;
    notes: string;
    created_at: string;
  }>(
    `SELECT DISTINCT exercises.*
    FROM exercises
    INNER JOIN sets ON exercises.id = sets.exercise_id
    ORDER BY sets.timestamp DESC
    LIMIT ?`,
    [limit]
  );

  return results.map((row) => ({
    id: row.id,
    name: row.name,
    muscle_groups: JSON.parse(row.muscle_groups) as MuscleGroup[],
    equipment: row.equipment as Equipment,
    tracking_type: row.tracking_type as any,
    is_custom: row.is_custom === 1,
    media_paths: JSON.parse(row.media_paths) as string[],
    notes: row.notes,
    created_at: row.created_at,
  }));
}
