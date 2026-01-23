import { getDatabase } from './database';

export async function seedDefaultExercises(): Promise<void> {
  const db = await getDatabase();

  // Check if exercises already exist
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM exercises'
  );

  if (result && result.count > 0) {
    console.log('Exercises already seeded');
    return;
  }

  const defaultExercises = [
    { name: 'Bench Press', muscle_groups: ['chest', 'triceps'], equipment: 'barbell' },
    { name: 'Squat', muscle_groups: ['legs', 'glutes'], equipment: 'barbell' },
    { name: 'Deadlift', muscle_groups: ['back', 'legs', 'glutes'], equipment: 'barbell' },
    { name: 'Overhead Press', muscle_groups: ['shoulders', 'triceps'], equipment: 'barbell' },
    { name: 'Barbell Row', muscle_groups: ['back', 'biceps'], equipment: 'barbell' },
    { name: 'Pull Up', muscle_groups: ['back', 'biceps'], equipment: 'bodyweight' },
    { name: 'Dumbbell Curl', muscle_groups: ['biceps'], equipment: 'dumbbell' },
    { name: 'Tricep Pushdown', muscle_groups: ['triceps'], equipment: 'cable' },
    { name: 'Lat Pulldown', muscle_groups: ['back'], equipment: 'cable' },
    { name: 'Leg Press', muscle_groups: ['legs', 'glutes'], equipment: 'machine' },
  ];

  for (const exercise of defaultExercises) {
    await db.runAsync(
      'INSERT INTO exercises (name, muscle_groups, equipment, is_custom) VALUES (?, ?, ?, ?)',
      exercise.name,
      JSON.stringify(exercise.muscle_groups),
      exercise.equipment,
      0
    );
  }

  console.log(`Seeded ${defaultExercises.length} default exercises`);
}
