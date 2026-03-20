// ============================================================
// ELM327 Command Builder & Sequencer
// ============================================================

/**
 * ELM327 AT commands for adapter initialization
 */
export interface InitStep {
  command: string;
  description: string;
  expected?: string;
  expectedContains?: string;
}

export const ELM327_INIT_SEQUENCE: InitStep[] = [
  { command: 'ATZ', description: 'Reset adapter', expectedContains: 'ELM327' },
  { command: 'ATE0', description: 'Echo off', expected: 'OK' },
  { command: 'ATL0', description: 'Linefeeds off', expected: 'OK' },
  { command: 'ATH0', description: 'Headers off', expected: 'OK' },
  { command: 'ATSP0', description: 'Auto-detect protocol', expected: 'OK' },
];

/**
 * Initialization sequence for live scan mode (headers on for multi-ECU)
 */
export const ELM327_LIVE_INIT = [
  { command: 'ATH1', description: 'Headers on', expected: 'OK' },
  { command: 'ATAT1', description: 'Adaptive timing level 1', expected: 'OK' },
] as const;

/**
 * One-time scan command sequence
 */
export const SCAN_COMMANDS = {
  // Vehicle info
  vin: '0902',
  calibrationId: '0904',
  monitorStatus: '0101',
  obdStandard: '011C',

  // DTC reading
  storedDTCs: '03',
  pendingDTCs: '07',
  permanentDTCs: '0A',

  // Supported PIDs (to check what vehicle supports)
  supportedPIDs_01_20: '0100',
  supportedPIDs_21_40: '0120',
  supportedPIDs_41_60: '0140',

  // Clear codes
  clearDTCs: '04',
} as const;

/**
 * Freeze frame commands — Mode 02 with frame 00
 */
export const FREEZE_FRAME_PIDS = [
  { command: '0204 00', pid: '04', name: 'Engine Load' },
  { command: '0205 00', pid: '05', name: 'Coolant Temp' },
  { command: '0206 00', pid: '06', name: 'Short Term Fuel Trim' },
  { command: '0207 00', pid: '07', name: 'Long Term Fuel Trim' },
  { command: '020B 00', pid: '0B', name: 'Intake Manifold Pressure' },
  { command: '020C 00', pid: '0C', name: 'Engine RPM' },
  { command: '020D 00', pid: '0D', name: 'Vehicle Speed' },
  { command: '020E 00', pid: '0E', name: 'Timing Advance' },
] as const;

/**
 * Build a Mode 01 PID request
 */
export function buildMode01Command(pid: string): string {
  return `01${pid.toUpperCase()}`;
}

/**
 * Add a carriage return terminator (required by ELM327)
 */
export function terminateCommand(command: string): string {
  return `${command}\r`;
}
