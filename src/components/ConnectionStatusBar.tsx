// ============================================================
// ConnectionStatusBar — shows BT connection state in a compact bar
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { ConnectionState } from '../types';
import { spacing, fontSize, borderRadius } from '../utils/theme';
import { useThemeColors } from '../utils/hooks';

interface Props {
  state: ConnectionState;
  deviceName?: string | null;
}

export function ConnectionStatusBar({ state, deviceName }: Props) {
  const theme = useThemeColors();

  const stateConfig: Record<ConnectionState, { color: string; label: string; showSpinner: boolean }> = {
    IDLE: { color: theme.idle, label: 'Not Connected', showSpinner: false },
    SCANNING: { color: theme.connecting, label: 'Scanning...', showSpinner: true },
    CONNECTING: { color: theme.connecting, label: 'Connecting...', showSpinner: true },
    INITIALIZING: { color: theme.connecting, label: 'Initializing...', showSpinner: true },
    READY: { color: theme.connected, label: deviceName ? `Connected: ${deviceName}` : 'Connected', showSpinner: false },
    SCANNING_OBD: { color: theme.connected, label: 'Reading data...', showSpinner: true },
    ERROR: { color: theme.disconnected, label: 'Error', showSpinner: false },
    DISCONNECTED: { color: theme.disconnected, label: 'Disconnected', showSpinner: false },
  };

  const config = stateConfig[state];

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.label, { color: theme.text }]} numberOfLines={1}>
        {config.label}
      </Text>
      {config.showSpinner && <ActivityIndicator size="small" color={config.color} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    gap: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    flex: 1,
  },
});
