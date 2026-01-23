# Fitness Tracker Initial Setup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Initialize Expo app with TypeScript, SQLite database, tab navigation, and basic project structure

**Architecture:** Expo SDK 52 with Expo Router for file-based navigation, expo-sqlite for local database, TypeScript for type safety, tab-based navigation with iOS native components

**Tech Stack:** Expo 52, TypeScript, expo-router, expo-sqlite, React Native

---

## Task 1: Initialize Expo Project

**Files:**
- Create: `package.json`, `app.json`, `tsconfig.json`, `app/_layout.tsx`

**Step 1: Initialize Expo project with TypeScript**

Run:
```bash
npx create-expo-app@latest . --template blank-typescript
```

Expected: Creates new Expo TypeScript project in current directory

**Step 2: Install required dependencies**

Run:
```bash
npx expo install expo-router expo-sqlite react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
npm install zustand
```

Expected: All packages installed successfully

**Step 3: Update app.json for Expo Router**

Modify `app.json`:
```json
{
  "expo": {
    "name": "Fitness Tracker",
    "slug": "fitness-tracker",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.arsenapp.fitnesstracker"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.arsenapp.fitnesstracker"
    },
    "plugins": [
      "expo-router"
    ],
    "scheme": "fitness-tracker"
  }
}
```

**Step 4: Update package.json scripts**

Modify `package.json` to add:
```json
{
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  }
}
```

**Step 5: Verify setup**

Run:
```bash
npx expo start
```

Expected: Expo dev server starts without errors (press 'q' to quit)

**Step 6: Commit**

```bash
git add .
git commit -m "chore: initialize Expo project with TypeScript and Expo Router"
```

---

## Task 2: Create TypeScript Types

**Files:**
- Create: `types/index.ts`

**Step 1: Create types directory and define database types**

Create `types/index.ts`:
```typescript
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
```

**Step 2: Commit**

```bash
git add types/index.ts
git commit -m "feat: add TypeScript types for database models"
```

---

## Task 3: Setup SQLite Database

**Files:**
- Create: `db/database.ts`, `db/schema.ts`

**Step 1: Create database initialization**

Create `db/database.ts`:
```typescript
import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync('fitness_tracker.db');
  return db;
}

export async function initDatabase(): Promise<void> {
  const database = await getDatabase();

  // Create exercises table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      muscle_groups TEXT NOT NULL,
      equipment TEXT NOT NULL,
      is_custom INTEGER NOT NULL DEFAULT 0,
      media_paths TEXT NOT NULL DEFAULT '[]',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create workouts table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      duration_minutes INTEGER,
      notes TEXT NOT NULL DEFAULT '',
      completed INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Create sets table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      weight REAL NOT NULL,
      reps INTEGER NOT NULL,
      order_in_workout INTEGER NOT NULL,
      timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT
    );
  `);

  // Create indexes for better query performance
  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_sets_workout_id ON sets(workout_id);
    CREATE INDEX IF NOT EXISTS idx_sets_exercise_id ON sets(exercise_id);
    CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date);
  `);

  console.log('Database initialized successfully');
}
```

**Step 2: Create schema seed data**

Create `db/schema.ts`:
```typescript
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
```

**Step 3: Test database initialization**

Create a simple test by adding to `app/_layout.tsx`:
```typescript
import { useEffect } from 'react';
import { initDatabase, seedDefaultExercises } from '../db/database';

// In your root component
useEffect(() => {
  async function setupDatabase() {
    try {
      await initDatabase();
      await seedDefaultExercises();
      console.log('Database ready');
    } catch (error) {
      console.error('Database setup failed:', error);
    }
  }
  setupDatabase();
}, []);
```

**Step 4: Verify database setup**

Run:
```bash
npx expo start
```

Expected: Console logs "Database initialized successfully" and "Seeded 10 default exercises"

**Step 5: Commit**

```bash
git add db/database.ts db/schema.ts app/_layout.tsx
git commit -m "feat: setup SQLite database with schema and seed data"
```

---

## Task 4: Create Tab Navigation Structure

