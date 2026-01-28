import { getServerDatabase } from '../../db/server';
import type { MuscleGroup, Equipment } from '../../types';

// GET /api/sets?workoutId=123 - Get sets for a workout
// GET /api/sets?exerciseId=123&last=true - Get last set for an exercise
export async function GET(request: Request) {
  const url = new URL(request.url);
  const workoutId = url.searchParams.get('workoutId');
  const exerciseId = url.searchParams.get('exerciseId');
  const last = url.searchParams.get('last');

  const db = getServerDatabase();

  if (exerciseId && last === 'true') {
    // Get last set for exercise
    const result = await db`
      SELECT * FROM sets
      WHERE exercise_id = ${parseInt(exerciseId)}
      ORDER BY timestamp DESC
      LIMIT 1
    `;

    if (result.length === 0) {
      return Response.json(null);
    }

    const row = result[0];
    return Response.json({
      id: row.id,
      workout_id: row.workout_id,
      exercise_id: row.exercise_id,
      weight: row.weight,
      reps: row.reps,
      order_in_workout: row.order_in_workout,
      series_id: row.series_id,
      timestamp: row.timestamp.toISOString(),
    });
  }

  if (workoutId) {
    // Get sets with exercise info for a workout
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
      WHERE sets.workout_id = ${parseInt(workoutId)}
      ORDER BY sets.order_in_workout ASC
    `;

    return Response.json(
      results.map((row) => ({
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
          tracking_type: row.tracking_type,
          is_custom: row.is_custom,
          media_paths: row.media_paths as string[],
          notes: row.notes,
          created_at: row.created_at.toISOString(),
        },
      }))
    );
  }

  return Response.json({ error: 'workoutId or exerciseId required' }, { status: 400 });
}

// POST /api/sets - Add a new set
export async function POST(request: Request) {
  const { workoutId, exerciseId, weight, reps, seriesId } = await request.json();

  if (!workoutId || !exerciseId || weight === undefined || reps === undefined) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const db = getServerDatabase();

  // Get the max order for this workout and increment
  const maxOrderResult = await db`
    SELECT MAX(order_in_workout) as max_order
    FROM sets
    WHERE workout_id = ${workoutId}
  `;

  const nextOrder = (maxOrderResult[0]?.max_order ?? -1) + 1;

  const result = await db`
    INSERT INTO sets (workout_id, exercise_id, weight, reps, order_in_workout, series_id, timestamp)
    VALUES (${workoutId}, ${exerciseId}, ${weight}, ${reps}, ${nextOrder}, ${seriesId || null}, NOW())
    RETURNING id
  `;

  return Response.json({ id: result[0].id });
}

// DELETE /api/sets?id=123 - Delete a set
export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return Response.json({ error: 'Set ID required' }, { status: 400 });
  }

  const db = getServerDatabase();
  await db`DELETE FROM sets WHERE id = ${parseInt(id)}`;

  return Response.json({ success: true });
}
