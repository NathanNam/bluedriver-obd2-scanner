// ============================================================
// StatusBadge — colored label for connection state, severity, etc.
// ============================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { borderRadius, fontSize, spacing } from '../utils/theme';

interface Props {
  label: string;
  color: string;
  textColor?: string;
  size?: 'small' | 'medium';
}

export function StatusBadge({ label, color, textColor = '#FFFFFF', size = 'medium' }: Props) {
  const isSmall = size === 'small';

  return (
    <View style={[styles.badge, { backgroundColor: color }, isSmall && styles.badgeSmall]}>
      <Text style={[styles.text, { color: textColor }, isSmall && styles.textSmall]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  textSmall: {
    fontSize: fontSize.xs,
  },
});
