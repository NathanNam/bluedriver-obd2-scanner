// ============================================================
// LiveScreen — real-time PID gauges, chart, and recording
// ============================================================

import React, { useState, useCallback, useEffect } from 'react';
import { useThemeColors } from '../utils/hooks';
import { useLiveStore } from '../store/liveStore';
import { useBluetoothStore } from '../store/bluetoothStore';
import { Gauge } from '../components/Gauge';
import { PIDRow } from '../components/PIDRow';
import { PID_REGISTRY, getAllPIDs } from '../obd2/pids';

const CHART_HEIGHT = 120;

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
    const interval = setInterval(() => setElapsedTime((t) => t + 1), 1000);
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
      if (editingSlot !== null) setGaugePID(editingSlot, pid);
      setPickerVisible(false);
      setEditingSlot(null);
    },
    [editingSlot, setGaugePID]
  );

  const handleTogglePolling = useCallback(() => {
    if (isPolling) stopPolling();
    else startPolling();
  }, [isPolling, startPolling, stopPolling]);

  const handleToggleRecording = useCallback(() => {
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  const isConnected = connectionState === 'READY' || connectionState === 'SCANNING_OBD';

  // Chart data for primary gauge
  const primaryPID = gaugeConfig[0]?.pid;
  const chartPoints = chartData.filter((d) => d.pid === primaryPID).slice(-100);
  const pidDef = primaryPID ? PID_REGISTRY[primaryPID] : undefined;

  const chartWidth = 400; // will be constrained by parent via 100% width

  const renderChart = () => {
    if (chartPoints.length < 2 || !pidDef) return null;
    const range = pidDef.max - pidDef.min || 1;
    const points = chartPoints
      .map((p, i) => {
        const x = (i / (chartPoints.length - 1)) * chartWidth;
        const y = CHART_HEIGHT - ((p.value - pidDef.min) / range) * CHART_HEIGHT;
        return `${x},${Math.max(2, Math.min(CHART_HEIGHT - 2, y))}`;
      })
      .join(' ');

    return (
      <div
        style={{
          margin: '16px 20px',
          padding: 10,
          backgroundColor: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: 10,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 600, color: theme.textSecondary, marginBottom: 6 }}>
          {pidDef.shortName} over time
        </div>
        <svg
          viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT}`}
          style={{ width: '100%', height: CHART_HEIGHT }}
          preserveAspectRatio="none"
        >
          <polyline
            points={points}
            fill="none"
            stroke={theme.primary}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
          <span style={{ fontSize: 9, color: theme.textTertiary }}>60s ago</span>
          <span style={{ fontSize: 9, color: theme.textTertiary }}>now</span>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: theme.background,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 20px',
          backgroundColor: theme.surface,
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: isPolling ? theme.connected : theme.idle,
            }}
          />
          <span style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>
            {isPolling ? 'Live' : 'Paused'}
          </span>
        </div>
        {isPolling && (
          <span
            style={{
              fontSize: 15,
              color: theme.textSecondary,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatElapsed(elapsedTime)}
          </span>
        )}
        <button
          onClick={handleToggleRecording}
          disabled={!isPolling}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 10px',
            borderRadius: 6,
            border: `1px solid ${isRecording ? theme.critical : theme.border}`,
            backgroundColor: isRecording ? theme.critical : theme.surfaceSecondary,
            cursor: isPolling ? 'pointer' : 'not-allowed',
            opacity: isPolling ? 1 : 0.5,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: isRecording ? '#FFF' : theme.critical,
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: isRecording ? '#FFF' : theme.text,
            }}
          >
            {isRecording ? 'Stop' : 'REC'}
          </span>
        </button>
      </div>

      {/* 2x2 Gauge Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          padding: '16px 16px 0',
          justifyItems: 'center',
        }}
      >
        {gaugeConfig.map((config) => {
          const def = PID_REGISTRY[config.pid];
          if (!def) return null;
          const currentVal = currentValues[config.pid];
          return (
            <Gauge
              key={config.slotIndex}
              value={currentVal?.value ?? null}
              definition={def}
              size={140}
              onPress={() => handleGaugePress(config.slotIndex)}
            />
          );
        })}
      </div>

      {/* Chart Strip */}
      {renderChart()}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Start/Stop Button */}
      <div style={{ padding: '16px 20px' }}>
        <button
          onClick={handleTogglePolling}
          disabled={!isConnected}
          style={{
            width: '100%',
            padding: '14px 0',
            fontSize: 16,
            fontWeight: 600,
            color: '#FFFFFF',
            backgroundColor: isPolling ? theme.critical : theme.success,
            border: 'none',
            borderRadius: 10,
            cursor: isConnected ? 'pointer' : 'not-allowed',
            opacity: isConnected ? 1 : 0.5,
          }}
        >
          {isPolling ? 'Stop' : 'Start Live Scan'}
        </button>
      </div>

      {/* PID Picker Modal */}
      {pickerVisible && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPickerVisible(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 480,
              maxHeight: '75vh',
              backgroundColor: theme.background,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                borderBottom: `1px solid ${theme.border}`,
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 700, color: theme.text }}>
                Select Parameter
              </span>
              <button
                onClick={() => setPickerVisible(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 16,
                  fontWeight: 600,
                  color: theme.primary,
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>

            {/* PID List */}
            <div style={{ overflowY: 'auto', padding: 20 }}>
              {getAllPIDs().map((item) => (
                <PIDRow
                  key={item.pid}
                  definition={item}
                  currentValue={currentValues[item.pid]}
                  isSelected={editingSlot !== null && gaugeConfig[editingSlot]?.pid === item.pid}
                  isUnsupported={unsupportedPIDs.has(item.pid)}
                  onSelect={() => handlePIDSelect(item.pid)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
