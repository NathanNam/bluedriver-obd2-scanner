// ============================================================
// ScanDetailScreen — read-only view of a past scan result
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Share, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScanResult } from '../types';
import { DTCCard } from '../components/DTCCard';
import { StatusBadge } from '../components/StatusBadge';
import { useThemeColors } from '../utils/hooks';
import { spacing, fontSize, borderRadius } from '../utils/theme';

export function ScanDetailScreen({ route }: any) {
  const theme = useThemeColors();
  const scan: ScanResult = route.params.scan;

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  const handleExport = async () => {
    const allDTCs = [...scan.storedDTCs, ...scan.pendingDTCs, ...scan.permanentDTCs];
    const report = [
      'OBD2 Scan Report',
      `Date: ${formatDate(scan.timestamp)}`,
      `VIN: ${scan.vin ?? 'N/A'}`,
      `Check Engine: ${scan.milStatus ? 'ON' : 'OFF'}`,
      '',
      allDTCs.length > 0
        ? allDTCs.map((d) => `${d.code} (${d.type}) - ${d.description}`).join('\n')
        : 'No fault codes',
    ].join('\n');

    try {
      await Share.share({ message: report });
    } catch {}
  };

  const totalDTCs = scan.storedDTCs.length + scan.pendingDTCs.length + scan.permanentDTCs.length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Vehicle Info */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>VEHICLE INFO</Text>
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>VIN</Text>
            <Text style={[styles.value, { color: theme.text }]} selectable>
              {scan.vin ?? 'N/A'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Check Engine</Text>
            <StatusBadge
              label={scan.milStatus ? 'ON' : 'OFF'}
              color={scan.milStatus ? theme.critical : theme.success}
              size="small"
            />
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Scanned</Text>
            <Text style={[styles.value, { color: theme.text }]}>{formatDate(scan.timestamp)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Fault Codes</Text>
            <Text
              style={[
                styles.value,
                { color: totalDTCs > 0 ? theme.warning : theme.success, fontWeight: '600' },
              ]}
            >
              {totalDTCs}
            </Text>
          </View>
        </View>

        {/* DTCs */}
        {[...scan.storedDTCs, ...scan.pendingDTCs, ...scan.permanentDTCs].map((dtc) => (
          <DTCCard key={dtc.code + dtc.type} dtc={dtc} />
        ))}

        {totalDTCs === 0 && (
          <Text style={[styles.noDtcText, { color: theme.success }]}>
            No fault codes found
          </Text>
        )}

        {/* Export */}
        <TouchableOpacity
          style={[styles.exportButton, { backgroundColor: theme.primary }]}
          onPress={handleExport}
        >
          <Text style={styles.exportText}>Export Report</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  label: { fontSize: fontSize.sm },
  value: { fontSize: fontSize.sm, fontWeight: '500' },
  noDtcText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  exportButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  exportText: { color: '#FFF', fontSize: fontSize.lg, fontWeight: '600' },
});
