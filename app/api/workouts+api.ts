import { getServerDatabase } from '../../db/server';

// GET /api/workouts - Get recent workouts
// GET /api/workouts?id=123 - Get single workout
export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const limit = url.searchParams.get('limit') || '10';

  const db = getServerDatabase();

  if (id) {
    // Get single workout
    const result = await db`
      SELECT * FROM workouts WHERE id = ${parseInt(id)}
    `;

    if (result.length === 0) {
      return Response.json({ error: 'Workout not found' }, { status: 404 });
    }

    const row = result[0];
    return Response.json({
      id: row.id,
      date: row.date.toISOString(),
      duration_minutes: row.duration_minutes,
      notes: row.notes,
      completed: row.completed,
    });
  }

  // Get recent workouts
  const results = await db`
    SELECT * FROM workouts
    ORDER BY date DESC
    LIMIT ${parseInt(limit)}
  `;

  return Response.json(
    results.map((row) => ({
      id: row.id,
      date: row.date.toISOString(),
      duration_minutes: row.duration_minutes,
      notes: row.notes,
      completed: row.completed,
    }))
  );
}

// POST /api/workouts - Create new workout
export async function POST() {
  const db = getServerDatabase();

  const result = await db`
    INSERT INTO workouts (date, completed)
    VALUES (NOW(), false)
    RETURNING *
  `;

  const row = result[0];
  return Response.json({
    id: row.id,
    date: row.date.toISOString(),
    duration_minutes: row.duration_minutes,
    notes: row.notes,
    completed: row.completed,
  });
}

// PUT /api/workouts - Complete workout
export async function PUT(request: Request) {
  const { id, duration_minutes } = await request.json();

  if (!id) {
    return Response.json({ error: 'Workout ID required' }, { status: 400 });
  }

  const db = getServerDatabase();

  await db`
    UPDATE workouts
    SET completed = true, duration_minutes = ${duration_minutes}
    WHERE id = ${id}
  `;

  return Response.json({ success: true });
}

// DELETE /api/workouts?id=123 - Delete workout
export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return Response.json({ error: 'Workout ID required' }, { status: 400 });
  }

  const db = getServerDatabase();

  // Delete sets first (foreign key constraint)
  await db`DELETE FROM sets WHERE workout_id = ${parseInt(id)}`;
  // Then delete the workout
  await db`DELETE FROM workouts WHERE id = ${parseInt(id)}`;

  return Response.json({ success: true });
}
