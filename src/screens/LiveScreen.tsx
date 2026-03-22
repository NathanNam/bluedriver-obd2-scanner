// ============================================================
// LiveScreen — real-time time-series charts, data table, recording
// ============================================================

import React, { useState, useCallback, useEffect } from 'react';
import { useThemeColors } from '../utils/hooks';
import { useLiveStore } from '../store/liveStore';
import { useBluetoothStore } from '../store/bluetoothStore';
import { PID_REGISTRY, getAllPIDs } from '../obd2/pids';
import { useWindowWidth } from '../utils/hooks';
import { PIDDefinition } from '../types';
import { useNewtonStatus } from '../hooks/useNewtonStatus';
import { useNewtonChat } from '../hooks/useNewtonChat';
import { NewtonIndicator } from '../components/NewtonIndicator';
import { NewtonChat } from '../components/NewtonChat';

const CHART_H = 80;
const CHART_VW = 600;

// Chart colors for different PIDs
const CHART_COLORS = [
  '#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE',
  '#5AC8FA', '#FF2D55', '#FFD60A', '#30D158', '#0A84FF',
  '#FF6B6B', '#4ECDC4', '#45B7D1',
];

export function LiveScreen() {
  const theme = useThemeColors();
  const windowWidth = useWindowWidth();
  const connectionState = useBluetoothStore((s) => s.connectionState);
  const {
    isPolling, currentValues, chartData, unsupportedPIDs,
    isRecording, startPolling, stopPolling, startRecording, stopRecording,
    pidStats, refreshRate, activeAlerts,
  } = useLiveStore();

  // Newton AI
  const newton = useNewtonChat();
  const newtonStatus = useNewtonStatus({
    available: newton.available,
    polling: isPolling,
    currentValues,
    pidStats,
    activeAlerts,
  });

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

  const handleTogglePolling = useCallback(() => {
    if (isPolling) stopPolling(); else startPolling();
  }, [isPolling, startPolling, stopPolling]);

  const handleToggleRecording = useCallback(() => {
    if (isRecording) stopRecording(); else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  const isConnected = connectionState === 'READY' || connectionState === 'SCANNING_OBD';
  const isDesktop = windowWidth >= 768;

  // Get PIDs that have data (supported and have been polled)
  const activePIDs = getAllPIDs().filter(
    (def) => !unsupportedPIDs.has(def.pid) && currentValues[def.pid]
  );

  // Render a single time-series chart for a PID
  const renderPIDChart = (def: PIDDefinition, colorIndex: number) => {
    const points = chartData.filter((d) => d.pid === def.pid).slice(-100);
    const stats = pidStats[def.pid];
    const currentVal = currentValues[def.pid];
    const isAlert = !!activeAlerts[def.pid];
    const color = CHART_COLORS[colorIndex % CHART_COLORS.length];

    const range = def.max - def.min || 1;
    const polylinePoints = points.length >= 2
      ? points
          .map((p, i) => {
            const x = (i / (points.length - 1)) * CHART_VW;
            const y = CHART_H - ((p.value - def.min) / range) * CHART_H;
            return `${x},${Math.max(2, Math.min(CHART_H - 2, y))}`;
          })
          .join(' ')
      : null;

    return (
      <div
        key={def.pid}
        id={`chart-${def.pid}`}
        style={{
          backgroundColor: theme.surface,
          border: `1px solid ${isAlert ? theme.critical : theme.border}`,
          borderRadius: 10,
          padding: '10px 14px',
          transition: 'border-color 0.3s',
        }}
      >
        {/* Chart header: name, current value, stats */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color, flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{def.shortName}</span>
            <span style={{ fontSize: 10, color: theme.textTertiary }}>{def.unit}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            {stats && (
              <span style={{ fontSize: 10, color: theme.textTertiary, fontVariantNumeric: 'tabular-nums' }}>
                L:{Math.round(stats.min)} H:{Math.round(stats.max)} Avg:{Math.round(stats.avg)}
              </span>
            )}
            <span style={{
              fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
              color: isAlert ? theme.critical : color,
            }}>
              {currentVal ? Math.round(currentVal.value) : '--'}
            </span>
          </div>
        </div>

        {/* Description */}
        <div style={{ fontSize: 11, color: theme.textTertiary, marginBottom: 4, lineHeight: '15px' }}>
          {def.description}
        </div>

        {/* SVG chart */}
        <svg viewBox={`0 0 ${CHART_VW} ${CHART_H}`} style={{ width: '100%', height: CHART_H }} preserveAspectRatio="none">
          {/* Caution/critical threshold lines */}
          {def.cautionThreshold !== undefined && (
            <line
              x1={0} x2={CHART_VW}
              y1={CHART_H - ((def.cautionThreshold - def.min) / range) * CHART_H}
              y2={CHART_H - ((def.cautionThreshold - def.min) / range) * CHART_H}
              stroke={theme.gaugeYellow} strokeWidth={1} strokeDasharray="4,4" vectorEffect="non-scaling-stroke"
            />
          )}
          {def.criticalThreshold !== undefined && (
            <line
              x1={0} x2={CHART_VW}
              y1={CHART_H - ((def.criticalThreshold - def.min) / range) * CHART_H}
              y2={CHART_H - ((def.criticalThreshold - def.min) / range) * CHART_H}
              stroke={theme.gaugeRed} strokeWidth={1} strokeDasharray="4,4" vectorEffect="non-scaling-stroke"
            />
          )}
          {/* Data line */}
          {polylinePoints && (
            <polyline points={polylinePoints} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
          )}
        </svg>

        {/* Time axis */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
          <span style={{ fontSize: 9, color: theme.textTertiary }}>60s ago</span>
          <span style={{ fontSize: 9, color: theme.textTertiary }}>now</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100%', backgroundColor: theme.background, display: 'flex', flexDirection: 'column' }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 24px', backgroundColor: theme.surface, borderBottom: `1px solid ${theme.border}`,
        gap: 12, flexWrap: 'wrap',
      }}>
        {/* Left: status + time + hz */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isPolling ? theme.connected : theme.idle }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{isPolling ? 'Live' : 'Paused'}</span>
          </div>
          {isPolling && (
            <>
              <span style={{ fontSize: 13, color: theme.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
                {formatElapsed(elapsedTime)}
              </span>
              <span style={{ fontSize: 10, color: theme.textTertiary, fontVariantNumeric: 'tabular-nums' }}>
                {refreshRate} Hz
              </span>
            </>
          )}
        </div>

        {/* Right: indicators + REC */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <NewtonIndicator
            healthResult={newtonStatus.healthResult}
            newtonResult={newtonStatus.newtonResult}
            newtonConnected={newtonStatus.newtonConnected}
            newtonAvailable={newton.available}
            polling={isPolling}
          />
          <button
            onClick={handleToggleRecording}
            disabled={!isPolling}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6,
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

      {/* Scrollable content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
        {/* Newton Chat — top of content area */}
        <div style={{ marginBottom: 16 }}>
          <NewtonChat
            available={newton.available}
            loading={newton.loading}
            messages={newton.messages}
            askNewton={newton.askNewton}
            hasData={activePIDs.length > 0}
          />
        </div>

        {/* Stacked Time-Series Charts */}
        {activePIDs.length > 0 ? (
          <div id="live-charts" style={{
            display: 'grid',
            gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr',
            gap: 12,
            marginBottom: 16,
          }}>
            {activePIDs.map((def, i) => renderPIDChart(def, i))}
          </div>
        ) : isPolling ? (
          <div style={{ textAlign: 'center', padding: 40, color: theme.textSecondary, fontSize: 14 }}>
            Waiting for data...
          </div>
        ) : null}

        {/* Numerical Data Table */}
        {isPolling && activePIDs.length > 0 && (
          <div style={{
            padding: 12, backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`, borderRadius: 10, marginBottom: 16,
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
            {activePIDs.map((def) => {
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

      </div>

      {/* Start/Stop Button */}
      <div style={{ padding: '12px 24px', maxWidth: 480 }}>
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
    </div>
  );
}
