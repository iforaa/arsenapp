import { getServerDatabase } from '../../db/server';

// POST /api/init - Initialize database tables
export async function POST() {
  const db = getServerDatabase();

  // Create exercises table
  await db`
    CREATE TABLE IF NOT EXISTS exercises (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      muscle_groups JSONB NOT NULL,
      equipment TEXT NOT NULL,
      tracking_type TEXT NOT NULL DEFAULT 'weight_reps',
      is_custom BOOLEAN NOT NULL DEFAULT false,
      media_paths JSONB NOT NULL DEFAULT '[]',
      notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Create workouts table
  await db`
    CREATE TABLE IF NOT EXISTS workouts (
      id SERIAL PRIMARY KEY,
      date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      duration_minutes INTEGER,
      notes TEXT NOT NULL DEFAULT '',
      completed BOOLEAN NOT NULL DEFAULT false
    );
  `;

  // Create sets table
  await db`
    CREATE TABLE IF NOT EXISTS sets (
      id SERIAL PRIMARY KEY,
      workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
      exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
      weight REAL NOT NULL,
      reps INTEGER NOT NULL,
      order_in_workout INTEGER NOT NULL,
      series_id TEXT,
      timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Create indexes for better query performance
  await db`CREATE INDEX IF NOT EXISTS idx_sets_workout_id ON sets(workout_id);`;
  await db`CREATE INDEX IF NOT EXISTS idx_sets_exercise_id ON sets(exercise_id);`;
  await db`CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date);`;

  return Response.json({ success: true, message: 'Database initialized' });
}
