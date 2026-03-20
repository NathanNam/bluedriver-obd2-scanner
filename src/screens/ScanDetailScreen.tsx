// ============================================================
// ScanDetailScreen — read-only view of a past scan result
// ============================================================

import React, { useCallback } from 'react';
import { useThemeColors } from '../utils/hooks';
import { ScanResult } from '../types';
import { DTCCard } from '../components/DTCCard';
import { StatusBadge } from '../components/StatusBadge';

interface Props {
  params: { scan: ScanResult };
}

export function ScanDetailScreen({ params }: Props) {
  const theme = useThemeColors();
  const scan = params.scan;

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  const totalDTCs =
    scan.storedDTCs.length + scan.pendingDTCs.length + scan.permanentDTCs.length;

  const allDTCs = [...scan.storedDTCs, ...scan.pendingDTCs, ...scan.permanentDTCs];

  const handleExport = useCallback(async () => {
    const dtcList =
      allDTCs.length > 0
        ? allDTCs.map((d) => `${d.code} (${d.type}) - ${d.description}`).join('\n')
        : 'No fault codes';

    const report = [
      'OBD2 Scan Report',
      `Date: ${formatDate(scan.timestamp)}`,
      `VIN: ${scan.vin ?? 'N/A'}`,
      `Check Engine: ${scan.milStatus ? 'ON' : 'OFF'}`,
      `OBD Standard: ${scan.obdStandard ?? 'N/A'}`,
      '',
      '--- Fault Codes ---',
      dtcList,
    ].join('\n');

    if (navigator.share) {
      try {
        await navigator.share({ title: 'OBD2 Scan Report', text: report });
      } catch {
        /* cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(report);
        window.alert('Report copied to clipboard.');
      } catch {
        window.alert('Could not copy report.');
      }
    }
  }, [scan]);

  return (
    <div
      style={{
        minHeight: '100%',
        backgroundColor: theme.background,
        padding: 20,
        paddingBottom: 48,
      }}
    >
      {/* Vehicle Info */}
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
          {
            label: 'VIN',
            node: (
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: theme.text,
                  fontFamily: 'monospace',
                  userSelect: 'all' as const,
                }}
              >
                {scan.vin ?? 'N/A'}
              </span>
            ),
          },
          {
            label: 'Check Engine',
            node: (
              <StatusBadge
                label={scan.milStatus ? 'ON' : 'OFF'}
                color={scan.milStatus ? theme.critical : theme.success}
                size="small"
              />
            ),
          },
          {
            label: 'OBD Standard',
            node: (
              <span style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>
                {scan.obdStandard ?? 'N/A'}
              </span>
            ),
          },
          {
            label: 'Scanned',
            node: (
              <span style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>
                {formatDate(scan.timestamp)}
              </span>
            ),
          },
          {
            label: 'Fault Codes',
            node: (
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: totalDTCs > 0 ? theme.warning : theme.success,
                }}
              >
                {totalDTCs}
              </span>
            ),
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
            {row.node}
          </div>
        ))}
      </div>

      {/* DTCs */}
      {allDTCs.length > 0 ? (
        allDTCs.map((dtc) => (
          <DTCCard key={dtc.code + dtc.type} dtc={dtc} />
        ))
      ) : (
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: theme.success,
            textAlign: 'center',
            padding: '32px 0',
          }}
        >
          No fault codes found
        </div>
      )}

      {/* Export Button */}
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
          marginTop: 20,
        }}
      >
        Export Report
      </button>
    </div>
  );
}
