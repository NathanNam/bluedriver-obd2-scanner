// ============================================================
// HistoryScreen — past scan results & recording sessions
// ============================================================

import React from 'react';
import { useThemeColors } from '../utils/hooks';
import { useScanStore } from '../store/scanStore';
import { useLiveStore } from '../store/liveStore';
import { ScanResult, RecordingSession } from '../types';
import { StatusBadge } from '../components/StatusBadge';

type HistoryEntry =
  | { type: 'scan'; data: ScanResult }
  | { type: 'recording'; data: RecordingSession };

interface Props {
  onNavigate: (screen: string, params?: any) => void;
}

export function HistoryScreen({ onNavigate }: Props) {
  const theme = useThemeColors();
  const scanHistory = useScanStore((s) => s.scanHistory);
  const recordings = useLiveStore((s) => s.recordings);

  // Merge and sort by timestamp descending
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

  return (
    <div style={{ minHeight: '100%', backgroundColor: theme.background, padding: 20 }}>
      <h1 style={{ margin: '0 0 20px', fontSize: 28, fontWeight: 700, color: theme.text }}>
        History
      </h1>

      {entries.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 24px',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 600, color: theme.textSecondary }}>
            No scan history yet
          </div>
          <div
            style={{
              fontSize: 14,
              color: theme.textTertiary,
              textAlign: 'center',
              marginTop: 8,
            }}
          >
            Run a scan or start a live recording to see results here
          </div>
        </div>
      ) : (
        entries.map((entry) => {
          if (entry.type === 'scan') {
            const s = entry.data;
            const dtcCount =
              s.storedDTCs.length + s.pendingDTCs.length + s.permanentDTCs.length;

            return (
              <button
                key={s.id}
                onClick={() => onNavigate('scanDetail', { scan: s })}
                style={{
                  display: 'block',
                  width: '100%',
                  backgroundColor: theme.surface,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 10,
                  padding: 16,
                  marginBottom: 10,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <StatusBadge label="Scan" color={theme.primary} size="small" />
                  <span style={{ fontSize: 11, color: theme.textSecondary }}>
                    {formatDate(s.timestamp)}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                    fontFamily: 'monospace',
                    color: theme.text,
                    marginBottom: 8,
                  }}
                >
                  {s.vin ?? 'VIN not available'}
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: dtcCount > 0 ? theme.warning : theme.success,
                    }}
                  >
                    {dtcCount} fault code{dtcCount !== 1 ? 's' : ''}
                  </span>
                  {s.milStatus && (
                    <StatusBadge label="MIL ON" color={theme.critical} size="small" />
                  )}
                </div>
              </button>
            );
          }

          // Recording
          const r = entry.data;
          return (
            <button
              key={r.id}
              onClick={() => onNavigate('recordingDetail', { recording: r })}
              style={{
                display: 'block',
                width: '100%',
                backgroundColor: theme.surface,
                border: `1px solid ${theme.border}`,
                borderRadius: 10,
                padding: 16,
                marginBottom: 10,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <StatusBadge label="Recording" color={theme.success} size="small" />
                <span style={{ fontSize: 11, color: theme.textSecondary }}>
                  {formatDate(r.startTime)}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>
                  Duration: {formatDuration(r.startTime, r.endTime)}
                </span>
                <span style={{ fontSize: 11, color: theme.textSecondary }}>
                  {r.dataPoints.length} data points
                </span>
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}
