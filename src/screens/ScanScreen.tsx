// ============================================================
// ScanScreen — one-time diagnostic scan results
// ============================================================

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useScanStore } from '../store/scanStore';
import { DTCCard } from '../components/DTCCard';
import { StatusBadge } from '../components/StatusBadge';
import { DTC, FreezeFrame } from '../types';
import { useThemeColors } from '../utils/hooks';
import { useSettingsStore } from '../store/settingsStore';
import { spacing, fontSize, borderRadius } from '../utils/theme';

export function ScanScreen({ navigation }: any) {
  const theme = useThemeColors();
  const { convertTemp, tempUnit } = useSettingsStore();
  const {
    isScanning,
    scanProgress,
    scanStage,
    currentResult,
    error,
    startScan,
    clearCodes,
  } = useScanStore();

  useEffect(() => {
    if (!currentResult && !isScanning) {
      startScan();
    }
  }, []);

  const handleClearCodes = useCallback(() => {
    Alert.alert(
      'Clear Fault Codes',
      'This will clear all stored DTCs and turn off the Check Engine light.\n\nWarning: Clearing codes does not fix the underlying problem. If the issue persists, the codes will return.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Codes',
          style: 'destructive',
          onPress: async () => {
            const success = await clearCodes();
            if (success) {
              Alert.alert('Codes Cleared', 'Re-scanning to verify...', [
                { text: 'OK', onPress: startScan },
              ]);
            } else {
              Alert.alert('Error', 'Failed to clear codes. Please try again.');
            }
          },
        },
      ]
    );
  }, []);

  const handleExport = useCallback(async () => {
    if (!currentResult) return;

    const r = currentResult;
    const allDTCs = [...r.storedDTCs, ...r.pendingDTCs, ...r.permanentDTCs];
    const dtcList = allDTCs.length > 0
      ? allDTCs.map((d) => `  ${d.code} (${d.type}) - ${d.description}`).join('\n')
      : '  No fault codes found';

    const report = [
      'OBD2 Scan Report',
      `Date: ${new Date(r.timestamp).toLocaleString()}`,
      '',
      '--- Vehicle Info ---',
      `VIN: ${r.vin ?? 'N/A'}`,
      `ECU ID: ${r.calibrationId ?? 'N/A'}`,
      `Check Engine Light: ${r.milStatus ? 'ON' : 'OFF'}`,
      `OBD Standard: ${r.obdStandard ?? 'N/A'}`,
      '',
      '--- Fault Codes ---',
      dtcList,
    ];

    if (r.freezeFrame) {
      const ff = r.freezeFrame;
      report.push(
        '',
        '--- Freeze Frame Data ---',
        `RPM: ${ff.rpm ?? 'N/A'}`,
        `Speed: ${ff.speed ?? 'N/A'} km/h`,
        `Coolant Temp: ${ff.coolantTemp ?? 'N/A'} °C`,
        `Engine Load: ${ff.engineLoad ?? 'N/A'} %`,
        `STFT: ${ff.shortTermFuelTrim ?? 'N/A'} %`,
        `LTFT: ${ff.longTermFuelTrim ?? 'N/A'} %`
      );
    }

    try {
      await Share.share({ message: report.join('\n') });
    } catch {
      // Cancelled
    }
  }, [currentResult]);

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  // --- Scanning in progress ---
  if (isScanning) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingStage, { color: theme.text }]}>{scanStage}</Text>
          <View style={[styles.progressBar, { backgroundColor: theme.gaugeArc }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: theme.primary, width: `${scanProgress * 100}%` },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: theme.textSecondary }]}>
            {Math.round(scanProgress * 100)}%
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // --- No result ---
  if (!currentResult) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.errorText, { color: theme.text }]}>
            {error ?? 'No scan results'}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={startScan}
          >
            <Text style={styles.retryButtonText}>Retry Scan</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- Results ---
  const r = currentResult;
  const totalDTCs = r.storedDTCs.length + r.pendingDTCs.length + r.permanentDTCs.length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Vehicle Info Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>VEHICLE INFO</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>VIN</Text>
              <Text style={[styles.infoValue, { color: theme.text }]} selectable>
                {r.vin ?? 'N/A'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Check Engine</Text>
              <StatusBadge
                label={r.milStatus ? 'ON' : 'OFF'}
                color={r.milStatus ? theme.critical : theme.success}
                size="small"
              />
            </View>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>OBD Standard</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {r.obdStandard ?? 'N/A'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Scanned</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {formatDate(r.timestamp)}
              </Text>
            </View>
          </View>
        </View>

        {/* DTC Summary */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>FAULT CODES</Text>
          {totalDTCs === 0 ? (
            <View style={styles.noDTCContainer}>
              <Text style={[styles.noDTCText, { color: theme.success }]}>
                No fault codes found
              </Text>
              <Text style={[styles.noDTCSubtext, { color: theme.textSecondary }]}>
                Your vehicle is not reporting any issues
              </Text>
            </View>
          ) : (
            <Text style={[styles.dtcSummary, { color: theme.text }]}>
              {totalDTCs} code{totalDTCs !== 1 ? 's' : ''} found
            </Text>
          )}
        </View>

        {/* Stored DTCs */}
        {r.storedDTCs.length > 0 && (
          <View style={styles.dtcSection}>
            <Text style={[styles.dtcGroupTitle, { color: theme.textSecondary }]}>
              STORED ({r.storedDTCs.length})
            </Text>
            {r.storedDTCs.map((dtc) => (
              <DTCCard key={dtc.code + dtc.type} dtc={dtc} />
            ))}
          </View>
        )}

        {/* Pending DTCs */}
        {r.pendingDTCs.length > 0 && (
          <View style={styles.dtcSection}>
            <Text style={[styles.dtcGroupTitle, { color: theme.textSecondary }]}>
              PENDING ({r.pendingDTCs.length})
            </Text>
            {r.pendingDTCs.map((dtc) => (
              <DTCCard key={dtc.code + dtc.type} dtc={dtc} />
            ))}
          </View>
        )}

        {/* Permanent DTCs */}
        {r.permanentDTCs.length > 0 && (
          <View style={styles.dtcSection}>
            <Text style={[styles.dtcGroupTitle, { color: theme.textSecondary }]}>
              PERMANENT ({r.permanentDTCs.length})
            </Text>
            {r.permanentDTCs.map((dtc) => (
              <DTCCard key={dtc.code + dtc.type} dtc={dtc} />
            ))}
          </View>
        )}

        {/* Freeze Frame */}
        {r.freezeFrame && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>
              FREEZE FRAME DATA
            </Text>
            <Text style={[styles.freezeFrameNote, { color: theme.textTertiary }]}>
              Snapshot of engine data when the first fault code was set
            </Text>
            <FreezeFrameTable frame={r.freezeFrame} theme={theme} />
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          {totalDTCs > 0 && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.critical }]}
              onPress={handleClearCodes}
            >
              <Text style={styles.actionButtonText}>Clear Codes</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={handleExport}
          >
            <Text style={styles.actionButtonText}>Export Report</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButtonOutline, { borderColor: theme.primary }]}
            onPress={startScan}
          >
            <Text style={[styles.actionButtonOutlineText, { color: theme.primary }]}>
              Scan Again
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Freeze Frame Table Sub-component ---

