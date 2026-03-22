// ============================================================
// OBD2 PID Registry — Mode 01 real-time data definitions
// ============================================================

import { PIDDefinition } from '../types';

export const PID_REGISTRY: Record<string, PIDDefinition> = {
  '0C': {
    pid: '0C',
    name: 'Engine RPM',
    shortName: 'RPM',
    description: 'Revolutions per minute of the engine crankshaft. At idle, typically 600-1000 RPM. On hybrids, shows 0 when the gas engine is off and the electric motor is driving.',
    unit: 'RPM',
    min: 0,
    max: 8000,
    formula: (a, b = 0) => (256 * a + b) / 4,
    cautionThreshold: 5500,
    criticalThreshold: 7000,
  },
  '0D': {
    pid: '0D',
    name: 'Vehicle Speed',
    shortName: 'Speed',
    description: 'Current vehicle speed reported by the ECU. May differ slightly from the speedometer reading due to calibration.',
    unit: 'km/h',
    min: 0,
    max: 255,
    formula: (a) => a,
    cautionThreshold: 160,
    criticalThreshold: 200,
  },
  '05': {
    pid: '05',
    name: 'Coolant Temperature',
    shortName: 'Coolant',
    description: 'Engine coolant temperature. Normal operating range is 80-100°C. Below 70°C means the engine is still warming up. Above 105°C may indicate overheating — check coolant level and radiator fan.',
    unit: '°C',
    min: -40,
    max: 215,
    formula: (a) => a - 40,
    cautionThreshold: 105,
    criticalThreshold: 120,
  },
  '0F': {
    pid: '0F',
    name: 'Intake Air Temperature',
    shortName: 'IAT',
    description: 'Temperature of the air entering the engine intake. Reflects ambient temperature plus heat soak from the engine bay. Higher temps reduce engine efficiency.',
    unit: '°C',
    min: -40,
    max: 215,
    formula: (a) => a - 40,
    cautionThreshold: 60,
    criticalThreshold: 80,
  },
  '04': {
    pid: '04',
    name: 'Calculated Engine Load',
    shortName: 'Load',
    description: 'How hard the engine is working as a percentage of its maximum capacity. At idle: 15-25%. Cruising: 30-50%. Hard acceleration: 70-100%. Sustained high load generates more heat and wear.',
    unit: '%',
    min: 0,
    max: 100,
    formula: (a) => (a * 100) / 255,
    cautionThreshold: 80,
    criticalThreshold: 95,
  },
  '11': {
    pid: '11',
    name: 'Throttle Position',
    shortName: 'Throttle',
    description: 'How far the throttle body is open. 0% = closed (idle), 100% = wide open (full acceleration). Reflects driver input via the gas pedal.',
    unit: '%',
    min: 0,
    max: 100,
    formula: (a) => (a * 100) / 255,
  },
  '0B': {
    pid: '0B',
    name: 'Intake Manifold Pressure',
    shortName: 'MAP',
    description: 'Manifold Absolute Pressure — the air pressure inside the intake manifold. At sea level with engine off: ~101 kPa. At idle: 25-45 kPa. Higher values mean more air entering the engine (more load).',
    unit: 'kPa',
    min: 0,
    max: 255,
    formula: (a) => a,
  },
  '0E': {
    pid: '0E',
    name: 'Timing Advance',
    shortName: 'Timing',
    description: 'Ignition timing advance relative to top dead center. The ECU adjusts timing for optimal combustion. Negative values or erratic changes can indicate knock sensor issues.',
    unit: '°',
    min: -64,
    max: 63.5,
    formula: (a) => a / 2 - 64,
  },
  '2F': {
    pid: '2F',
    name: 'Fuel Tank Level',
    shortName: 'Fuel',
    description: 'Fuel level as a percentage of tank capacity. Note: OBD2 fuel level may not exactly match the dashboard gauge due to different sensor calibrations.',
    unit: '%',
    min: 0,
    max: 100,
    formula: (a) => (a * 100) / 255,
    cautionThreshold: 15,
    criticalThreshold: 5,
  },
  '5C': {
    pid: '5C',
    name: 'Oil Temperature',
    shortName: 'Oil Temp',
    description: 'Engine oil temperature. Normal: 90-110°C. Oil is most effective in this range. Cold oil is too thick; overheated oil loses its protective properties.',
    unit: '°C',
    min: -40,
    max: 210,
    formula: (a) => a - 40,
    cautionThreshold: 130,
    criticalThreshold: 150,
  },
  '06': {
    pid: '06',
    name: 'Short Term Fuel Trim (Bank 1)',
    shortName: 'STFT B1',
    description: 'Real-time fuel adjustment by the ECU. Positive = adding fuel (running lean). Negative = removing fuel (running rich). Normal range: -10% to +10%. Values beyond ±20% indicate a fuel delivery problem.',
    unit: '%',
    min: -100,
    max: 99.2,
    formula: (a) => (a / 1.28) - 100,
    cautionThreshold: 20,
    criticalThreshold: 30,
  },
  '07': {
    pid: '07',
    name: 'Long Term Fuel Trim (Bank 1)',
    shortName: 'LTFT B1',
    description: 'Learned fuel adjustment over time. Reflects persistent lean/rich conditions the ECU has adapted to. High positive values often indicate a vacuum leak or weak fuel pump.',
    unit: '%',
    min: -100,
    max: 99.2,
    formula: (a) => (a / 1.28) - 100,
    cautionThreshold: 15,
    criticalThreshold: 25,
  },
  '10': {
    pid: '10',
    name: 'MAF Air Flow Rate',
    shortName: 'MAF',
    description: 'Mass Air Flow — the mass of air entering the engine per second. The ECU uses this to calculate the correct fuel injection amount. Low readings at idle are normal; abnormally low readings at load may indicate a dirty or failing MAF sensor.',
    unit: 'g/s',
    min: 0,
    max: 655.35,
    formula: (a, b = 0) => (256 * a + b) / 100,
  },
};

export function getAllPIDs(): PIDDefinition[] {
  return Object.values(PID_REGISTRY);
}

export function getPID(pid: string): PIDDefinition | undefined {
  return PID_REGISTRY[pid.toUpperCase()];
}

export function buildPIDCommand(pid: string): string {
  return `01${pid.toUpperCase()}`;
}

export function getPIDDataBytes(pid: string): number {
  const twoBytePIDs = ['0C', '10'];
  return twoBytePIDs.includes(pid.toUpperCase()) ? 2 : 1;
}
