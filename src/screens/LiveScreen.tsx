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
import { useWindowWidth } from '../utils/hooks';

const CHART_HEIGHT = 140;
const CHART_VIEWBOX_W = 600;

export function LiveScreen() {
  const theme = useThemeColors();
  const windowWidth = useWindowWidth();
  const connectionState = useBluetoothStore((s) => s.connectionState);
  const {
    isPolling, gaugeConfig, currentValues, chartData, unsupportedPIDs,
    isRecording, startPolling, stopPolling, setGaugePID, startRecording, stopRecording,
    pidStats, refreshRate, activeAlerts,
  } = useLiveStore();

  const [pickerVisible, setPickerVisible] = useState(false);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!isPolling) { setElapsedTime(0); return; }
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

  const handlePIDSelect = useCallback((pid: string) => {
    if (editingSlot !== null) setGaugePID(editingSlot, pid);
    setPickerVisible(false);
    setEditingSlot(null);
  }, [editingSlot, setGaugePID]);

  const handleTogglePolling = useCallback(() => {
    if (isPolling) stopPolling(); else startPolling();
  }, [isPolling, startPolling, stopPolling]);

  const handleToggleRecording = useCallback(() => {
    if (isRecording) stopRecording(); else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  const isConnected = connectionState === 'READY' || connectionState === 'SCANNING_OBD';

  // Responsive gauge size
  const isDesktop = windowWidth >= 768;
  const gaugeSize = isDesktop ? 180 : 140;

  // Chart data
  const primaryPID = gaugeConfig[0]?.pid;
  const chartPoints = chartData.filter((d) => d.pid === primaryPID).slice(-100);
  const pidDef = primaryPID ? PID_REGISTRY[primaryPID] : undefined;

  const renderChart = () => {
    if (chartPoints.length < 2 || !pidDef) return null;
    const range = pidDef.max - pidDef.min || 1;
    const points = chartPoints
      .map((p, i) => {
        const x = (i / (chartPoints.length - 1)) * CHART_VIEWBOX_W;
        const y = CHART_HEIGHT - ((p.value - pidDef.min) / range) * CHART_HEIGHT;
        return `${x},${Math.max(2, Math.min(CHART_HEIGHT - 2, y))}`;
      })
      .join(' ');

    return (
      <div style={{
        margin: '16px 24px', padding: 12,
        backgroundColor: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 10,
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: theme.textSecondary, marginBottom: 6 }}>
          {pidDef.shortName} over time
        </div>
        <svg viewBox={`0 0 ${CHART_VIEWBOX_W} ${CHART_HEIGHT}`} style={{ width: '100%', height: isDesktop ? 160 : 120 }} preserveAspectRatio="none">
          <polyline points={points} fill="none" stroke={theme.primary} strokeWidth={2} vectorEffect="non-scaling-stroke" />
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
          <span style={{ fontSize: 10, color: theme.textTertiary }}>60s ago</span>
          <span style={{ fontSize: 10, color: theme.textTertiary }}>now</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100%', backgroundColor: theme.background, display: 'flex', flexDirection: 'column' }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px', backgroundColor: theme.surface, borderBottom: `1px solid ${theme.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isPolling ? theme.connected : theme.idle }} />
          <span style={{ fontSize: 16, fontWeight: 600, color: theme.text }}>{isPolling ? 'Live' : 'Paused'}</span>
        </div>
        {isPolling && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 15, color: theme.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
              {formatElapsed(elapsedTime)}
            </span>
            <span style={{
              fontSize: 11, color: theme.textTertiary, fontVariantNumeric: 'tabular-nums',
              backgroundColor: theme.surfaceSecondary, padding: '2px 8px', borderRadius: 4,
            }}>
              {refreshRate} Hz
            </span>
          </div>
        )}
        <button
          onClick={handleToggleRecording}
          disabled={!isPolling}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 6,
            border: `1px solid ${isRecording ? theme.critical : theme.border}`,
            backgroundColor: isRecording ? theme.critical : theme.surfaceSecondary,
            cursor: isPolling ? 'pointer' : 'not-allowed', opacity: isPolling ? 1 : 0.5,
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isRecording ? '#FFF' : theme.critical }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: isRecording ? '#FFF' : theme.text }}>
            {isRecording ? 'Stop' : 'REC'}
          </span>
        </button>
      </div>

      {/* Alert Banner */}
      {Object.keys(activeAlerts).length > 0 && (
        <div style={{
          margin: '8px 24px 0', padding: '8px 12px',
          backgroundColor: theme.critical + '15', border: `1px solid ${theme.critical}`, borderRadius: 8,
        }}>
          {Object.values(activeAlerts).map((alert) => (
            <div key={alert.pid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: theme.critical }}>{alert.name} alert</span>
              <span style={{ fontSize: 13, color: theme.critical, fontVariantNumeric: 'tabular-nums' }}>
                {Math.round(alert.value)} {alert.unit} (limit: {alert.threshold})
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 2x2 Gauge Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)',
        gap: isDesktop ? 16 : 8,
        padding: isDesktop ? '24px 24px 0' : '16px 16px 0',
        justifyItems: 'center',
      }}>
        {gaugeConfig.map((config) => {
          const def = PID_REGISTRY[config.pid];
          if (!def) return null;
          const currentVal = currentValues[config.pid];
          return (
            <Gauge
              key={config.slotIndex}
              value={currentVal?.value ?? null}
              definition={def}
              size={gaugeSize}
              onPress={() => handleGaugePress(config.slotIndex)}
              stats={pidStats[config.pid] ?? null}
              isCritical={!!activeAlerts[config.pid]}
            />
          );
        })}
      </div>

      {/* Chart Strip */}
      {renderChart()}

      {/* Numerical Data Table */}
      {isPolling && Object.keys(currentValues).length > 0 && (
        <div style={{
          margin: '0 24px 16px', padding: 12,
          backgroundColor: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 10,
          maxHeight: 300, overflowY: 'auto',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: theme.textSecondary, marginBottom: 8, paddingBottom: 6, borderBottom: `1px solid ${theme.border}` }}>
            All Parameters
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 4, padding: '4px 0', fontSize: 10, fontWeight: 600, color: theme.textTertiary, borderBottom: `1px solid ${theme.border}`, marginBottom: 4 }}>
            <span>Parameter</span>
            <span style={{ textAlign: 'right' }}>Current</span>
            <span style={{ textAlign: 'right' }}>Min</span>
            <span style={{ textAlign: 'right' }}>Max</span>
            <span style={{ textAlign: 'right' }}>Avg</span>
          </div>
          {getAllPIDs()
            .filter((def) => !unsupportedPIDs.has(def.pid))
            .map((def) => {
              const val = currentValues[def.pid];
              const stats = pidStats[def.pid];
              const isAlert = !!activeAlerts[def.pid];
              return (
                <div key={def.pid} style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 4, padding: '6px 0',
                  borderBottom: `1px solid ${theme.border}`, backgroundColor: isAlert ? theme.critical + '10' : 'transparent', fontSize: 13,
                }}>
                  <span style={{ color: theme.text, fontWeight: 500 }}>
                    {def.shortName}
                    <span style={{ color: theme.textTertiary, fontSize: 10, marginLeft: 4 }}>{def.unit}</span>
                  </span>
                  <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: isAlert ? theme.critical : theme.text, fontWeight: 600 }}>
                    {val ? Math.round(val.value) : '--'}
                  </span>
                  <span style={{ textAlign: 'right', color: theme.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
                    {stats ? Math.round(stats.min) : '--'}
                  </span>
                  <span style={{ textAlign: 'right', color: theme.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
                    {stats ? Math.round(stats.max) : '--'}
                  </span>
                  <span style={{ textAlign: 'right', color: theme.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
                    {stats ? Math.round(stats.avg) : '--'}
                  </span>
                </div>
              );
            })}
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* Start/Stop Button */}
      <div style={{ padding: '16px 24px', maxWidth: 480 }}>
        <button
          onClick={handleTogglePolling}
          disabled={!isConnected}
          style={{
            width: '100%', padding: '14px 0', fontSize: 16, fontWeight: 600, color: '#FFF',
            backgroundColor: isPolling ? theme.critical : theme.success,
            border: 'none', borderRadius: 10,
            cursor: isConnected ? 'pointer' : 'not-allowed', opacity: isConnected ? 1 : 0.5,
          }}
        >
          {isPolling ? 'Stop' : 'Start Live Scan'}
        </button>
      </div>

      {/* PID Picker Modal */}
      {pickerVisible && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: isDesktop ? 'center' : 'flex-end', justifyContent: 'center',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setPickerVisible(false); }}
        >
          <div style={{
            width: '100%', maxWidth: 520, maxHeight: isDesktop ? '60vh' : '75vh',
            backgroundColor: theme.background,
            borderRadius: isDesktop ? 16 : '16px 16px 0 0',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 20px', borderBottom: `1px solid ${theme.border}`,
            }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: theme.text }}>Select Parameter</span>
              <button onClick={() => setPickerVisible(false)} style={{ fontSize: 16, fontWeight: 600, color: theme.primary }}>
                Done
              </button>
            </div>
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
