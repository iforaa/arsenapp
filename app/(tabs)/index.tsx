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
