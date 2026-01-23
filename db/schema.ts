import { getDatabase } from './database';
import type { TrackingType } from '../types';

export async function seedDefaultExercises(): Promise<void> {
  const db = await getDatabase();

  // Check if we need to add tracking_type column (migration)
  try {
    await db.execAsync(`
      ALTER TABLE exercises ADD COLUMN tracking_type TEXT NOT NULL DEFAULT 'weight_reps';
    `);
    console.log('Added tracking_type column');

    // Update existing Pull Up to be reps_only
    await db.runAsync(
      'UPDATE exercises SET tracking_type = ? WHERE name = ?',
      'reps_only',
      'Pull Up'
    );
  } catch (e) {
    // Column already exists, that's fine
  }

  const defaultExercises: Array<{
    name: string;
    muscle_groups: string[];
    equipment: string;
    tracking_type: TrackingType;
  }> = [
    // Strength - Weight + Reps
    { name: 'Bench Press', muscle_groups: ['chest', 'triceps'], equipment: 'barbell', tracking_type: 'weight_reps' },
    { name: 'Squat', muscle_groups: ['legs', 'glutes'], equipment: 'barbell', tracking_type: 'weight_reps' },
    { name: 'Deadlift', muscle_groups: ['back', 'legs', 'glutes'], equipment: 'barbell', tracking_type: 'weight_reps' },
    { name: 'Overhead Press', muscle_groups: ['shoulders', 'triceps'], equipment: 'barbell', tracking_type: 'weight_reps' },
    { name: 'Barbell Row', muscle_groups: ['back', 'biceps'], equipment: 'barbell', tracking_type: 'weight_reps' },
    { name: 'Dumbbell Curl', muscle_groups: ['biceps'], equipment: 'dumbbell', tracking_type: 'weight_reps' },
    { name: 'Tricep Pushdown', muscle_groups: ['triceps'], equipment: 'cable', tracking_type: 'weight_reps' },
    { name: 'Lat Pulldown', muscle_groups: ['back'], equipment: 'cable', tracking_type: 'weight_reps' },
    { name: 'Leg Press', muscle_groups: ['legs', 'glutes'], equipment: 'machine', tracking_type: 'weight_reps' },

    // Bodyweight - Reps Only
    { name: 'Pull Up', muscle_groups: ['back', 'biceps'], equipment: 'bodyweight', tracking_type: 'reps_only' },
    { name: 'Push Up', muscle_groups: ['chest', 'triceps'], equipment: 'bodyweight', tracking_type: 'reps_only' },
    { name: 'Dips', muscle_groups: ['chest', 'triceps'], equipment: 'bodyweight', tracking_type: 'reps_only' },

    // Time-based
    { name: 'Plank', muscle_groups: ['core'], equipment: 'bodyweight', tracking_type: 'time' },
    { name: 'Wall Sit', muscle_groups: ['legs'], equipment: 'bodyweight', tracking_type: 'time' },
    { name: 'Dead Hang', muscle_groups: ['back'], equipment: 'bodyweight', tracking_type: 'time' },

    // Cardio - Calories
    { name: 'Stationary Bike', muscle_groups: ['cardio', 'legs'], equipment: 'machine', tracking_type: 'calories' },
    { name: 'Treadmill', muscle_groups: ['cardio', 'legs'], equipment: 'machine', tracking_type: 'calories' },
    { name: 'Rowing Machine', muscle_groups: ['cardio', 'back'], equipment: 'machine', tracking_type: 'calories' },
    { name: 'Elliptical', muscle_groups: ['cardio', 'legs'], equipment: 'machine', tracking_type: 'calories' },

    // Cardio - Distance
    { name: 'Running', muscle_groups: ['cardio', 'legs'], equipment: 'other', tracking_type: 'distance' },
    { name: 'Cycling', muscle_groups: ['cardio', 'legs'], equipment: 'other', tracking_type: 'distance' },
    { name: 'Swimming', muscle_groups: ['cardio'], equipment: 'other', tracking_type: 'distance' },
  ];

  // Insert exercises that don't exist yet
  let addedCount = 0;
  for (const exercise of defaultExercises) {
    const existing = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM exercises WHERE name = ?',
      exercise.name
    );

    if (!existing || existing.count === 0) {
      await db.runAsync(
        'INSERT INTO exercises (name, muscle_groups, equipment, tracking_type, is_custom) VALUES (?, ?, ?, ?, ?)',
        exercise.name,
        JSON.stringify(exercise.muscle_groups),
        exercise.equipment,
        exercise.tracking_type,
        0
      );
      addedCount++;
    }
  }

  if (addedCount > 0) {
    console.log(`Seeded ${addedCount} new exercises`);
  } else {
    console.log('All exercises already exist');
  }
}
