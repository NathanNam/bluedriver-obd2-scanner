// ============================================================
// RecordingDetailScreen — playback & export of a recorded session
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polyline } from 'react-native-svg';
import { RecordingSession, LiveDataPoint } from '../types';
import { PID_REGISTRY } from '../obd2/pids';
import { Gauge } from '../components/Gauge';
import { useThemeColors } from '../utils/hooks';
import { spacing, fontSize, borderRadius } from '../utils/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - spacing.lg * 2;
const CHART_HEIGHT = 150;

export function RecordingDetailScreen({ route }: any) {
  const theme = useThemeColors();
  const recording: RecordingSession = route.params.recording;
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dataPoints = recording.dataPoints;
  const uniquePIDs = [...new Set(dataPoints.map((d) => d.pid))];

  // Get current values at playback index
  const currentValues: Record<string, number> = {};
  for (let i = 0; i <= playbackIndex && i < dataPoints.length; i++) {
    currentValues[dataPoints[i].pid] = dataPoints[i].value;
  }

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setPlaybackIndex((prev) => {
          if (prev >= dataPoints.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 100);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying]);

  const handlePlayPause = () => {
    if (playbackIndex >= dataPoints.length - 1) {
      setPlaybackIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleExportCSV = async () => {
    const header = 'timestamp,pid,name,value,unit';
    const rows = dataPoints.map((d) => {
      const def = PID_REGISTRY[d.pid];
      return `${d.timestamp},${d.pid},${def?.name ?? d.pid},${d.value},${def?.unit ?? ''}`;
    });
    const csv = [header, ...rows].join('\n');

    try {
      await Share.share({ message: csv });
    } catch {}
  };

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  const formatDuration = () => {
    if (!recording.endTime) return 'N/A';
    const s = Math.round((recording.endTime - recording.startTime) / 1000);
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  // Chart for first PID
  const primaryPID = uniquePIDs[0];
  const chartPoints = primaryPID
    ? dataPoints.filter((d) => d.pid === primaryPID)
    : [];

  const renderChart = () => {
    if (!primaryPID || chartPoints.length < 2) return null;
    const def = PID_REGISTRY[primaryPID];
    if (!def) return null;

    const range = def.max - def.min || 1;
    const points = chartPoints
      .map((p, i) => {
        const x = (i / (chartPoints.length - 1)) * CHART_WIDTH;
        const y = CHART_HEIGHT - ((p.value - def.min) / range) * CHART_HEIGHT;
        return `${x},${Math.max(2, Math.min(CHART_HEIGHT - 2, y))}`;
      })
      .join(' ');

    // Playback position line
    const playbackRatio = dataPoints.length > 0 ? playbackIndex / dataPoints.length : 0;

    return (
      <View style={[styles.chartBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.chartTitle, { color: theme.textSecondary }]}>
          {def.shortName}
        </Text>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          <Polyline points={points} fill="none" stroke={theme.primary} strokeWidth={2} />
        </Svg>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      {/* Info */}
      <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Date</Text>
          <Text style={[styles.value, { color: theme.text }]}>{formatDate(recording.startTime)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Duration</Text>
          <Text style={[styles.value, { color: theme.text }]}>{formatDuration()}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Data Points</Text>
          <Text style={[styles.value, { color: theme.text }]}>{dataPoints.length}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Parameters</Text>
          <Text style={[styles.value, { color: theme.text }]}>
            {uniquePIDs.map((p) => PID_REGISTRY[p]?.shortName ?? p).join(', ')}
          </Text>
        </View>
      </View>

      {/* Gauges showing playback values */}
      <View style={styles.gaugeRow}>
        {uniquePIDs.slice(0, 4).map((pid) => {
          const def = PID_REGISTRY[pid];
          if (!def) return null;
          return (
            <Gauge
              key={pid}
              value={currentValues[pid] ?? null}
              definition={def}
              size={80}
            />
          );
        })}
      </View>

      {/* Chart */}
      {renderChart()}

      {/* Playback controls */}
      <View style={styles.playbackControls}>
        <TouchableOpacity
          style={[styles.playButton, { backgroundColor: theme.primary }]}
          onPress={handlePlayPause}
        >
          <Text style={styles.playButtonText}>
            {isPlaying ? 'Pause' : 'Play'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.exportButton, { borderColor: theme.primary }]}
          onPress={handleExportCSV}
        >
          <Text style={[styles.exportText, { color: theme.primary }]}>Export CSV</Text>
        </TouchableOpacity>
      </View>

      {/* Scrub bar */}
      <View style={styles.scrubContainer}>
        <Text style={[styles.scrubLabel, { color: theme.textSecondary }]}>
          {playbackIndex + 1} / {dataPoints.length}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  infoCard: {
    margin: spacing.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  label: { fontSize: fontSize.sm },
  value: { fontSize: fontSize.sm, fontWeight: '500', flexShrink: 1, textAlign: 'right' },
  gaugeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.md,
  },
  chartBox: {
    margin: spacing.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
  },
  chartTitle: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  playbackControls: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginTop: 'auto',
  },
  playButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  playButtonText: { color: '#FFF', fontSize: fontSize.lg, fontWeight: '600' },
  exportButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  exportText: { fontSize: fontSize.lg, fontWeight: '600' },
  scrubContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  scrubLabel: { fontSize: fontSize.xs },
});