**Files:**
- Create: `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/exercises.tsx`, `app/(tabs)/history.tsx`, `app/(tabs)/progress.tsx`

**Step 1: Create root layout**

Create `app/_layout.tsx`:
```typescript
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { initDatabase, seedDefaultExercises } from '../db/database';

export default function RootLayout() {
  useEffect(() => {
    async function setupDatabase() {
      try {
        await initDatabase();
        await seedDefaultExercises();
      } catch (error) {
        console.error('Database setup failed:', error);
      }
    }
    setupDatabase();
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
```

**Step 2: Create tab layout**

Create `app/(tabs)/_layout.tsx`:
```typescript
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: Platform.select({
          ios: {
            backgroundColor: '#F2F2F7',
          },
          default: {},
        }),
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Workout',
          tabBarLabel: 'Workout',
          headerTitle: "Today's Workout",
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: 'Exercises',
          tabBarLabel: 'Exercises',
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarLabel: 'History',
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarLabel: 'Progress',
        }}
      />
    </Tabs>
  );
}
```

**Step 3: Create placeholder tab screens**

Create `app/(tabs)/index.tsx`:
```typescript
import { View, Text, StyleSheet } from 'react-native';

export default function WorkoutScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Workout Screen</Text>
      <Text style={styles.subtext}>Quick logging will go here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 16,
    color: '#666',
  },
});
```

Create `app/(tabs)/exercises.tsx`:
```typescript
import { View, Text, StyleSheet } from 'react-native';

export default function ExercisesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Exercise Library</Text>
      <Text style={styles.subtext}>Browse and manage exercises</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 16,
    color: '#666',
  },
});
```

Create `app/(tabs)/history.tsx`:
```typescript
import { View, Text, StyleSheet } from 'react-native';

export default function HistoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Workout History</Text>
      <Text style={styles.subtext}>View past workouts</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 16,
    color: '#666',
  },
});
```

Create `app/(tabs)/progress.tsx`:
```typescript
import { View, Text, StyleSheet } from 'react-native';

export default function ProgressScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Progress & Stats</Text>
      <Text style={styles.subtext}>Track your PRs and volume</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 16,
    color: '#666',
  },
});
```

**Step 4: Test tab navigation**

Run:
```bash
npx expo start
```

Expected: App loads with 4 tabs at bottom, can navigate between tabs

**Step 5: Commit**

```bash
git add app/
git commit -m "feat: create tab navigation with placeholder screens"
```

---

## Task 5: Create Database Query Functions

**Files:**
- Create: `db/queries.ts`

**Step 1: Create query functions for workouts**

