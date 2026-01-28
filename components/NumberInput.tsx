import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, borderRadius, spacing, typography } from '../lib/theme';

interface NumberInputProps {
  label: string;
  value: string;
  onChangeValue: (value: string) => void;
  unit?: string;
  step: number;
  placeholder?: string;
}

export function NumberInput({
  label,
  value,
  onChangeValue,
  unit,
  step,
  placeholder = '0',
}: NumberInputProps) {
  function adjustValue(direction: 'up' | 'down') {
    const current = parseFloat(value) || 0;
    const newValue = direction === 'up' ? current + step : current - step;
    onChangeValue(Math.max(0, newValue).toString());
  }

  const displayLabel = unit ? `${label} (${unit})` : label;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{displayLabel}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeValue}
        keyboardType="decimal-pad"
        placeholder={placeholder}
      />
      <View style={styles.adjustButtons}>
        <TouchableOpacity
          style={styles.adjustButton}
          onPress={() => adjustValue('down')}
        >
          <Text style={styles.adjustButtonText}>−</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.adjustButton}
          onPress={() => adjustValue('up')}
        >
          <Text style={styles.adjustButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.gray[900],
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
  adjustButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  adjustButton: {
    flex: 1,
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm + 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjustButtonText: {
    color: colors.white,
    fontSize: typography.sizes.xl + 2,
    fontWeight: typography.weights.semibold,
  },
});
