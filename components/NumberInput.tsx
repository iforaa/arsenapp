import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { colors, borderRadius, spacing, typography } from '../lib/theme';

interface NumberInputProps {
  label: string;
  value: string;
  onChangeValue: (value: string) => void;
  unit?: string;
  step: number;
  placeholder?: string;
  compact?: boolean;
}

export function NumberInput({
  label,
  value,
  onChangeValue,
  unit,
  step,
  placeholder = '0',
  compact = false,
}: NumberInputProps) {
  function adjustValue(direction: 'up' | 'down') {
    const current = parseFloat(value) || 0;
    const newValue = direction === 'up' ? current + step : current - step;
    onChangeValue(Math.max(0, newValue).toString());
  }

  // For non-compact mode, keep the original combined label
  const displayLabel = unit ? `${label} (${unit})` : label;

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Text style={styles.compactLabel} numberOfLines={1}>{displayLabel}</Text>
        <View style={styles.compactRow}>
          <TouchableOpacity
            style={styles.compactButton}
            onPress={() => adjustValue('down')}
          >
            <Text style={styles.compactButtonText}>−</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.compactInput}
            value={value}
            onChangeText={onChangeValue}
            keyboardType="decimal-pad"
            placeholder={placeholder}
            placeholderTextColor={colors.gray[500]}
          />
          <TouchableOpacity
            style={styles.compactButton}
            onPress={() => adjustValue('up')}
          >
            <Text style={styles.compactButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
    marginTop: spacing.md,
  },
  adjustButton: {
    flex: 1,
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm + 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.xs,
  },
  adjustButtonText: {
    color: colors.white,
    fontSize: typography.sizes.xl + 2,
    fontWeight: typography.weights.semibold,
  },
  // Compact styles
  compactContainer: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  compactLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.gray[600],
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactInput: {
    flex: 1,
    minWidth: 50,
    height: 44,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingVertical: 0,
    paddingHorizontal: spacing.xs,
    marginHorizontal: spacing.xs,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  compactButton: {
    width: 44,
    height: 44,
    minWidth: 44,
    flexShrink: 0,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactButtonText: {
    color: colors.white,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
});
