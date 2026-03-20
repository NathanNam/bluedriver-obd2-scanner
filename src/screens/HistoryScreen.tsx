// ============================================================
// HistoryScreen — past scan results & recording sessions
// ============================================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useScanStore } from '../store/scanStore';
import { useLiveStore } from '../store/liveStore';
import { ScanResult, RecordingSession } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useThemeColors } from '../utils/hooks';
import { spacing, fontSize, borderRadius } from '../utils/theme';

type HistoryEntry =
  | { type: 'scan'; data: ScanResult }
  | { type: 'recording'; data: RecordingSession };

export function HistoryScreen({ navigation }: any) {
  const theme = useThemeColors();
  const scanHistory = useScanStore((s) => s.scanHistory);
  const recordings = useLiveStore((s) => s.recordings);

  // Merge and sort by timestamp
  const entries: HistoryEntry[] = [
    ...scanHistory.map((s): HistoryEntry => ({ type: 'scan', data: s })),
    ...recordings.map((r): HistoryEntry => ({ type: 'recording', data: r })),
  ].sort((a, b) => {
    const tsA = a.type === 'scan' ? a.data.timestamp : a.data.startTime;
    const tsB = b.type === 'scan' ? b.data.timestamp : b.data.startTime;
    return tsB - tsA;
  });

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  const formatDuration = (startMs: number, endMs: number | null) => {
    if (!endMs) return 'In progress';
    const seconds = Math.round((endMs - startMs) / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const renderItem = ({ item }: { item: HistoryEntry }) => {
    if (item.type === 'scan') {
      const s = item.data;
      const dtcCount = s.storedDTCs.length + s.pendingDTCs.length + s.permanentDTCs.length;

      return (
        <TouchableOpacity
          style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => navigation.navigate('ScanDetail', { scan: s })}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            <StatusBadge label="Scan" color={theme.primary} size="small" />
            <Text style={[styles.date, { color: theme.textSecondary }]}>
              {formatDate(s.timestamp)}
            </Text>
          </View>
          <Text style={[styles.vin, { color: theme.text }]}>
            {s.vin ?? 'VIN not available'}
          </Text>
          <View style={styles.cardFooter}>
            <Text style={[styles.dtcCount, { color: dtcCount > 0 ? theme.warning : theme.success }]}>
              {dtcCount} fault code{dtcCount !== 1 ? 's' : ''}
            </Text>
            {s.milStatus && (
              <StatusBadge label="MIL ON" color={theme.critical} size="small" />
            )}
          </View>
        </TouchableOpacity>
      );
    }

    // Recording
    const r = item.data;
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => navigation.navigate('RecordingDetail', { recording: r })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <StatusBadge label="Recording" color={theme.success} size="small" />
          <Text style={[styles.date, { color: theme.textSecondary }]}>
            {formatDate(r.startTime)}
          </Text>
        </View>
        <View style={styles.cardFooter}>
          <Text style={[styles.duration, { color: theme.text }]}>
            Duration: {formatDuration(r.startTime, r.endTime)}
          </Text>
          <Text style={[styles.dataPoints, { color: theme.textSecondary }]}>
            {r.dataPoints.length} data points
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>History</Text>
      </View>

      {entries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No scan history yet
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
            Run a scan or start a live recording to see results here
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) =>
            item.type === 'scan' ? item.data.id : item.data.id
          }
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  date: {
    fontSize: fontSize.xs,
  },
  vin: {
    fontSize: fontSize.md,
    fontWeight: '500',
    fontFamily: 'monospace',
    marginBottom: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dtcCount: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  duration: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  dataPoints: {
    fontSize: fontSize.xs,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
