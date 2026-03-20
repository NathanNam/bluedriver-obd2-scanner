// ============================================================
// OBD2 PID Registry — Mode 01 real-time data definitions
// ============================================================

import { PIDDefinition } from '../types';

export const PID_REGISTRY: Record<string, PIDDefinition> = {
  '0C': {
    pid: '0C',
    name: 'Engine RPM',
    shortName: 'RPM',
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
    unit: '%',
    min: 0,
    max: 100,
    formula: (a) => (a * 100) / 255,
  },
  '0B': {
    pid: '0B',
    name: 'Intake Manifold Pressure',
    shortName: 'MAP',
    unit: 'kPa',
    min: 0,
    max: 255,
    formula: (a) => a,
  },
  '0E': {
    pid: '0E',
    name: 'Timing Advance',
    shortName: 'Timing',
    unit: '°',
    min: -64,
    max: 63.5,
    formula: (a) => a / 2 - 64,
  },
  '2F': {
    pid: '2F',
    name: 'Fuel Tank Level',
    shortName: 'Fuel',
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
    unit: 'g/s',
    min: 0,
    max: 655.35,
    formula: (a, b = 0) => (256 * a + b) / 100,
  },
};

/**
 * Get ordered list of all supported PID definitions
 */
export function getAllPIDs(): PIDDefinition[] {
  return Object.values(PID_REGISTRY);
}

/**
 * Get PID definition by hex code
 */
export function getPID(pid: string): PIDDefinition | undefined {
  return PID_REGISTRY[pid.toUpperCase()];
}

/**
 * Build OBD2 Mode 01 request command for a PID
 */
export function buildPIDCommand(pid: string): string {
  return `01${pid.toUpperCase()}`;
}

/**
 * Number of data bytes expected for a PID response
 */
export function getPIDDataBytes(pid: string): number {
  const twoBytePIDs = ['0C', '10'];
  return twoBytePIDs.includes(pid.toUpperCase()) ? 2 : 1;
}
