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
