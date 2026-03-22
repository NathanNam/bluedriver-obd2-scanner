// ============================================================
// OBD2 PID Registry — Mode 01 real-time data definitions
// ============================================================

import { PIDDefinition } from '../types';

export const PID_REGISTRY: Record<string, PIDDefinition> = {
  '0C': {
    pid: '0C', name: 'Engine RPM', shortName: 'RPM',
    description: 'Engine crankshaft speed. Idle: 600-1000. Hybrids: 0 when on electric.',
    unit: 'RPM', min: 0, max: 8000,
    formula: (a, b = 0) => (256 * a + b) / 4,
    cautionThreshold: 5500, criticalThreshold: 7000,
  },
  '0D': {
    pid: '0D', name: 'Vehicle Speed', shortName: 'Speed',
    description: 'Vehicle speed from ECU. May differ slightly from dashboard.',
    unit: 'km/h', min: 0, max: 255,
    formula: (a) => a,
    cautionThreshold: 160, criticalThreshold: 200,
  },
  '05': {
    pid: '05', name: 'Coolant Temperature', shortName: 'Coolant',
    description: 'Engine coolant temp. Normal: 80-100°C. Above 105°C = overheating risk.',
    unit: '°C', min: -40, max: 215,
    formula: (a) => a - 40,
    cautionThreshold: 105, criticalThreshold: 120,
  },
  '0F': {
    pid: '0F', name: 'Intake Air Temperature', shortName: 'IAT',
    description: 'Air temperature entering the engine. Higher temps reduce efficiency.',
    unit: '°C', min: -40, max: 215,
    formula: (a) => a - 40,
    cautionThreshold: 60, criticalThreshold: 80,
  },
  '04': {
    pid: '04', name: 'Calculated Engine Load', shortName: 'Load',
    description: 'How hard the engine is working. Idle: 15-25%. Cruising: 30-50%.',
    unit: '%', min: 0, max: 100,
    formula: (a) => (a * 100) / 255,
    cautionThreshold: 80, criticalThreshold: 95,
  },
  '11': {
    pid: '11', name: 'Throttle Position', shortName: 'Throttle',
    description: 'Throttle opening. 0% = closed (idle), 100% = full acceleration.',
    unit: '%', min: 0, max: 100,
    formula: (a) => (a * 100) / 255,
  },
  '0B': {
    pid: '0B', name: 'Intake Manifold Pressure', shortName: 'MAP',
    description: 'Intake manifold air pressure. Sea level idle: ~30 kPa. Higher = more load.',
    unit: 'kPa', min: 0, max: 255,
    formula: (a) => a,
  },
  '0E': {
    pid: '0E', name: 'Timing Advance', shortName: 'Timing',
    description: 'Ignition timing relative to top dead center. ECU adjusts for optimal combustion.',
    unit: '°', min: -64, max: 63.5,
    formula: (a) => a / 2 - 64,
  },
  '2F': {
    pid: '2F', name: 'Fuel Tank Level', shortName: 'Fuel',
    description: 'Fuel level percentage. May differ slightly from dashboard gauge.',
    unit: '%', min: 0, max: 100,
    formula: (a) => (a * 100) / 255,
    cautionThreshold: 15, criticalThreshold: 5,
  },
  '5C': {
    pid: '5C', name: 'Oil Temperature', shortName: 'Oil Temp',
    description: 'Engine oil temp. Normal: 90-110°C. Overheated oil loses protection.',
    unit: '°C', min: -40, max: 210,
    formula: (a) => a - 40,
    cautionThreshold: 130, criticalThreshold: 150,
  },
  '06': {
    pid: '06', name: 'Short Term Fuel Trim (Bank 1)', shortName: 'STFT B1',
    description: 'Real-time fuel adjustment. Positive = lean, negative = rich. Normal: ±10%.',
    unit: '%', min: -100, max: 99.2,
    formula: (a) => (a / 1.28) - 100,
    cautionThreshold: 20, criticalThreshold: 30,
  },
  '07': {
    pid: '07', name: 'Long Term Fuel Trim (Bank 1)', shortName: 'LTFT B1',
    description: 'Learned fuel correction over time. High positive = vacuum leak or weak fuel pump.',
    unit: '%', min: -100, max: 99.2,
    formula: (a) => (a / 1.28) - 100,
    cautionThreshold: 15, criticalThreshold: 25,
  },
  '10': {
    pid: '10', name: 'MAF Air Flow Rate', shortName: 'MAF',
    description: 'Mass of air entering the engine per second. Used to calculate fuel injection.',
    unit: 'g/s', min: 0, max: 655.35,
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
