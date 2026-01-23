import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useWorkoutStore } from '../../lib/store';
import { getAllExercises, addSet, createWorkout } from '../../db/queries';
import type { Exercise } from '../../types';

export default function ActivityScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { currentWorkout, currentWorkoutSets, setCurrentWorkout, addSetToWorkout } = useWorkoutStore();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [value1, setValue1] = useState('');
  const [value2, setValue2] = useState('');

  useEffect(() => {
    loadExercise();
    autoStartWorkout();
  }, [id]);

  async function loadExercise() {
    const exercises = await getAllExercises();
    const found = exercises.find(e => e.id === parseInt(id as string));
    if (found) {
      setExercise(found);
    }
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

  function getInputConfig(trackingType: string) {
    switch (trackingType) {
      case 'weight_reps':
        return {
          label1: 'Weight',
          unit1: 'kg',
          placeholder1: '0',
          label2: 'Reps',
          unit2: '',
          placeholder2: '0'
        };
      case 'time':
        return {
          label1: 'Duration',
          unit1: 'seconds',
          placeholder1: '0',
          label2: null,
          unit2: null,
          placeholder2: null
        };
      case 'calories':
        return {
          label1: 'Calories',
          unit1: 'kcal',
          placeholder1: '0',
          label2: null,
          unit2: null,
          placeholder2: null
        };
      case 'distance':
        return {
          label1: 'Distance',
          unit1: 'km',
          placeholder1: '0',
          label2: null,
          unit2: null,
          placeholder2: null
        };
      case 'reps_only':
        return {
          label1: 'Reps',
          unit1: '',
          placeholder1: '0',
          label2: null,
          unit2: null,
          placeholder2: null
        };
      default:
        return {
          label1: 'Value',
          unit1: '',
          placeholder1: '0',
          label2: 'Reps',
          unit2: '',
          placeholder2: '0'
        };
    }
  }

  function getSetDisplay(weight: number, reps: number, trackingType: string) {
    switch (trackingType) {
      case 'weight_reps':
        return `${weight}kg × ${reps} reps`;
      case 'time':
        return `${Math.floor(weight / 60)}:${(weight % 60).toString().padStart(2, '0')} min`;
      case 'calories':
        return `${weight} kcal`;
      case 'distance':
        return `${weight} km`;
      case 'reps_only':
        return `${weight} reps`;
      default:
        return `${weight} × ${reps}`;
    }
  }

  async function handleLogSet() {
    if (!currentWorkout || !exercise) {
      Alert.alert('Error', 'No active workout');
      return;
    }
    if (!value1) {
      Alert.alert('Error', `Please enter ${config.label1.toLowerCase()}`);
      return;
    }

    const needsValue2 = exercise.tracking_type === 'weight_reps';
    if (needsValue2 && !value2) {
      Alert.alert('Error', 'Please enter reps');
      return;
    }

    try {
      const weight = parseFloat(value1);
      const reps = needsValue2 ? parseInt(value2) : 0;

      const setId = await addSet(currentWorkout.id, exercise.id, weight, reps);

      addSetToWorkout({
        id: setId,
        workout_id: currentWorkout.id,
        exercise_id: exercise.id,
        weight: weight,
        reps: reps,
        order_in_workout: currentWorkoutSets.length + 1,
        timestamp: new Date().toISOString(),
        exercise: exercise,
      });

      setValue1('');
      setValue2('');
    } catch (error) {
      console.error('Failed to add set:', error);
      Alert.alert('Error', 'Failed to log');
    }
  }

  if (!exercise) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const config = getInputConfig(exercise.tracking_type);
  const todaysSets = currentWorkoutSets.filter(s => s.exercise_id === exercise.id);

  return (
    <>
      <Stack.Screen options={{ headerTitle: exercise.name }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Muscle Groups */}
        <Text style={styles.subtitle}>{exercise.muscle_groups.join(', ')}</Text>

        {/* Input Form */}
        <View style={styles.inputSection}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{config.label1}</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={value1}
              onChangeText={setValue1}
              keyboardType="decimal-pad"
              placeholder={config.placeholder1}
              autoFocus
            />
            {config.unit1 && <Text style={styles.unit}>{config.unit1}</Text>}
          </View>
        </View>

        {config.label2 && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{config.label2}</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={value2}
                onChangeText={setValue2}
                keyboardType="number-pad"
                placeholder={config.placeholder2 || '0'}
              />
              {config.unit2 && <Text style={styles.unit}>{config.unit2}</Text>}
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.logButton} onPress={handleLogSet}>
          <Text style={styles.logButtonText}>Log Set</Text>
        </TouchableOpacity>
      </View>

      {/* Today's Sets */}
      {todaysSets.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Today ({todaysSets.length})</Text>
          {todaysSets.map((set, index) => (
            <View key={set.id} style={styles.setCard}>
              <Text style={styles.setNumber}>#{index + 1}</Text>
              <Text style={styles.setDetails}>{getSetDisplay(set.weight, set.reps, exercise.tracking_type)}</Text>
            </View>
          ))}
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
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  inputSection: {
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: '600',
  },
  unit: {
    fontSize: 18,
    color: '#666',
    marginLeft: 12,
    fontWeight: '500',
  },
  logButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  historySection: {
    marginBottom: 24,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  setCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  setNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  setDetails: {
    fontSize: 16,
    color: '#000',
  },
});
