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
  const db = getDatabase();
  const result = await db`
    INSERT INTO workouts (date, completed)
    VALUES (NOW(), false)
    RETURNING id
  `;
  return result[0].id;
}

/**
 * Gets a single workout by ID
 * @param id - The workout ID
 * @returns The workout or null if not found
 */
export async function getWorkout(id: number): Promise<Workout | null> {
  const db = getDatabase();
  const result = await db`
    SELECT * FROM workouts WHERE id = ${id}
  `;

  if (result.length === 0) return null;

  const row = result[0];
  return {
    id: row.id,
    date: row.date.toISOString(),
    duration_minutes: row.duration_minutes,
    notes: row.notes,
    completed: row.completed,
  };
}

/**
 * Gets today's workout if it exists
 * @returns Today's workout or null
 */
export async function getTodaysWorkout(): Promise<Workout | null> {
  const db = getDatabase();
  const result = await db`
    SELECT * FROM workouts
    WHERE DATE(date) = CURRENT_DATE
    ORDER BY date DESC
    LIMIT 1
  `;

  if (result.length === 0) return null;

  const row = result[0];
  return {
    id: row.id,
    date: row.date.toISOString(),
    duration_minutes: row.duration_minutes,
    notes: row.notes,
    completed: row.completed,
  };
}

/**
 * Marks a workout as complete with the given duration
 * @param id - The workout ID
 * @param durationMinutes - Duration of the workout in minutes
 */
export async function completeWorkout(id: number, durationMinutes: number): Promise<void> {
  const db = getDatabase();
  await db`
    UPDATE workouts
    SET completed = true, duration_minutes = ${durationMinutes}
    WHERE id = ${id}
  `;
}

/**
 * Deletes a workout and all its sets
 * @param id - The workout ID
 */
export async function deleteWorkout(id: number): Promise<void> {
  const db = getDatabase();
  // Delete sets first (foreign key constraint)
  await db`DELETE FROM sets WHERE workout_id = ${id}`;
  // Then delete the workout
  await db`DELETE FROM workouts WHERE id = ${id}`;
}

/**
 * Gets recent workouts (both completed and in-progress)
 * @param limit - Maximum number of workouts to return (default: 10)
 * @returns Array of recent workouts
 */