Create `db/queries.ts`:
```typescript
import { getDatabase } from './database';
import type { Exercise, Workout, Set, WorkoutWithSets } from '../types';

// Workout queries
export async function createWorkout(): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO workouts (date, completed) VALUES (?, ?)',
    new Date().toISOString(),
    0
  );
  return result.lastInsertRowId;
}

export async function getWorkout(id: number): Promise<Workout | null> {
  const db = await getDatabase();
  const workout = await db.getFirstAsync<Workout>(
    'SELECT * FROM workouts WHERE id = ?',
    id
  );
  return workout || null;
}

export async function getTodaysWorkout(): Promise<Workout | null> {
  const db = await getDatabase();
  const today = new Date().toISOString().split('T')[0];
  const workout = await db.getFirstAsync<Workout>(
    'SELECT * FROM workouts WHERE date LIKE ? ORDER BY date DESC LIMIT 1',
    `${today}%`
  );
  return workout || null;
}

export async function completeWorkout(id: number, durationMinutes: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE workouts SET completed = ?, duration_minutes = ? WHERE id = ?',
    1,
    durationMinutes,
    id
  );
}

export async function getRecentWorkouts(limit: number = 10): Promise<Workout[]> {
  const db = await getDatabase();
  const workouts = await db.getAllAsync<Workout>(
    'SELECT * FROM workouts WHERE completed = 1 ORDER BY date DESC LIMIT ?',
    limit
  );
  return workouts;
}

// Set queries
export async function addSet(
  workoutId: number,
  exerciseId: number,
  weight: number,
  reps: number
): Promise<number> {
  const db = await getDatabase();

  // Get current max order for this workout
  const maxOrder = await db.getFirstAsync<{ max_order: number | null }>(
    'SELECT MAX(order_in_workout) as max_order FROM sets WHERE workout_id = ?',
    workoutId
  );

  const nextOrder = (maxOrder?.max_order || 0) + 1;

  const result = await db.runAsync(
    'INSERT INTO sets (workout_id, exercise_id, weight, reps, order_in_workout, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
    workoutId,
    exerciseId,
    weight,
    reps,
    nextOrder,
    new Date().toISOString()
  );

  return result.lastInsertRowId;
}

export async function deleteSet(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM sets WHERE id = ?', id);
}

export async function getWorkoutSets(workoutId: number): Promise<(Set & { exercise: Exercise })[]> {
  const db = await getDatabase();
  const sets = await db.getAllAsync<Set & { exercise_name: string; muscle_groups: string }>(
    `SELECT
      sets.*,
      exercises.name as exercise_name,
      exercises.muscle_groups
    FROM sets
    JOIN exercises ON sets.exercise_id = exercises.id
    WHERE sets.workout_id = ?
    ORDER BY sets.order_in_workout`,
    workoutId
  );

  return sets.map(set => ({
    ...set,
    exercise: {
      id: set.exercise_id,
      name: set.exercise_name,
      muscle_groups: JSON.parse(set.muscle_groups),
    } as Exercise,
  }));
}

// Exercise queries
export async function getAllExercises(): Promise<Exercise[]> {
  const db = await getDatabase();
  const exercises = await db.getAllAsync<Omit<Exercise, 'muscle_groups' | 'media_paths'> & {
    muscle_groups: string;
    media_paths: string;
  }>('SELECT * FROM exercises ORDER BY name');

  return exercises.map(ex => ({
    ...ex,
    muscle_groups: JSON.parse(ex.muscle_groups),
    media_paths: JSON.parse(ex.media_paths),
  }));
}

export async function searchExercises(query: string): Promise<Exercise[]> {
  const db = await getDatabase();
  const exercises = await db.getAllAsync<Omit<Exercise, 'muscle_groups' | 'media_paths'> & {
    muscle_groups: string;
    media_paths: string;
  }>(
    'SELECT * FROM exercises WHERE name LIKE ? ORDER BY name',
    `%${query}%`
  );

  return exercises.map(ex => ({
    ...ex,
    muscle_groups: JSON.parse(ex.muscle_groups),
    media_paths: JSON.parse(ex.media_paths),
  }));
}

export async function createExercise(
  name: string,
  muscleGroups: string[],
  equipment: string,
  notes: string = '',
  mediaPaths: string[] = []
): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO exercises (name, muscle_groups, equipment, is_custom, notes, media_paths) VALUES (?, ?, ?, ?, ?, ?)',
    name,
    JSON.stringify(muscleGroups),
    equipment,
    1,
    notes,
    JSON.stringify(mediaPaths)
  );
  return result.lastInsertRowId;
}

export async function getRecentExercises(limit: number = 10): Promise<Exercise[]> {
  const db = await getDatabase();
  const exercises = await db.getAllAsync<Omit<Exercise, 'muscle_groups' | 'media_paths'> & {
    muscle_groups: string;
    media_paths: string;
  }>(
    `SELECT DISTINCT exercises.*
    FROM exercises
    JOIN sets ON exercises.id = sets.exercise_id
    ORDER BY sets.timestamp DESC
    LIMIT ?`,
    limit
  );

  return exercises.map(ex => ({
    ...ex,
    muscle_groups: JSON.parse(ex.muscle_groups),
    media_paths: JSON.parse(ex.media_paths),
  }));
}
```

**Step 2: Commit**

```bash
git add db/queries.ts
git commit -m "feat: add database query functions for workouts, sets, and exercises"
```

---

## Task 6: Create Zustand Store

**Files:**
- Create: `lib/store.ts`

**Step 1: Create global state store**

