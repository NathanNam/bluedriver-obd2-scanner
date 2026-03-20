// ============================================================
// DTCCard — expandable card showing a single Diagnostic Trouble Code
// ============================================================

import React, { useState } from 'react';
import { DTC } from '../types';
import { StatusBadge } from './StatusBadge';
import { useThemeColors } from '../utils/hooks';

interface Props {
  dtc: DTC;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#FF3B30',
  warning: '#FF9500',
  info: '#5AC8FA',
};

const POTENTIAL_CAUSES: Record<string, string[]> = {
  P0300: ['Worn spark plugs', 'Faulty ignition coils', 'Vacuum leak', 'Low fuel pressure', 'Clogged fuel injectors'],
  P0301: ['Bad spark plug (Cyl 1)', 'Faulty ignition coil (Cyl 1)', 'Fuel injector issue (Cyl 1)'],
  P0302: ['Bad spark plug (Cyl 2)', 'Faulty ignition coil (Cyl 2)', 'Fuel injector issue (Cyl 2)'],
  P0303: ['Bad spark plug (Cyl 3)', 'Faulty ignition coil (Cyl 3)', 'Fuel injector issue (Cyl 3)'],
  P0304: ['Bad spark plug (Cyl 4)', 'Faulty ignition coil (Cyl 4)', 'Fuel injector issue (Cyl 4)'],
  P0171: ['Vacuum leak', 'Dirty MAF sensor', 'Weak fuel pump', 'Clogged fuel filter'],
  P0172: ['Dirty air filter', 'Leaking fuel injector', 'Faulty O2 sensor', 'Faulty fuel pressure regulator'],
  P0174: ['Vacuum leak', 'Dirty MAF sensor', 'Weak fuel pump', 'Exhaust leak before O2 sensor'],
  P0175: ['Dirty air filter', 'Leaking fuel injector', 'Faulty O2 sensor'],
  P0420: ['Catalytic converter efficiency', 'O2 sensor issue', 'Exhaust leak', 'Engine misfire damaging catalyst'],
  P0430: ['Catalytic converter efficiency (Bank 2)', 'O2 sensor issue (Bank 2)'],
  P0440: ['Loose or damaged gas cap', 'EVAP canister leak', 'EVAP line damage'],
  P0442: ['Loose gas cap', 'Small EVAP system leak', 'Cracked charcoal canister'],
  P0455: ['Missing gas cap', 'Disconnected EVAP line', 'Faulty purge valve'],
  P0128: ['Stuck open thermostat', 'Low coolant', 'Faulty ECT sensor'],
};

export function DTCCard({ dtc }: Props) {
  const [expanded, setExpanded] = useState(false);
  const theme = useThemeColors();
  const severityColor = SEVERITY_COLORS[dtc.severity] ?? SEVERITY_COLORS.info;
  const causes = POTENTIAL_CAUSES[dtc.code] ?? [];

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        border: `1px solid ${theme.border}`,
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        backgroundColor: theme.surface,
        cursor: causes.length > 0 ? 'pointer' : 'default',
        userSelect: 'none',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 17,
              fontWeight: 700,
              fontFamily: 'monospace',
              color: theme.text,
            }}
          >
            {dtc.code}
          </span>
          <StatusBadge
            label={dtc.severity.charAt(0).toUpperCase() + dtc.severity.slice(1)}
            color={severityColor}
            size="small"
          />
          {dtc.type !== 'stored' && (
            <StatusBadge
              label={dtc.type === 'pending' ? 'Pending' : 'Permanent'}
              color={dtc.type === 'pending' ? '#FF9500' : '#AF52DE'}
              size="small"
            />
          )}
        </div>
        <span
          style={{
            fontSize: 11,
            marginTop: 2,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            color: theme.textSecondary,
            display: 'block',
          }}
        >
          {dtc.system}
        </span>
      </div>

      {/* Description */}
      <span style={{ fontSize: 15, lineHeight: '22px', color: theme.text, display: 'block' }}>
        {dtc.description}
      </span>

      {/* Expanded causes */}
      {expanded && causes.length > 0 && (
        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: `1px solid ${theme.border}`,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: theme.textSecondary,
              display: 'block',
              marginBottom: 4,
            }}
          >
            Potential Causes:
          </span>
          {causes.map((cause, i) => (
            <span
              key={i}
              style={{
                fontSize: 13,
                lineHeight: '20px',
                paddingLeft: 8,
                color: theme.text,
                display: 'block',
              }}
            >
              {'\u2022'} {cause}
            </span>
          ))}
        </div>
      )}

      {/* Expand hint */}
      {causes.length > 0 && (
        <span
          style={{
            fontSize: 11,
            marginTop: 4,
            textAlign: 'right',
            color: theme.textTertiary,
            display: 'block',
          }}
        >
          {expanded ? 'Click to collapse' : 'Click for details'}
        </span>
      )}
    </div>
  );
}
