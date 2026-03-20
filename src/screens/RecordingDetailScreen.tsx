// ============================================================
// RecordingDetailScreen — playback & export of a recorded session
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { useThemeColors } from '../utils/hooks';
import { RecordingSession } from '../types';
import { PID_REGISTRY } from '../obd2/pids';
import { Gauge } from '../components/Gauge';

const CHART_HEIGHT = 150;
const CHART_SVG_WIDTH = 400;

interface Props {
  params: { recording: RecordingSession };
}

export function RecordingDetailScreen({ params }: Props) {
  const theme = useThemeColors();
  const recording = params.recording;
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dataPoints = recording.dataPoints;
  const uniquePIDs = [...new Set(dataPoints.map((d) => d.pid))];

  // Current values at playback index
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
  }, [isPlaying, dataPoints.length]);

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

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Recording CSV', text: csv });
      } catch {
        /* cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(csv);
        window.alert('CSV copied to clipboard.');
      } catch {
        window.alert('Could not copy CSV.');
      }
    }
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
  const chartPoints = primaryPID ? dataPoints.filter((d) => d.pid === primaryPID) : [];

  const renderChart = () => {
    if (!primaryPID || chartPoints.length < 2) return null;
    const def = PID_REGISTRY[primaryPID];
    if (!def) return null;

    const range = def.max - def.min || 1;
    const points = chartPoints
      .map((p, i) => {
        const x = (i / (chartPoints.length - 1)) * CHART_SVG_WIDTH;
        const y = CHART_HEIGHT - ((p.value - def.min) / range) * CHART_HEIGHT;
        return `${x},${Math.max(2, Math.min(CHART_HEIGHT - 2, y))}`;
      })
      .join(' ');

    return (
      <div
        style={{
          margin: '16px 0',
          padding: 10,
          backgroundColor: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: 10,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 600, color: theme.textSecondary, marginBottom: 6 }}>
          {def.shortName}
        </div>
        <svg
          viewBox={`0 0 ${CHART_SVG_WIDTH} ${CHART_HEIGHT}`}
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
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: theme.background,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Info Card */}
      <div
        style={{
          backgroundColor: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: 14,
          padding: 16,
          marginBottom: 16,
        }}
      >
        {[
          { label: 'Date', value: formatDate(recording.startTime) },
          { label: 'Duration', value: formatDuration() },
          { label: 'Data Points', value: String(dataPoints.length) },
          {
            label: 'Parameters',
            value: uniquePIDs.map((p) => PID_REGISTRY[p]?.shortName ?? p).join(', '),
          },
        ].map((row) => (
          <div
            key={row.label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 0',
            }}
          >
            <span style={{ fontSize: 14, color: theme.textSecondary }}>{row.label}</span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: theme.text,
                textAlign: 'right',
                maxWidth: '60%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {/* Small Gauges showing playback values */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          flexWrap: 'wrap',
          gap: 4,
          marginBottom: 8,
        }}
      >
        {uniquePIDs.slice(0, 4).map((pid) => {
          const def = PID_REGISTRY[pid];
          if (!def) return null;
          return (
            <Gauge key={pid} value={currentValues[pid] ?? null} definition={def} size={80} />
          );
        })}
      </div>

      {/* Chart */}
      {renderChart()}

      {/* Scrub info */}
      <div
        style={{
          textAlign: 'center',
          fontSize: 12,
          color: theme.textSecondary,
          marginBottom: 12,
        }}
      >
        {dataPoints.length > 0
          ? `${playbackIndex + 1} / ${dataPoints.length}`
          : 'No data points'}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Playback Controls */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={handlePlayPause}
          style={{
            flex: 1,
            padding: '14px 0',
            fontSize: 16,
            fontWeight: 600,
            color: '#FFFFFF',
            backgroundColor: theme.primary,
            border: 'none',
            borderRadius: 10,
            cursor: 'pointer',
          }}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={handleExportCSV}
          style={{
            flex: 1,
            padding: '14px 0',
            fontSize: 16,
            fontWeight: 600,
            color: theme.primary,
            backgroundColor: 'transparent',
            border: `1px solid ${theme.primary}`,
            borderRadius: 10,
            cursor: 'pointer',
          }}
        >
          Export CSV
        </button>
      </div>
    </div>
  );
}
