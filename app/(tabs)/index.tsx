import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useWorkoutStore } from '../../lib/store';
import { createWorkout, completeWorkout, getAllExercises, getRecentExercises } from '../../db/queries';
import type { Exercise } from '../../types';

export default function WorkoutScreen() {
  const router = useRouter();
  const { currentWorkout, currentWorkoutSets, setCurrentWorkout, clearWorkout } = useWorkoutStore();
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [recentExerciseIds, setRecentExerciseIds] = useState<number[]>([]);

  // Load exercises and auto-start workout
  useEffect(() => {
    loadExercises();
    autoStartWorkout();
  }, []);

  async function loadExercises() {
    const exercises = await getAllExercises();
    setAllExercises(exercises);

    const recent = await getRecentExercises(100); // Get all recent
    setRecentExerciseIds(recent.map(e => e.id));
  }

  async function autoStartWorkout() {
    if (!currentWorkout) {
      try {
        const workoutId = await createWorkout();
        const workout = await import('../../db/queries').then(m => m.getWorkout(workoutId));
        if (workout) {
          setCurrentWorkout(workout);
        }
      } catch (error) {
        console.error('Failed to start workout:', error);
      }
    }
  }

  // Sort exercises: recent first, then alphabetically
  const sortedExercises = [...allExercises].sort((a, b) => {
    const aRecent = recentExerciseIds.indexOf(a.id);
    const bRecent = recentExerciseIds.indexOf(b.id);

    if (aRecent !== -1 && bRecent !== -1) {
      return aRecent - bRecent; // Both recent, sort by recency
    }
    if (aRecent !== -1) return -1; // a is recent, b is not
    if (bRecent !== -1) return 1;  // b is recent, a is not
    return a.name.localeCompare(b.name); // Both not recent, alphabetical
  });

  function getSetDisplay(set: any) {
    const trackingType = set.exercise.tracking_type;
    switch (trackingType) {
      case 'weight_reps':
        return `${set.weight}kg × ${set.reps} reps`;
      case 'time':
        return `${Math.floor(set.weight / 60)}:${(set.weight % 60).toString().padStart(2, '0')} min`;
      case 'calories':
        return `${set.weight} kcal`;
      case 'distance':
        return `${set.weight} km`;
      case 'reps_only':
        return `${set.weight} reps`;
      default:
        return `${set.weight} × ${set.reps}`;
    }
  }

  function handleActivityTap(exercise: Exercise) {
    router.push(`/activity/${exercise.id}`);
  }

  async function handleFinishWorkout() {
    if (!currentWorkout) return;

    try {
      const duration = Math.floor((new Date().getTime() - new Date(currentWorkout.date).getTime()) / 1000 / 60);
      await completeWorkout(currentWorkout.id, duration);
      clearWorkout();
    } catch (error) {
      console.error('Failed to finish workout:', error);
      Alert.alert('Error', 'Failed to finish workout');
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Activity Grid */}
        <View style={styles.activitiesSection}>
          <Text style={styles.sectionTitle}>Activities</Text>
          <View style={styles.activityGrid}>
            {sortedExercises.map((exercise, index) => {
              const isRecent = recentExerciseIds.includes(exercise.id);

              return (
                <TouchableOpacity
                  key={exercise.id}
                  style={[
                    styles.activityCard,
                    isRecent && styles.activityCardRecent,
                  ]}
                  onPress={() => handleActivityTap(exercise)}
                >
                  <Text style={styles.activityName} numberOfLines={2}>
                    {exercise.name}
                  </Text>
                  <Text style={styles.activityMuscle} numberOfLines={1}>
                    {exercise.muscle_groups[0]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Logged Sets */}
        {currentWorkoutSets.length > 0 && (
          <View style={styles.setsSection}>
            <Text style={styles.sectionTitle}>Today's Log ({currentWorkoutSets.length})</Text>
            {currentWorkoutSets.map((set, index) => (
              <View key={set.id} style={styles.setCard}>
                <View style={styles.setHeader}>
                  <Text style={styles.setNumber}>#{index + 1}</Text>
                  <Text style={styles.exerciseName}>{set.exercise.name}</Text>
                </View>
                <Text style={styles.setDetails}>{getSetDisplay(set)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Finish Workout Button */}
      {currentWorkoutSets.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.finishButton} onPress={handleFinishWorkout}>
            <Text style={styles.finishButtonText}>Finish Workout</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  activitiesSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000',
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activityCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 12,
    width: '31%',
    minHeight: 70,
    justifyContent: 'space-between',
  },
  activityCardRecent: {
    backgroundColor: '#E3F2FD',
  },
  activityName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  activityMuscle: {
    fontSize: 11,
    color: '#666',
  },
  setsSection: {
    marginBottom: 24,
  },
  setCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  setNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginRight: 8,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  setDetails: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  finishButton: {
    backgroundColor: '#34C759',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  finishButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
