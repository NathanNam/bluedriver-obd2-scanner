// ============================================================
// OBD2 Scanner App — Core Type Definitions
// ============================================================

// --- Bluetooth Connection States ---

export type ConnectionState =
  | 'IDLE'
  | 'SCANNING'
  | 'CONNECTING'
  | 'INITIALIZING'
  | 'READY'
  | 'SCANNING_OBD'
  | 'ERROR'
  | 'DISCONNECTED';

export interface DiscoveredDevice {
  id: string;
  name: string | null;
  rssi: number | null;
}

// --- OBD2 / ELM327 ---

export interface ParsedPID {
  pid: string;
  name: string;
  value: number;
  unit: string;
  raw: string;
  timestamp: number;
}

export type DTCType = 'stored' | 'pending' | 'permanent';

export type DTCSeverity = 'critical' | 'warning' | 'info';

export type DTCSystem = 'Powertrain' | 'Body' | 'Chassis' | 'Network';

export interface DTC {
  code: string;
  description: string;
  type: DTCType;
  severity: DTCSeverity;
  system: DTCSystem;
}

export interface FreezeFrame {
  rpm: number | null;
  speed: number | null;
  coolantTemp: number | null;
  engineLoad: number | null;
  shortTermFuelTrim: number | null;
  longTermFuelTrim: number | null;
  intakeManifoldPressure: number | null;
  timingAdvance: number | null;
}

export interface RawLogEntry {
  command: string;
  description: string;
  rawResponse: string;
  parsedSummary: string;
}

export interface ScanResult {
  id: string;
  timestamp: number;
  vin: string | null;
  calibrationId: string | null;
  milStatus: boolean;
  obdStandard: string | null;
  protocol: string | null;
  storedDTCs: DTC[];
  pendingDTCs: DTC[];
  permanentDTCs: DTC[];
  freezeFrame: FreezeFrame | null;
  rawLog: RawLogEntry[];
}

// --- Live Scan Stats & Alerts ---

export interface PIDStats {
  min: number;
  max: number;
  sum: number;
  count: number;
  avg: number;
}

export interface PIDAlert {
  pid: string;
  name: string;
  value: number;
  threshold: number;
  unit: string;
  timestamp: number;
}

// --- Live Scan ---

export interface PIDDefinition {
  pid: string;
  name: string;
  shortName: string;
  unit: string;
  min: number;
  max: number;
  formula: (a: number, b?: number) => number;
  cautionThreshold?: number;
  criticalThreshold?: number;
}

export interface GaugeConfig {
  slotIndex: number;
  pid: string;
}

export interface LiveDataPoint {
  pid: string;
  value: number;
  timestamp: number;
}

export interface RecordingSession {
  id: string;
  startTime: number;
  endTime: number | null;
  vin: string | null;
  dataPoints: LiveDataPoint[];
}

// --- History ---

export type HistoryItem =
  | { type: 'scan'; data: ScanResult }
  | { type: 'recording'; data: RecordingSession };

// --- Settings ---

export type UnitSystem = 'imperial' | 'metric';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppSettings {
  unitSystem: UnitSystem;
  themeMode: ThemeMode;
  gaugeConfig: GaugeConfig[];
}
