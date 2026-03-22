// ============================================================
// ScanScreen — one-time diagnostic scan results
// ============================================================

import React, { useEffect, useCallback, useState } from 'react';
import { useThemeColors } from '../utils/hooks';
import { useScanStore } from '../store/scanStore';
import { DTCCard } from '../components/DTCCard';
import { StatusBadge } from '../components/StatusBadge';
import { DTC, FreezeFrame, RawLogEntry } from '../types';

interface Props {
  onNavigate: (screen: string, params?: any) => void;
}

export function ScanScreen({ onNavigate }: Props) {
  const theme = useThemeColors();
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

  const handleClearCodes = useCallback(async () => {
    const ok = window.confirm(
      'Clear all stored DTCs and turn off the Check Engine light?\n\n' +
        'Warning: Clearing codes does not fix the underlying problem. ' +
        'If the issue persists, the codes will return.'
    );
    if (!ok) return;
    const success = await clearCodes();
    if (success) {
      window.alert('Codes cleared. Re-scanning to verify...');
      startScan();
    } else {
      window.alert('Failed to clear codes. Please try again.');
    }
  }, [clearCodes, startScan]);

  const buildReportText = useCallback(() => {
    if (!currentResult) return '';
    const r = currentResult;
    const allDTCs = [...r.storedDTCs, ...r.pendingDTCs, ...r.permanentDTCs];
    const dtcList =
      allDTCs.length > 0
        ? allDTCs.map((d) => `  ${d.code} (${d.type}) - ${d.description}`).join('\n')
        : '  No fault codes found';

    const lines = [
      'OBD2 Scan Report',
      `Date: ${new Date(r.timestamp).toLocaleString()}`,
      '',
      '--- Vehicle Info ---',
      `VIN: ${r.vin ?? 'N/A'}`,
      `Calibration ID: ${r.calibrationId ?? 'N/A'}`,
      `Check Engine Light: ${r.milStatus ? 'ON' : 'OFF'}`,
      `OBD Standard: ${r.obdStandard ?? 'N/A'}`,
      '',
      '--- Fault Codes ---',
      dtcList,
    ];

    if (r.freezeFrame) {
      const ff = r.freezeFrame;
      lines.push(
        '',
        '--- Freeze Frame Data ---',
        `RPM: ${ff.rpm ?? 'N/A'}`,
        `Speed: ${ff.speed ?? 'N/A'} km/h`,
        `Coolant Temp: ${ff.coolantTemp ?? 'N/A'} °C`,
        `Engine Load: ${ff.engineLoad ?? 'N/A'} %`,
        `STFT: ${ff.shortTermFuelTrim ?? 'N/A'} %`,
        `LTFT: ${ff.longTermFuelTrim ?? 'N/A'} %`,
        `MAP: ${ff.intakeManifoldPressure ?? 'N/A'} kPa`,
        `Timing: ${ff.timingAdvance ?? 'N/A'} °`
      );
    }

    return lines.join('\n');
  }, [currentResult]);

  const handleExport = useCallback(async () => {
    const text = buildReportText();
    if (!text) return;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'OBD2 Scan Report', text });
      } catch {
        /* cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        window.alert('Report copied to clipboard.');
      } catch {
        window.alert('Could not copy report.');
      }
    }
  }, [buildReportText]);

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  // --- Scanning in progress ---
  if (isScanning) {
    return (
      <div
        style={{
          minHeight: '100%',
          backgroundColor: theme.background,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: `4px solid ${theme.gaugeArc}`,
            borderTopColor: theme.primary,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ fontSize: 18, fontWeight: 500, color: theme.text, marginTop: 20 }}>
          {scanStage}
        </div>
        <div
          style={{
            width: '80%',
            maxWidth: 320,
            height: 6,
            borderRadius: 3,
            backgroundColor: theme.gaugeArc,
            marginTop: 16,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${scanProgress * 100}%`,
              height: '100%',
              borderRadius: 3,
              backgroundColor: theme.primary,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <div style={{ fontSize: 13, color: theme.textSecondary, marginTop: 8 }}>
          {Math.round(scanProgress * 100)}%
        </div>
      </div>
    );
  }

  // --- No result ---
  if (!currentResult) {
    return (
      <div
        style={{
          minHeight: '100%',
          backgroundColor: theme.background,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        }}
      >
        <div style={{ fontSize: 18, color: theme.text, textAlign: 'center', marginBottom: 20 }}>
          {error ?? 'No scan results'}
        </div>
        <button
          onClick={startScan}
          style={{
            padding: '12px 32px',
            fontSize: 16,
            fontWeight: 600,
            color: '#FFFFFF',
            backgroundColor: theme.primary,
            border: 'none',
            borderRadius: 10,
            cursor: 'pointer',
          }}
        >
          Retry Scan
        </button>
      </div>
    );
  }

  // --- Results ---
  const r = currentResult;
  const totalDTCs = r.storedDTCs.length + r.pendingDTCs.length + r.permanentDTCs.length;

  const renderDTCSection = (title: string, dtcs: DTC[]) => {
    if (dtcs.length === 0) return null;
    return (
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.5,
            color: theme.textSecondary,
            marginBottom: 8,
            textTransform: 'uppercase',
          }}
        >
          {title} ({dtcs.length})
        </div>
        {dtcs.map((dtc) => (
          <DTCCard key={dtc.code + dtc.type} dtc={dtc} />
        ))}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100%', backgroundColor: theme.background, padding: 24, paddingBottom: 48 }}>
      {/* Vehicle Info Card */}
      <div
        style={{
          backgroundColor: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: 14,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.5,
            color: theme.textSecondary,
            marginBottom: 10,
            textTransform: 'uppercase',
          }}
        >
          Vehicle Info
        </div>
        {[
          { label: 'VIN', node: <span style={{ fontSize: 14, fontWeight: 500, color: theme.text, fontFamily: 'monospace', userSelect: 'all' as const }}>{r.vin ?? 'N/A'}</span> },
          {
            label: 'Check Engine',
            node: (
              <StatusBadge
                label={r.milStatus ? 'ON' : 'OFF'}
                color={r.milStatus ? theme.critical : theme.success}
                size="small"
              />
            ),
          },
          { label: 'OBD Standard', node: <span style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>{r.obdStandard ?? 'N/A'}</span> },
          { label: 'Scanned', node: <span style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>{formatDate(r.timestamp)}</span> },
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
            {row.node}
          </div>
        ))}
      </div>

      {/* DTC Summary */}
      <div
        style={{
          backgroundColor: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: 14,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.5,
            color: theme.textSecondary,
            marginBottom: 10,
            textTransform: 'uppercase',
          }}
        >
          Fault Codes
        </div>
        {totalDTCs === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: theme.success }}>
              No fault codes found
            </div>
            <div style={{ fontSize: 13, color: theme.textSecondary, marginTop: 4 }}>
              Your vehicle is not reporting any issues
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 16, fontWeight: 600, color: theme.text }}>
            {totalDTCs} code{totalDTCs !== 1 ? 's' : ''} found
          </div>
        )}
      </div>

      {/* DTC Sections */}
      {renderDTCSection('Stored', r.storedDTCs)}
      {renderDTCSection('Pending', r.pendingDTCs)}
      {renderDTCSection('Permanent', r.permanentDTCs)}

      {/* Freeze Frame */}
      {r.freezeFrame && <FreezeFrameTable frame={r.freezeFrame} theme={theme} />}

      {/* Raw Data Log (collapsible) */}
      {r.rawLog && r.rawLog.length > 0 && <RawDataLog entries={r.rawLog} theme={theme} />}

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
        {totalDTCs > 0 && (
          <button
            onClick={handleClearCodes}
            style={{
              width: '100%',
              padding: '14px 0',
              fontSize: 16,
              fontWeight: 600,
              color: '#FFFFFF',
              backgroundColor: theme.critical,
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
            }}
          >
            Clear Codes
          </button>
        )}
        <button
          onClick={handleExport}
          style={{
            width: '100%',
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
          Export Report
        </button>
        <button
          onClick={startScan}
          style={{
            width: '100%',
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
          Scan Again
        </button>
      </div>
    </div>
  );
}

// --- Freeze Frame Table Sub-component ---

function RawDataLog({ entries, theme }: { entries: RawLogEntry[]; theme: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        backgroundColor: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          padding: 0,
          background: 'none',
          cursor: 'pointer',
        }}
      >
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, color: theme.textSecondary, textTransform: 'uppercase' as const }}>
            Raw Scan Data
          </div>
          <div style={{ fontSize: 11, color: theme.textTertiary, marginTop: 2, textAlign: 'left' as const }}>
            {entries.length} commands sent — {expanded ? 'click to collapse' : 'click to expand'}
          </div>
        </div>
        <span style={{ fontSize: 16, color: theme.textTertiary }}>{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div style={{ marginTop: 12 }}>
          {entries.map((entry, i) => (
            <div
              key={i}
              style={{
                padding: '10px 0',
                borderTop: i > 0 ? `1px solid ${theme.border}` : 'none',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{entry.description}</span>
                <code style={{ fontSize: 11, color: theme.primary, fontFamily: 'monospace' }}>{entry.command}</code>
              </div>
              <div style={{
                fontSize: 11, fontFamily: 'monospace', color: theme.textSecondary,
                backgroundColor: theme.surfaceSecondary, padding: '6px 8px', borderRadius: 6,
                overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              }}>
                {entry.rawResponse}
              </div>
              <div style={{ fontSize: 11, color: theme.textTertiary, marginTop: 4 }}>
                Parsed: {entry.parsedSummary}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
    <div
      style={{
        backgroundColor: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 0.5,
          color: theme.textSecondary,
          marginBottom: 4,
          textTransform: 'uppercase',
        }}
      >
        Freeze Frame Data
      </div>
      <div style={{ fontSize: 11, color: theme.textTertiary, marginBottom: 10 }}>
        Snapshot of engine data when the first fault code was set
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} style={{ borderBottom: `1px solid ${theme.border}` }}>
              <td style={{ padding: '8px 0', fontSize: 14, color: theme.textSecondary }}>
                {row.label}
              </td>
              <td
                style={{
                  padding: '8px 0',
                  fontSize: 14,
                  fontWeight: 600,
                  color: theme.text,
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {row.value !== null ? `${row.value} ${row.unit}` : 'N/A'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
