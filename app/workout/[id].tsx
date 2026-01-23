import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { getWorkout, getWorkoutSets } from '../../db/queries';
import type { Workout, Set, Exercise } from '../../types';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [sets, setSets] = useState<(Set & { exercise: Exercise })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkoutDetails();
  }, [id]);

  async function loadWorkoutDetails() {
    try {
      const workoutData = await getWorkout(parseInt(id as string));
      const setsData = await getWorkoutSets(parseInt(id as string));

      setWorkout(workoutData);
      setSets(setsData);
    } catch (error) {
      console.error('Failed to load workout:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  function getSetDisplay(set: Set & { exercise: Exercise }) {
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

  // Group sets by series
  const groupedSets: { seriesId: string | null; sets: (Set & { exercise: Exercise })[] }[] = [];
  const seriesMap = new Map<string | null, (Set & { exercise: Exercise })[]>();

  sets.forEach(set => {
    const key = set.series_id || null;
    if (!seriesMap.has(key)) {
      seriesMap.set(key, []);
    }
    seriesMap.get(key)!.push(set);
  });

  seriesMap.forEach((sets, seriesId) => {
    groupedSets.push({ seriesId, sets });
  });

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!workout) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Workout not found</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerTitle: 'Workout Details' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Workout Header */}
        <View style={styles.header}>
          <Text style={styles.dateText}>{formatDate(workout.date)}</Text>
          <Text style={styles.timeText}>{formatTime(workout.date)}</Text>
          {workout.duration_minutes && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{workout.duration_minutes} min</Text>
            </View>
          )}
        </View>

        {/* Sets grouped by series */}
        {groupedSets.map((group, groupIndex) => (
          <View key={groupIndex} style={styles.groupSection}>
            {group.seriesId && (
              <View style={styles.seriesHeader}>
                <Text style={styles.seriesTitle}>Series {groupIndex + 1}</Text>
              </View>
            )}

            {group.sets.map((set, setIndex) => (
              <View key={set.id} style={styles.setCard}>
                <View style={styles.setHeader}>
                  <Text style={styles.setNumber}>#{set.order_in_workout + 1}</Text>
                  <Text style={styles.exerciseName}>{set.exercise.name}</Text>
                </View>
                <Text style={styles.setDetails}>{getSetDisplay(set)}</Text>
                <Text style={styles.muscleGroups}>{set.exercise.muscle_groups.join(', ')}</Text>
              </View>
            ))}
          </View>
        ))}

        {sets.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No sets recorded</Text>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dateText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  durationBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  durationText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  groupSection: {
    marginBottom: 24,
  },
  seriesHeader: {
    backgroundColor: '#FF9500',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  seriesTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    marginBottom: 8,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  muscleGroups: {
    fontSize: 12,
    color: '#666',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
});