export async function getRecentWorkouts(limit: number = 10): Promise<Workout[]> {
  const db = getDatabase();
  const results = await db`
    SELECT * FROM workouts
    ORDER BY date DESC
    LIMIT ${limit}
  `;

  return results.map((row) => ({
    id: row.id,
    date: row.date.toISOString(),
    duration_minutes: row.duration_minutes,
    notes: row.notes,
    completed: row.completed,
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
  const db = getDatabase();

  // Get the max order for this workout and increment
  const maxOrderResult = await db`
    SELECT MAX(order_in_workout) as max_order
    FROM sets
    WHERE workout_id = ${workoutId}
  `;

  const nextOrder = (maxOrderResult[0]?.max_order ?? -1) + 1;

  const result = await db`
    INSERT INTO sets (workout_id, exercise_id, weight, reps, order_in_workout, series_id, timestamp)
    VALUES (${workoutId}, ${exerciseId}, ${weight}, ${reps}, ${nextOrder}, ${seriesId}, NOW())
    RETURNING id
  `;

  return result[0].id;
}

/**
 * Deletes a set by ID
 * @param id - The set ID
 */
export async function deleteSet(id: number): Promise<void> {
  const db = getDatabase();
  await db`DELETE FROM sets WHERE id = ${id}`;
}

/**
 * Gets the most recent set for a specific exercise
 * @param exerciseId - The exercise ID
 * @returns The most recent set or null if no sets exist
 */
export async function getLastSetForExercise(exerciseId: number): Promise<Set | null> {
  const db = getDatabase();
  const result = await db`
    SELECT * FROM sets
    WHERE exercise_id = ${exerciseId}
    ORDER BY timestamp DESC
    LIMIT 1
  `;

  if (result.length === 0) return null;

  const row = result[0];
  return {
    id: row.id,
    workout_id: row.workout_id,
    exercise_id: row.exercise_id,
    weight: row.weight,
    reps: row.reps,
    order_in_workout: row.order_in_workout,
    series_id: row.series_id,
    timestamp: row.timestamp.toISOString(),
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
  const db = getDatabase();
  const results = await db`
    SELECT
      sets.*,
      exercises.id as exercise_id,
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
    WHERE sets.workout_id = ${workoutId}
    ORDER BY sets.order_in_workout ASC
  `;

  return results.map((row) => ({
    id: row.id,
    workout_id: row.workout_id,
    exercise_id: row.exercise_id,
    weight: row.weight,
    reps: row.reps,
    order_in_workout: row.order_in_workout,
    series_id: row.series_id,
    timestamp: row.timestamp.toISOString(),
    exercise: {
      id: row.exercise_id,
      name: row.exercise_name,
      muscle_groups: row.muscle_groups as MuscleGroup[],
      equipment: row.equipment as Equipment,
      tracking_type: row.tracking_type as any,
      is_custom: row.is_custom,
      media_paths: row.media_paths as string[],
      notes: row.notes,
      created_at: row.created_at.toISOString(),
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
  const db = getDatabase();
  const results = await db`
    SELECT * FROM exercises ORDER BY name ASC
  `;

  return results.map((row) => ({
    id: row.id,
    name: row.name,
    muscle_groups: row.muscle_groups as MuscleGroup[],
    equipment: row.equipment as Equipment,
    tracking_type: row.tracking_type as any,
    is_custom: row.is_custom,
    media_paths: row.media_paths as string[],
    notes: row.notes,
    created_at: row.created_at.toISOString(),
  }));
}

/**
 * Searches exercises by name (case-insensitive)
 * @param query - Search query string
 * @returns Array of matching exercises
 */
export async function searchExercises(query: string): Promise<Exercise[]> {
  const db = getDatabase();
  const results = await db`
    SELECT * FROM exercises
    WHERE name ILIKE ${'%' + query + '%'}
    ORDER BY name ASC
  `;

  return results.map((row) => ({
    id: row.id,
    name: row.name,
    muscle_groups: row.muscle_groups as MuscleGroup[],
    equipment: row.equipment as Equipment,
    tracking_type: row.tracking_type as any,
    is_custom: row.is_custom,
    media_paths: row.media_paths as string[],
    notes: row.notes,
    created_at: row.created_at.toISOString(),
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
  const db = getDatabase();
  const result = await db`
    INSERT INTO exercises (name, muscle_groups, equipment, is_custom, media_paths, notes, created_at)
    VALUES (${name}, ${JSON.stringify(muscleGroups)}, ${equipment}, true, ${JSON.stringify(mediaPaths)}, ${notes}, NOW())
    RETURNING id
  `;
  return result[0].id;
}

/**
 * Gets recently used exercises based on set history
 * @param limit - Maximum number of exercises to return (default: 10)
 * @returns Array of recently used exercises
 */
export async function getRecentExercises(limit: number = 10): Promise<Exercise[]> {
  const db = getDatabase();
  const results = await db`
    SELECT exercises.*, MAX(sets.timestamp) as last_used
    FROM exercises
    INNER JOIN sets ON exercises.id = sets.exercise_id
    GROUP BY exercises.id
    ORDER BY last_used DESC
    LIMIT ${limit}
  `;

  return results.map((row) => ({
    id: row.id,
    name: row.name,
    muscle_groups: row.muscle_groups as MuscleGroup[],
    equipment: row.equipment as Equipment,
    tracking_type: row.tracking_type as any,
    is_custom: row.is_custom,
    media_paths: row.media_paths as string[],
    notes: row.notes,
    created_at: row.created_at.toISOString(),
  }));
}
