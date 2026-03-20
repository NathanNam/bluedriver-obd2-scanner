// ============================================================
// LiveScreen — real-time PID gauges, chart, and recording
// ============================================================

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polyline } from 'react-native-svg';
import { useLiveStore } from '../store/liveStore';
import { useBluetoothStore } from '../store/bluetoothStore';
import { Gauge } from '../components/Gauge';
import { PIDRow } from '../components/PIDRow';
import { PID_REGISTRY, getAllPIDs } from '../obd2/pids';
import { useThemeColors } from '../utils/hooks';
import { spacing, fontSize, borderRadius } from '../utils/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_HEIGHT = 120;
const CHART_WIDTH = SCREEN_WIDTH - spacing.lg * 2;

export function LiveScreen() {
  const theme = useThemeColors();
  const connectionState = useBluetoothStore((s) => s.connectionState);
  const {
    isPolling,
    gaugeConfig,
    currentValues,
    chartData,
    unsupportedPIDs,
    isRecording,
    startPolling,
    stopPolling,
    setGaugePID,
    startRecording,
    stopRecording,
  } = useLiveStore();

  const [pickerVisible, setPickerVisible] = useState(false);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Elapsed timer
  useEffect(() => {
    if (!isPolling) {
      setElapsedTime(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsedTime((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPolling]);

  const formatElapsed = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleGaugePress = useCallback((slotIndex: number) => {
    setEditingSlot(slotIndex);
    setPickerVisible(true);
  }, []);

  const handlePIDSelect = useCallback(
    (pid: string) => {
      if (editingSlot !== null) {
        setGaugePID(editingSlot, pid);
      }
      setPickerVisible(false);
      setEditingSlot(null);
    },
    [editingSlot]
  );

  const handleTogglePolling = useCallback(() => {
    if (isPolling) {
      stopPolling();
    } else {
      startPolling();
    }
  }, [isPolling]);

  const handleToggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording]);

  const isConnected = connectionState === 'READY' || connectionState === 'SCANNING_OBD';

  // Chart data for primary gauge
  const primaryPID = gaugeConfig[0]?.pid;
  const chartPoints = chartData
    .filter((d) => d.pid === primaryPID)
    .slice(-100);

  const renderChart = () => {
    if (chartPoints.length < 2) return null;

    const pidDef = PID_REGISTRY[primaryPID];
    if (!pidDef) return null;

    const minVal = pidDef.min;
    const maxVal = pidDef.max;
    const range = maxVal - minVal || 1;

    const points = chartPoints
      .map((p, i) => {
        const x = (i / (chartPoints.length - 1)) * CHART_WIDTH;
        const y = CHART_HEIGHT - ((p.value - minVal) / range) * CHART_HEIGHT;
        return `${x},${Math.max(2, Math.min(CHART_HEIGHT - 2, y))}`;
      })
      .join(' ');

    return (
      <View style={[styles.chartContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.chartTitle, { color: theme.textSecondary }]}>
          {pidDef.shortName} over time
        </Text>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          <Polyline
            points={points}
            fill="none"
            stroke={theme.primary}
            strokeWidth={2}
          />
        </Svg>
        <View style={styles.chartLabels}>
          <Text style={[styles.chartLabel, { color: theme.textTertiary }]}>60s ago</Text>
          <Text style={[styles.chartLabel, { color: theme.textTertiary }]}>now</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header Bar */}
      <View style={[styles.headerBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.statusDot, { backgroundColor: isPolling ? theme.connected : theme.idle }]} />
          <Text style={[styles.headerStatus, { color: theme.text }]}>
            {isPolling ? 'Live' : 'Paused'}
          </Text>
        </View>
        {isPolling && (
          <Text style={[styles.elapsed, { color: theme.textSecondary }]}>
            {formatElapsed(elapsedTime)}
          </Text>
        )}
        <TouchableOpacity
          style={[
            styles.recordButton,
            {
              backgroundColor: isRecording ? theme.critical : theme.surfaceSecondary,
              borderColor: isRecording ? theme.critical : theme.border,
            },
          ]}
          onPress={handleToggleRecording}
          disabled={!isPolling}
        >
          <View style={[styles.recordDot, { backgroundColor: isRecording ? '#FFF' : theme.critical }]} />
          <Text style={[styles.recordText, { color: isRecording ? '#FFF' : theme.text }]}>
            {isRecording ? 'Stop' : 'REC'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2x2 Gauge Grid */}
      <View style={styles.gaugeGrid}>
        {gaugeConfig.map((config) => {
          const pidDef = PID_REGISTRY[config.pid];
          if (!pidDef) return null;

          const currentVal = currentValues[config.pid];
          const gaugeSize = (SCREEN_WIDTH - spacing.lg * 3) / 2;

          return (
            <Gauge
              key={config.slotIndex}
              value={currentVal?.value ?? null}
              definition={pidDef}
              size={gaugeSize}
              onPress={() => handleGaugePress(config.slotIndex)}
            />
          );
        })}
      </View>

      {/* Chart Strip */}
      {renderChart()}

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.controlButton,
            {
              backgroundColor: isPolling ? theme.critical : theme.success,
              opacity: isConnected ? 1 : 0.5,
            },
          ]}
          onPress={handleTogglePolling}
          disabled={!isConnected}
        >
          <Text style={styles.controlButtonText}>
            {isPolling ? 'Stop' : 'Start Live Scan'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* PID Picker Modal */}
      <Modal visible={pickerVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Parameter</Text>
            <TouchableOpacity onPress={() => setPickerVisible(false)}>
              <Text style={[styles.modalClose, { color: theme.primary }]}>Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={getAllPIDs()}
            keyExtractor={(item) => item.pid}
            contentContainerStyle={styles.pidList}
            renderItem={({ item }) => (
              <PIDRow
                definition={item}
                currentValue={currentValues[item.pid]}
                isSelected={editingSlot !== null && gaugeConfig[editingSlot]?.pid === item.pid}
                isUnsupported={unsupportedPIDs.has(item.pid)}
                onSelect={() => handlePIDSelect(item.pid)}
              />
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerStatus: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  elapsed: {
    fontSize: fontSize.md,
    fontVariant: ['tabular-nums'],
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    gap: 4,
  },
  recordDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recordText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  gaugeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  chartContainer: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  chartTitle: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  chartLabel: {
    fontSize: 9,
  },
  controls: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: 'auto',
  },
  controlButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  controlButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  modalClose: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  pidList: {
    padding: spacing.lg,
  },
});
