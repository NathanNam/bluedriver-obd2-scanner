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
  P0043: ['Faulty O2 sensor heater (B1S3)', 'Blown O2 heater fuse', 'Water in O2 sensor connector', 'Wiring issue'],
  P0047: ['Boost control solenoid issue', 'Wiring/connector problem', 'ECU fault'],
  P004A: ['Intermittent boost control circuit', 'Loose wiring', 'ECU fault'],
};

// Detailed explanations shown in expanded view
const DETAILED_INFO: Record<string, string> = {
  P0043: 'The ECM detected low voltage in the heater circuit for the oxygen sensor located after the catalytic converter (Bank 1, Sensor 3). This sensor monitors catalyst efficiency. A common cause is water intrusion into the sensor connector or a blown heater fuse. Not urgent — typically causes no drivability symptoms, but may affect emissions.',
  P0047: 'The ECM detected a low signal from the boost control solenoid circuit. On turbocharged vehicles, this controls boost pressure. On hybrid or naturally aspirated vehicles, this code number may be repurposed by the manufacturer for a different subsystem.',
  P004A: 'The ECM detected an intermittent or erratic signal in the boost control circuit. This indicates the signal drops in and out rather than being consistently low or high. Check wiring and connectors for loose or corroded pins.',
  P0171: 'The engine is running too lean on Bank 1 — more air than fuel in the mixture. The ECM uses long-term fuel trim data to detect this. Common on many vehicles and often caused by a vacuum leak or dirty MAF sensor.',
  P0172: 'The engine is running too rich on Bank 1 — more fuel than air in the mixture. Can cause poor fuel economy, rough idle, and black exhaust smoke.',
  P0300: 'Multiple cylinders are misfiring randomly. This is often caused by a system-wide issue rather than a single cylinder problem — vacuum leaks, fuel pressure, or ignition system faults.',
  P0420: 'The downstream O2 sensor shows the catalytic converter is not cleaning exhaust gases efficiently enough. This may be a failing catalyst, but can also be triggered by O2 sensor issues or exhaust leaks.',
  P0440: 'A leak has been detected in the evaporative emissions system, which captures fuel vapors from the gas tank. Often caused simply by a loose gas cap.',
  P0128: 'The engine coolant is not reaching the expected temperature within the expected time. Most commonly caused by a thermostat that is stuck open, allowing coolant to flow to the radiator too soon.',
};

// Codes that reference systems not present on all vehicles (e.g., turbo codes on NA/hybrid cars)
const MANUFACTURER_SPECIFIC_HINTS: Record<string, string> = {
  P0045: 'This code references turbocharger/supercharger systems. On naturally aspirated or hybrid vehicles, Toyota/Lexus may repurpose this code for hybrid system functions such as electric motor boost control, EGR, or intake control.',
  P0046: 'This code references turbocharger/supercharger systems. On naturally aspirated or hybrid vehicles, Toyota/Lexus may repurpose this code for hybrid system functions such as electric motor boost control, EGR, or intake control.',
  P0047: 'This code references turbocharger/supercharger systems. On naturally aspirated or hybrid vehicles (e.g., Lexus RX450h, Toyota Highlander Hybrid), Toyota/Lexus repurposes this code for hybrid system functions such as electric motor boost control, EGR valve, or intake manifold runner control. Consult a Toyota/Lexus dealer or Techstream diagnostic tool for the exact meaning.',
  P0048: 'This code references turbocharger/supercharger systems. On naturally aspirated or hybrid vehicles, Toyota/Lexus may repurpose this code for hybrid system functions such as electric motor boost control, EGR, or intake control.',
  P004A: 'This code references turbocharger/supercharger systems. On naturally aspirated or hybrid vehicles (e.g., Lexus RX450h, Toyota Highlander Hybrid), Toyota/Lexus repurposes this code for hybrid system functions such as electric motor boost control, EGR valve, or intake manifold runner control. The "intermittent/erratic" qualifier suggests a wiring or connector issue. Consult a Toyota/Lexus dealer or Techstream diagnostic tool for the exact meaning.',
  P004B: 'This code references turbocharger/supercharger systems. On naturally aspirated or hybrid vehicles, Toyota/Lexus may repurpose this code for hybrid system functions.',
  P004C: 'This code references turbocharger/supercharger systems. On naturally aspirated or hybrid vehicles, Toyota/Lexus may repurpose this code for hybrid system functions.',
};

export function DTCCard({ dtc }: Props) {
  const [expanded, setExpanded] = useState(false);
  const theme = useThemeColors();
  const severityColor = SEVERITY_COLORS[dtc.severity] ?? SEVERITY_COLORS.info;
  const causes = POTENTIAL_CAUSES[dtc.code] ?? [];
  const mfgHint = MANUFACTURER_SPECIFIC_HINTS[dtc.code];

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        border: `1px solid ${theme.border}`,
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        backgroundColor: theme.surface,
        cursor: (causes.length > 0 || mfgHint || DETAILED_INFO[dtc.code]) ? 'pointer' : 'default',
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

      {/* Detailed explanation */}
      {expanded && DETAILED_INFO[dtc.code] && (
        <div style={{
          marginTop: 8, padding: '8px 10px',
          backgroundColor: theme.surfaceSecondary, borderRadius: 6,
          fontSize: 13, lineHeight: '20px', color: theme.text,
        }}>
          {DETAILED_INFO[dtc.code]}
        </div>
      )}

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

      {/* Manufacturer-specific hint */}
      {expanded && mfgHint && (
        <div
          style={{
            marginTop: 8,
            padding: '8px 10px',
            backgroundColor: theme.info + '15',
            borderRadius: 6,
            borderLeft: `3px solid ${theme.info}`,
          }}
        >
          <span style={{ fontSize: 12, color: theme.text, lineHeight: '18px' }}>
            {mfgHint}
          </span>
        </div>
      )}

      {/* Expand hint */}
      {(causes.length > 0 || mfgHint) && (
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
