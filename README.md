# Fitness Tracker

Personal gym workout tracking app for iOS and Android.

## Features

- Quick set logging (weight, reps)
- Custom exercise creation with photos/videos
- Exercise library with search
- Workout history
- Progress tracking

## Tech Stack

- **Expo SDK 54** with Expo Router
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
