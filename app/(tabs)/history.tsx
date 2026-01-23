import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { getRecentWorkouts, getWorkoutSets } from '../../db/queries';
import type { Workout } from '../../types';

export default function HistoryScreen() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadWorkouts();
    }, [])
  );

  async function loadWorkouts() {
    try {
      setLoading(true);
      const recentWorkouts = await getRecentWorkouts(50);
      setWorkouts(recentWorkouts);
    } catch (error) {
      console.error('Failed to load workouts:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if it's today
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }

    // Check if it's yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    // Otherwise format as "Mon, Jan 24"
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
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

  function handleWorkoutPress(workout: Workout) {
    router.push(`/workout/${workout.id}`);
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (workouts.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyTitle}>No Workouts Yet</Text>
        <Text style={styles.emptySubtext}>Complete your first workout to see it here!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.workoutCard}
            onPress={() => handleWorkoutPress(item)}
            activeOpacity={0.7}
          >
            <View style={styles.workoutHeader}>
              <View>
                <Text style={styles.workoutDate}>{formatDate(item.date)}</Text>
                <Text style={styles.workoutTime}>{formatTime(item.date)}</Text>
              </View>
              <View style={styles.workoutStats}>
                {item.duration_minutes && (
                  <View style={styles.statBadge}>
                    <Text style={styles.statValue}>{item.duration_minutes}</Text>
                    <Text style={styles.statLabel}>min</Text>
                  </View>
                )}
              </View>
            </View>

            {item.notes && (
              <Text style={styles.workoutNotes} numberOfLines={2}>
                {item.notes}
              </Text>
            )}

            <View style={styles.workoutFooter}>
              <Text style={styles.completedBadge}>✓ Completed</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  listContent: {
    padding: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  workoutCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  workoutDate: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  workoutTime: {
    fontSize: 14,
    color: '#666',
  },
  workoutStats: {
    flexDirection: 'row',
    gap: 8,
  },
  statBadge: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  workoutNotes: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  workoutFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  completedBadge: {
    fontSize: 13,
    color: '#34C759',
    fontWeight: '600',
  },
});
