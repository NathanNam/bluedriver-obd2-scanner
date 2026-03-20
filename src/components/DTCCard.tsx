// ============================================================
// DTCCard — displays a single Diagnostic Trouble Code
// ============================================================

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DTC } from '../types';
import { StatusBadge } from './StatusBadge';
import { borderRadius, fontSize, spacing } from '../utils/theme';
import { useThemeColors } from '../utils/hooks';

interface Props {
  dtc: DTC;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#FF3B30',
  warning: '#FF9500',
  info: '#5AC8FA',
};

const POTENTIAL_CAUSES: Record<string, string[]> = {
  P0300: ['Worn spark plugs', 'Faulty ignition coils', 'Vacuum leak', 'Low fuel pressure', 'Clogged fuel injectors'],
  P0301: ['Bad spark plug (Cyl 1)', 'Faulty ignition coil (Cyl 1)', 'Fuel injector issue (Cyl 1)'],
  P0302: ['Bad spark plug (Cyl 2)', 'Faulty ignition coil (Cyl 2)', 'Fuel injector issue (Cyl 2)'],
  P0303: ['Bad spark plug (Cyl 3)', 'Faulty ignition coil (Cyl 3)', 'Fuel injector issue (Cyl 3)'],
  P0304: ['Bad spark plug (Cyl 4)', 'Faulty ignition coil (Cyl 4)', 'Fuel injector issue (Cyl 4)'],
  P0171: ['Vacuum leak', 'Dirty MAF sensor', 'Weak fuel pump', 'Clogged fuel filter'],
  P0172: ['Dirty air filter', 'Leaking fuel injector', 'Faulty O2 sensor', 'Faulty fuel pressure regulator'],
  P0174: ['Vacuum leak', 'Dirty MAF sensor', 'Weak fuel pump', 'Exhaust leak before O2 sensor'],
  P0175: ['Dirty air filter', 'Leaking fuel injector', 'Faulty O2 sensor'],
  P0420: ['Catalytic converter efficiency', 'O2 sensor issue', 'Exhaust leak', 'Engine misfire damaging catalyst'],
  P0430: ['Catalytic converter efficiency (Bank 2)', 'O2 sensor issue (Bank 2)'],
  P0440: ['Loose or damaged gas cap', 'EVAP canister leak', 'EVAP line damage'],
  P0442: ['Loose gas cap', 'Small EVAP system leak', 'Cracked charcoal canister'],
  P0455: ['Missing gas cap', 'Disconnected EVAP line', 'Faulty purge valve'],
  P0128: ['Stuck open thermostat', 'Low coolant', 'Faulty ECT sensor'],
};

export function DTCCard({ dtc }: Props) {
  const [expanded, setExpanded] = useState(false);
  const theme = useThemeColors();
  const severityColor = SEVERITY_COLORS[dtc.severity] ?? SEVERITY_COLORS.info;
  const causes = POTENTIAL_CAUSES[dtc.code] ?? [];

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.codeRow}>
          <Text style={[styles.code, { color: theme.text }]}>{dtc.code}</Text>
          <StatusBadge
            label={dtc.severity.charAt(0).toUpperCase() + dtc.severity.slice(1)}
            color={severityColor}
            size="small"
          />
          {dtc.type !== 'stored' && (
            <StatusBadge
              label={dtc.type === 'pending' ? 'Pending' : 'Permanent'}
              color={dtc.type === 'pending' ? '#FF9500' : '#AF52DE'}
              size="small"
            />
          )}
        </View>
        <Text style={[styles.system, { color: theme.textSecondary }]}>{dtc.system}</Text>
      </View>

      <Text style={[styles.description, { color: theme.text }]}>{dtc.description}</Text>

      {expanded && causes.length > 0 && (
        <View style={[styles.causesContainer, { borderTopColor: theme.border }]}>
          <Text style={[styles.causesTitle, { color: theme.textSecondary }]}>
            Potential Causes:
          </Text>
          {causes.map((cause, i) => (
            <Text key={i} style={[styles.cause, { color: theme.text }]}>
              {'\u2022'} {cause}
            </Text>
          ))}
        </View>
      )}

      {causes.length > 0 && (
        <Text style={[styles.expandHint, { color: theme.textTertiary }]}>
          {expanded ? 'Tap to collapse' : 'Tap for details'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  header: {
    marginBottom: spacing.xs,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  code: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  system: {
    fontSize: fontSize.xs,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  causesContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  causesTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  cause: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    paddingLeft: spacing.sm,
  },
  expandHint: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
});