function FreezeFrameTable({ frame, theme }: { frame: FreezeFrame; theme: any }) {
  const rows = [
    { label: 'Engine RPM', value: frame.rpm, unit: 'RPM' },
    { label: 'Vehicle Speed', value: frame.speed, unit: 'km/h' },
    { label: 'Coolant Temp', value: frame.coolantTemp, unit: '°C' },
    { label: 'Engine Load', value: frame.engineLoad, unit: '%' },
    { label: 'Short Term Fuel Trim', value: frame.shortTermFuelTrim, unit: '%' },
    { label: 'Long Term Fuel Trim', value: frame.longTermFuelTrim, unit: '%' },
    { label: 'Manifold Pressure', value: frame.intakeManifoldPressure, unit: 'kPa' },
    { label: 'Timing Advance', value: frame.timingAdvance, unit: '°' },
  ];

  return (
    <View style={ffStyles.table}>
      {rows.map((row) => (
        <View
          key={row.label}
          style={[ffStyles.row, { borderBottomColor: theme.border }]}
        >
          <Text style={[ffStyles.label, { color: theme.textSecondary }]}>{row.label}</Text>
          <Text style={[ffStyles.value, { color: theme.text }]}>
            {row.value !== null ? `${row.value} ${row.unit}` : 'N/A'}
          </Text>
        </View>
      ))}
    </View>
  );
}

const ffStyles = StyleSheet.create({
  table: {
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: fontSize.sm,
  },
  value: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingStage: {
    fontSize: fontSize.lg,
    fontWeight: '500',
    marginTop: spacing.lg,
  },
  progressBar: {
    width: '80%',
    height: 6,
    borderRadius: 3,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  errorText: {
    fontSize: fontSize.lg,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
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
  infoGrid: {
    gap: spacing.sm,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: fontSize.sm,
  },
  infoValue: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  noDTCContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  noDTCText: {
    fontSize: fontSize.xl,
    fontWeight: '600',
  },
  noDTCSubtext: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  dtcSummary: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  dtcSection: {
    marginBottom: spacing.md,
  },
  dtcGroupTitle: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  freezeFrameNote: {
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  actionButtonOutline: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  actionButtonOutlineText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
});
