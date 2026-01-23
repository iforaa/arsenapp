# Fitness Tracker App Design

**Date:** 2026-01-24
**Purpose:** Personal gym workout tracking app with exercise suggestions and trainer exercise capture

## Problem Statement

Need a fitness app that solves:
- Quick logging of sets (weight, reps) during gym sessions
- Capturing and remembering trainer's unique/unfamiliar exercises
- Getting exercise variety suggestions to avoid plateaus
- Tracking progress and personal records over time

**User Profile:** Advanced lifter with good exercise knowledge, has a trainer who introduces unique exercises, needs structure and variety.

## Tech Stack

- **Expo SDK 52** with Expo Router (file-based navigation)
- **TypeScript** for type safety
- **expo-sqlite** for local database
- **React Native Paper** or native iOS components
- **expo-image-picker** and **expo-camera** for media capture
- **expo-file-system** for local photo/video storage
- **Zustand** for state management

## Architecture

### Project Structure
```
/app                    # Expo Router screens
  /(tabs)              # Tab navigation
    /index.tsx         # Today's workout (quick log)
    /exercises.tsx     # Exercise library
    /history.tsx       # Workout history
    /progress.tsx      # Stats & PRs
  /workout/[id].tsx    # Active workout session
  /exercise/[id].tsx   # Exercise detail with photos
/components            # Reusable UI components
/db                    # SQLite schema & queries
/lib                   # Exercise matching logic, utils
/types                 # TypeScript interfaces
```

### Database Schema

**exercises**
- `id` (primary key)
- `name` (e.g., "Bench Press", "Trainer's Cable Thing")
- `muscle_groups` (JSON array: ["chest", "triceps"])
- `equipment` (e.g., "barbell", "cable")
- `is_custom` (boolean - true for trainer's exercises)
- `media_paths` (JSON array of photo/video file paths)
- `notes` (text field for form cues)
- `created_at`

**workouts**
- `id` (primary key)
- `date` (timestamp)
- `duration_minutes` (nullable)
- `notes` (optional workout notes)
- `completed` (boolean)

**sets**
- `id` (primary key)
- `workout_id` (foreign key)
- `exercise_id` (foreign key)
- `weight` (decimal)
- `reps` (integer)
- `order_in_workout` (integer - sequence)
- `timestamp` (when logged it)

## Core User Flows

### Flow 1: Quick Logging (Primary Use Case)

1. Open app → lands on "Today's Workout" tab
2. If no active workout, shows "Start Workout" button
3. Tap start → creates new workout record, shows empty exercise list
4. Tap "+ Add Set" → opens exercise selector (search + recent exercises)
5. Select exercise → quick input screen: weight field, reps field, "Log" button
6. Tap "Log" → set saved, returns to workout view showing logged sets
7. Repeat steps 4-6 for each set
8. Swipe to delete mistakes, tap set to edit
9. "Finish Workout" button at bottom

### Flow 2: Adding Trainer's Exercise

1. During workout, tap "+ Add Set"
2. Search doesn't find exercise → "Create New Exercise" button appears
3. Opens form: name, muscle groups (multi-select chips), equipment
4. "Add Photo/Video" button → camera or gallery picker
5. Can add multiple photos/videos showing the movement
6. Save → exercise added to library, can immediately log a set

### Flow 3: Exercise Suggestions

When you've done chest exercises today and tap "+ Add Set", the app shows:
- **Recent exercises** (top of list)
- **Suggested**: "You trained chest. Try these: Incline DB Press, Cable Flies..."
- **All exercises** (searchable below)

**Suggestion Logic:** Analyzes muscle groups from current workout, suggests exercises hitting same or complementary muscles you haven't done today.

## Key Features

### Phase 1 (MVP)
- Quick set logging with weight/reps
- Create custom exercises with photos
- Basic exercise library with search
- Workout history view
- Native iOS navigation feel

### Phase 2 (Post-MVP)
- Exercise suggestions based on current workout
- Personal record tracking
- Progress charts (volume over time)
- Pre-built workout templates
- Export workout data

## Design Decisions

**Why Local-First (SQLite)?**
- Personal app, no need for cloud sync
- Faster, more private
- No backend costs
- Offline-first by default

**Why Expo Router?**
- Native navigation patterns (stack, tabs, modals)
- File-based routing is intuitive
- Good iOS integration with native components

**Why Simple Schema?**
- Normalized for easy queries
- JSON fields for flexibility (muscle groups, media)
- Timestamps enable all analytics needs
- Easy to extend later

## Success Criteria

- Log a complete workout in under 2 minutes
- Add trainer's new exercise with photo in under 30 seconds
- Exercise suggestions feel relevant and helpful
- Never lose workout data
- Native iOS feel with smooth animations
