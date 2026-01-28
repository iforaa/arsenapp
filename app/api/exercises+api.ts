import { getServerDatabase } from '../../db/server';
import type { MuscleGroup, Equipment } from '../../types';

// GET /api/exercises - Get all exercises
// GET /api/exercises?search=query - Search exercises
// GET /api/exercises?recent=true&limit=10 - Get recent exercises
export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = url.searchParams.get('search');
  const recent = url.searchParams.get('recent');
  const limit = url.searchParams.get('limit') || '10';

  const db = getServerDatabase();

  if (search) {
    // Search exercises by name
    const results = await db`
      SELECT * FROM exercises
      WHERE name ILIKE ${'%' + search + '%'}
      ORDER BY name ASC
    `;

    return Response.json(
      results.map((row) => ({
        id: row.id,
        name: row.name,
        muscle_groups: row.muscle_groups as MuscleGroup[],
        equipment: row.equipment as Equipment,
        tracking_type: row.tracking_type,
        is_custom: row.is_custom,
        media_paths: row.media_paths as string[],
        notes: row.notes,
        created_at: row.created_at.toISOString(),
      }))
    );
  }

  if (recent === 'true') {
    // Get recently used exercises
    const results = await db`
      SELECT exercises.*, MAX(sets.timestamp) as last_used
      FROM exercises
      INNER JOIN sets ON exercises.id = sets.exercise_id
      GROUP BY exercises.id
      ORDER BY last_used DESC
      LIMIT ${parseInt(limit)}
    `;

    return Response.json(
      results.map((row) => ({
        id: row.id,
        name: row.name,
        muscle_groups: row.muscle_groups as MuscleGroup[],
        equipment: row.equipment as Equipment,
        tracking_type: row.tracking_type,
        is_custom: row.is_custom,
        media_paths: row.media_paths as string[],
        notes: row.notes,
        created_at: row.created_at.toISOString(),
      }))
    );
  }

  // Get all exercises
  const results = await db`
    SELECT * FROM exercises ORDER BY name ASC
  `;

  return Response.json(
    results.map((row) => ({
      id: row.id,
      name: row.name,
      muscle_groups: row.muscle_groups as MuscleGroup[],
      equipment: row.equipment as Equipment,
      tracking_type: row.tracking_type,
      is_custom: row.is_custom,
      media_paths: row.media_paths as string[],
      notes: row.notes,
      created_at: row.created_at.toISOString(),
    }))
  );
}

// POST /api/exercises - Create new exercise
export async function POST(request: Request) {
  const { name, muscleGroups, equipment, notes, mediaPaths } = await request.json();

  if (!name || !muscleGroups || !equipment) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const db = getServerDatabase();

  const result = await db`
    INSERT INTO exercises (name, muscle_groups, equipment, is_custom, media_paths, notes, created_at)
    VALUES (${name}, ${JSON.stringify(muscleGroups)}, ${equipment}, true, ${JSON.stringify(mediaPaths || [])}, ${notes || ''}, NOW())
    RETURNING id
  `;

  return Response.json({ id: result[0].id });
}
