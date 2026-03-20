// ============================================================
// SettingsScreen — units, theme, adapter info
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettingsStore } from '../store/settingsStore';
import { useBluetoothStore } from '../store/bluetoothStore';
import { UnitSystem, ThemeMode } from '../types';
import { useThemeColors } from '../utils/hooks';
import { spacing, fontSize, borderRadius } from '../utils/theme';

export function SettingsScreen() {
  const theme = useThemeColors();
  const { unitSystem, themeMode, setUnitSystem, setThemeMode } = useSettingsStore();
  const { connectionState, connectedDeviceName } = useBluetoothStore();

  const SegmentedControl = ({
    options,
    selected,
    onSelect,
  }: {
    options: { label: string; value: string }[];
    selected: string;
    onSelect: (value: any) => void;
  }) => (
    <View style={[styles.segmented, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[
            styles.segment,
            selected === opt.value && { backgroundColor: theme.primary },
          ]}
          onPress={() => onSelect(opt.value)}
        >
          <Text
            style={[
              styles.segmentText,
              { color: selected === opt.value ? '#FFF' : theme.text },
            ]}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Settings</Text>

        {/* Units */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>UNITS</Text>
          <SegmentedControl
            options={[
              { label: 'Imperial (°F, mph)', value: 'imperial' },
              { label: 'Metric (°C, km/h)', value: 'metric' },
            ]}
            selected={unitSystem}
            onSelect={setUnitSystem}
          />
        </View>

        {/* Theme */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>APPEARANCE</Text>
          <SegmentedControl
            options={[
              { label: 'System', value: 'system' },
              { label: 'Light', value: 'light' },
              { label: 'Dark', value: 'dark' },
            ]}
            selected={themeMode}
            onSelect={setThemeMode}
          />
        </View>

        {/* Adapter Info */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ADAPTER</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Status</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{connectionState}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Device</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {connectedDeviceName ?? 'None'}
            </Text>
          </View>
        </View>

        {/* About */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ABOUT</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>App Version</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>OBD Protocol</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>ELM327</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontSize: fontSize.xxxl, fontWeight: '700', marginBottom: spacing.lg },
  section: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  infoLabel: { fontSize: fontSize.sm },
  infoValue: { fontSize: fontSize.sm, fontWeight: '500' },
});
