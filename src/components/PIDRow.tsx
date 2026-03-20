// ============================================================
// PIDRow — row in PID picker modal
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { PIDDefinition, ParsedPID } from '../types';
import { spacing, fontSize, borderRadius } from '../utils/theme';
import { useThemeColors } from '../utils/hooks';

interface Props {
  definition: PIDDefinition;
  currentValue?: ParsedPID | null;
  isSelected: boolean;
  isUnsupported: boolean;
  onSelect: () => void;
}

export function PIDRow({ definition, currentValue, isSelected, isUnsupported, onSelect }: Props) {
  const theme = useThemeColors();

  return (
    <TouchableOpacity
      style={[
        styles.row,
        {
          backgroundColor: isSelected ? theme.primary + '15' : theme.surface,
          borderColor: isSelected ? theme.primary : theme.border,
          opacity: isUnsupported ? 0.4 : 1,
        },
      ]}
      onPress={onSelect}
      disabled={isUnsupported}
      activeOpacity={0.7}
    >
      <View style={styles.info}>
        <Text style={[styles.name, { color: theme.text }]}>{definition.name}</Text>
        <Text style={[styles.detail, { color: theme.textSecondary }]}>
          PID 0x{definition.pid} | {definition.min}–{definition.max} {definition.unit}
        </Text>
      </View>
      <View style={styles.valueContainer}>
        {currentValue ? (
          <Text style={[styles.liveValue, { color: theme.primary }]}>
            {Math.round(currentValue.value)} {definition.unit}
          </Text>
        ) : isUnsupported ? (
          <Text style={[styles.unsupported, { color: theme.textTertiary }]}>N/A</Text>
        ) : (
          <Text style={[styles.liveValue, { color: theme.textTertiary }]}>--</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  detail: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  valueContainer: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  liveValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  unsupported: {
    fontSize: fontSize.sm,
  },
});
