import type { Exercise, Workout, Set, MuscleGroup, Equipment } from '../types';

// Determine base URL based on environment
function getBaseUrl() {
  // In development, use localhost
  // In production, this will be the deployed URL
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:8081';
}

const BASE_URL = getBaseUrl();

// ============================================================================
// WORKOUT API
// ============================================================================

export async function createWorkout(): Promise<Workout> {
  const response = await fetch(`${BASE_URL}/api/workouts`, {
    method: 'POST',
  });
  return response.json();
}

export async function getWorkout(id: number): Promise<Workout | null> {
  const response = await fetch(`${BASE_URL}/api/workouts?id=${id}`);
  if (response.status === 404) return null;
  return response.json();
}

export async function completeWorkout(id: number, durationMinutes: number): Promise<void> {
  await fetch(`${BASE_URL}/api/workouts`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, duration_minutes: durationMinutes }),
  });
}

export async function deleteWorkout(id: number): Promise<void> {
  await fetch(`${BASE_URL}/api/workouts?id=${id}`, {
    method: 'DELETE',
  });
}

export async function getRecentWorkouts(limit: number = 10): Promise<Workout[]> {
  const response = await fetch(`${BASE_URL}/api/workouts?limit=${limit}`);
  return response.json();
}

// ============================================================================
// SET API
// ============================================================================

export async function addSet(
  workoutId: number,
  exerciseId: number,
  weight: number,
  reps: number,
  seriesId?: string | null
): Promise<number> {
  const response = await fetch(`${BASE_URL}/api/sets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workoutId, exerciseId, weight, reps, seriesId }),
  });
  const data = await response.json();
  return data.id;
}

export async function deleteSet(id: number): Promise<void> {
  await fetch(`${BASE_URL}/api/sets?id=${id}`, {
    method: 'DELETE',
  });
}

export async function getLastSetForExercise(exerciseId: number): Promise<Set | null> {
  const response = await fetch(`${BASE_URL}/api/sets?exerciseId=${exerciseId}&last=true`);
  return response.json();
}

export async function getWorkoutSets(
  workoutId: number
): Promise<(Set & { exercise: Exercise })[]> {
  const response = await fetch(`${BASE_URL}/api/sets?workoutId=${workoutId}`);
  return response.json();
}

// ============================================================================
// EXERCISE API
// ============================================================================

export async function getAllExercises(): Promise<Exercise[]> {
  const response = await fetch(`${BASE_URL}/api/exercises`);
  return response.json();
}

export async function searchExercises(query: string): Promise<Exercise[]> {
  const response = await fetch(`${BASE_URL}/api/exercises?search=${encodeURIComponent(query)}`);
  return response.json();
}

export async function createExercise(
  name: string,
  muscleGroups: MuscleGroup[],
  equipment: Equipment,
  notes: string = '',
  mediaPaths: string[] = []
): Promise<number> {
  const response = await fetch(`${BASE_URL}/api/exercises`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, muscleGroups, equipment, notes, mediaPaths }),
  });
  const data = await response.json();
  return data.id;
}

export async function getRecentExercises(limit: number = 10): Promise<Exercise[]> {
  const response = await fetch(`${BASE_URL}/api/exercises?recent=true&limit=${limit}`);
  return response.json();
}

// ============================================================================
// INIT API
// ============================================================================

export async function initDatabase(): Promise<void> {
  await fetch(`${BASE_URL}/api/init`, {
    method: 'POST',
  });
}

export async function seedDefaultExercises(): Promise<void> {
  await fetch(`${BASE_URL}/api/seed`, {
    method: 'POST',
  });
}