Create `lib/store.ts`:
```typescript
import { create } from 'zustand';
import type { Workout, Exercise, Set } from '../types';

interface WorkoutState {
  currentWorkout: Workout | null;
  currentWorkoutSets: (Set & { exercise: Exercise })[];
  isWorkoutActive: boolean;

  setCurrentWorkout: (workout: Workout | null) => void;
  setCurrentWorkoutSets: (sets: (Set & { exercise: Exercise })[]) => void;
  setIsWorkoutActive: (active: boolean) => void;

  addSetToWorkout: (set: Set & { exercise: Exercise }) => void;
  removeSetFromWorkout: (setId: number) => void;
  clearWorkout: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set) => ({
  currentWorkout: null,
  currentWorkoutSets: [],
  isWorkoutActive: false,

  setCurrentWorkout: (workout) => set({ currentWorkout: workout }),
  setCurrentWorkoutSets: (sets) => set({ currentWorkoutSets: sets }),
  setIsWorkoutActive: (active) => set({ isWorkoutActive: active }),

  addSetToWorkout: (newSet) =>
    set((state) => ({
      currentWorkoutSets: [...state.currentWorkoutSets, newSet],
    })),

  removeSetFromWorkout: (setId) =>
    set((state) => ({
      currentWorkoutSets: state.currentWorkoutSets.filter(s => s.id !== setId),
    })),

  clearWorkout: () =>
    set({
      currentWorkout: null,
      currentWorkoutSets: [],
      isWorkoutActive: false,
    }),
}));
```

**Step 2: Commit**

```bash
git add lib/store.ts
git commit -m "feat: create Zustand store for workout state management"
```

---

## Task 7: Documentation and Cleanup

**Files:**
- Create: `README.md`
- Modify: `app.json` (remove unused App.tsx if exists)

**Step 1: Create comprehensive README**

Create `README.md`:
```markdown
# Fitness Tracker

Personal gym workout tracking app for iOS and Android.

## Features

- Quick set logging (weight, reps)
- Custom exercise creation with photos/videos
- Exercise library with search
- Workout history
- Progress tracking

## Tech Stack

- **Expo SDK 52** with Expo Router
- **TypeScript**
- **expo-sqlite** for local database
- **Zustand** for state management

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npx expo start
   ```

3. Run on iOS/Android:
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app

## Project Structure

```
/app                    # Expo Router screens
  /(tabs)              # Tab navigation
    /index.tsx         # Today's workout
    /exercises.tsx     # Exercise library
    /history.tsx       # Workout history
    /progress.tsx      # Stats & PRs
/components            # Reusable UI components
/db                    # SQLite schema & queries
/lib                   # Utilities & state management
/types                 # TypeScript interfaces
```

## Database Schema

**exercises:** Exercise definitions with muscle groups, equipment, photos
**workouts:** Workout sessions with date and completion status
**sets:** Individual sets with weight, reps, and exercise reference

## Development

Database is initialized on app startup with 10 default exercises.
All data is stored locally using SQLite.
```

**Step 2: Clean up any unused files**

Run:
```bash
rm -f App.tsx App.js 2>/dev/null || true
```

Expected: Removes any default App files if they exist

**Step 3: Verify project structure**

Run:
```bash
ls -la
```

Expected: Should see app/, db/, lib/, types/, docs/ directories and config files

**Step 4: Final test**

Run:
```bash
npx expo start
```

Expected: App starts successfully, shows 4 tabs, no errors in console

**Step 5: Commit**

```bash
git add .
git commit -m "docs: add README and clean up project structure"
```

---

## Summary

This plan sets up the complete foundation for the fitness tracker app:

1. ✅ Expo project with TypeScript
2. ✅ SQLite database with schema and seed data
3. ✅ Tab navigation structure
4. ✅ TypeScript types for all models
5. ✅ Database query functions
6. ✅ Zustand state management
7. ✅ Documentation

**Next steps after this plan:**
- Implement workout screen with set logging
- Add exercise selector/search
- Create custom exercise form with media capture
- Build history and progress views
- Add exercise suggestions

**Testing approach:**
- Manual testing via Expo Go during development
- Database queries tested through UI interactions
- Will add formal tests in future iterations
