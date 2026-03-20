// ============================================================
// Bluetooth Connection Manager
//
// In Expo Go: runs in DEMO mode with simulated OBD2 responses.
// In a development build: swap in real BLE via react-native-ble-plx.
//
// To enable real BLE:
//   1. npm install react-native-ble-plx
//   2. npx expo run:ios (development build)
//   3. Set USE_REAL_BLE = true below
// ============================================================

import { ConnectionState, DiscoveredDevice } from '../types';
import { ELM327_INIT_SEQUENCE, terminateCommand } from '../obd2/commands';

// Toggle this to switch between demo and real BLE
const USE_REAL_BLE = false;

const SCAN_TIMEOUT_MS = 15000;
const COMMAND_TIMEOUT_MS = 5000;
const BUS_BUSY_RETRY_DELAY_MS = 200;
const BUS_BUSY_MAX_RETRIES = 3;

type StateListener = (state: ConnectionState) => void;
type DeviceListener = (device: DiscoveredDevice) => void;
type ErrorListener = (error: string) => void;

// --- Simulated OBD2 Responses ---

const DEMO_RESPONSES: Record<string, string> = {
  // Init
  'ATZ': 'ELM327 v2.1 >',
  'ATE0': 'OK >',
  'ATL0': 'OK >',
  'ATH0': 'OK >',
  'ATH1': 'OK >',
  'ATSP0': 'OK >',
  'ATAT1': 'OK >',
  // Supported PIDs
  '0100': '41 00 BE 3E B8 13 >',
  '0120': '41 20 80 05 B0 15 >',
  // VIN
  '0902': '49 02 01 31 47 31 59 43 32 45 30 35 5A 31 31 33 34 35 36 37 >',
  // Calibration ID
  '0904': '49 04 01 45 43 55 31 32 33 >',
  // Monitor status — MIL ON, 2 DTCs
  '0101': '41 01 82 07 65 00 >',
  // OBD Standard
  '011C': '41 1C 06 >',
  // Stored DTCs — P0301, P0420
  '03': '43 03 01 04 20 00 00 >',
  // Pending DTCs — P0171
  '07': '47 01 71 00 00 00 00 >',
  // Permanent DTCs
  '0A': '4A 00 00 00 00 00 00 >',
  // Clear DTCs
  '04': '44 >',
  // Freeze frame
  '0204 00': '42 04 9A >',
  '0205 00': '42 05 7B >',
  '0206 00': '42 06 82 >',
  '0207 00': '42 07 80 >',
  '020B 00': '42 0B 62 >',
  '020C 00': '42 0C 1A F8 >',
  '020D 00': '42 0D 00 >',
  '020E 00': '42 0E 8E >',
};

// Live PID simulation — returns realistic fluctuating values
function simulateLivePID(pid: string): string {
  const now = Date.now();
  const wave = Math.sin(now / 2000); // slow oscillation
  const noise = (Math.random() - 0.5) * 0.1;

  const sims: Record<string, () => string> = {
    '0C': () => { // RPM: 750-3500
      const rpm = Math.round(750 + (wave + 1) * 1375 + noise * 500);
      const encoded = rpm * 4;
      const a = (encoded >> 8) & 0xFF;
      const b = encoded & 0xFF;
      return `41 0C ${a.toString(16).padStart(2, '0').toUpperCase()} ${b.toString(16).padStart(2, '0').toUpperCase()} >`;
    },
    '0D': () => { // Speed: 0-120 km/h
      const speed = Math.max(0, Math.round(60 + wave * 60 + noise * 20));
      return `41 0D ${speed.toString(16).padStart(2, '0').toUpperCase()} >`;
    },
    '05': () => { // Coolant temp: 85-100°C (value + 40)
      const temp = Math.round(92 + wave * 5 + noise * 3);
      return `41 05 ${(temp + 40).toString(16).padStart(2, '0').toUpperCase()} >`;
    },
    '04': () => { // Engine load: 20-70%
      const load = Math.round(45 + wave * 25 + noise * 10);
      const encoded = Math.round((load / 100) * 255);
      return `41 04 ${encoded.toString(16).padStart(2, '0').toUpperCase()} >`;
    },
    '11': () => { // Throttle: 10-80%
      const throttle = Math.max(0, Math.round(40 + wave * 35 + noise * 15));
      const encoded = Math.round((throttle / 100) * 255);
      return `41 11 ${encoded.toString(16).padStart(2, '0').toUpperCase()} >`;
    },
    '0F': () => { // IAT: 25-45°C
      const temp = Math.round(35 + wave * 5);
      return `41 0F ${(temp + 40).toString(16).padStart(2, '0').toUpperCase()} >`;
    },
    '0B': () => { // MAP: 30-100 kPa
      const map = Math.round(65 + wave * 30 + noise * 10);
      return `41 0B ${map.toString(16).padStart(2, '0').toUpperCase()} >`;
    },
    '0E': () => { // Timing advance
      const timing = Math.round(15 + wave * 10);
      const encoded = (timing + 64) * 2;
      return `41 0E ${encoded.toString(16).padStart(2, '0').toUpperCase()} >`;
    },
    '2F': () => { // Fuel level: ~65%
      const level = Math.round(65 - (now / 100000) % 5);
      const encoded = Math.round((level / 100) * 255);
      return `41 2F ${encoded.toString(16).padStart(2, '0').toUpperCase()} >`;
    },
    '5C': () => { // Oil temp: 90-110°C
      const temp = Math.round(100 + wave * 8);
      return `41 5C ${(temp + 40).toString(16).padStart(2, '0').toUpperCase()} >`;
    },
    '06': () => { // STFT: -5% to +5%
      const trim = Math.round(128 + wave * 6);
      return `41 06 ${trim.toString(16).padStart(2, '0').toUpperCase()} >`;
    },
    '07': () => { // LTFT: -3% to +3%
      const trim = Math.round(128 + wave * 4);
      return `41 07 ${trim.toString(16).padStart(2, '0').toUpperCase()} >`;
    },
    '10': () => { // MAF: 3-25 g/s
      const maf = Math.round(14 + wave * 11 + noise * 3);
      const encoded = maf * 100;
      const a = (encoded >> 8) & 0xFF;
      const b = encoded & 0xFF;
      return `41 10 ${a.toString(16).padStart(2, '0').toUpperCase()} ${b.toString(16).padStart(2, '0').toUpperCase()} >`;
    },
  };

  const sim = sims[pid.toUpperCase()];
  if (sim) return sim();
  return 'NO DATA >';
}

// ============================================================

class BluetoothManager {
  private _connectionState: ConnectionState = 'IDLE';
  private _connectedDeviceName: string | null = null;
  private _isDemo = !USE_REAL_BLE;

  private stateListeners: StateListener[] = [];
  private deviceListeners: DeviceListener[] = [];
  private errorListeners: ErrorListener[] = [];

  // --- State Management ---

  get connectionState(): ConnectionState {
    return this._connectionState;
  }

  private setState(state: ConnectionState) {
    this._connectionState = state;
    this.stateListeners.forEach((fn) => fn(state));
  }

  onStateChange(listener: StateListener): () => void {
    this.stateListeners.push(listener);
    return () => {
      this.stateListeners = this.stateListeners.filter((l) => l !== listener);
    };
  }

  onDeviceDiscovered(listener: DeviceListener): () => void {
    this.deviceListeners.push(listener);
    return () => {
      this.deviceListeners = this.deviceListeners.filter((l) => l !== listener);
    };
  }

  onError(listener: ErrorListener): () => void {
    this.errorListeners.push(listener);
    return () => {
      this.errorListeners = this.errorListeners.filter((l) => l !== listener);
    };
  }

  private emitError(error: string) {
    this.errorListeners.forEach((fn) => fn(error));
  }

  // --- Scanning ---

  async startScan(): Promise<void> {
    if (this._connectionState !== 'IDLE' && this._connectionState !== 'DISCONNECTED') {
      return;
    }

    this.setState('SCANNING');

    if (this._isDemo) {
      // Simulate discovering a BlueDriver device
      await this.delay(800);
      this.deviceListeners.forEach((fn) =>
        fn({ id: 'DEMO-BLUEDRIVER-001', name: 'BlueDriver Pro (Demo)', rssi: -45 })
      );
      await this.delay(400);
      this.deviceListeners.forEach((fn) =>
        fn({ id: 'DEMO-ELM327-002', name: 'ELM327 OBD-II (Demo)', rssi: -62 })
      );
      return;
    }

    // Real BLE scan would go here
  }

  stopScan(): void {
    if (this._connectionState === 'SCANNING') {
      this.setState('IDLE');
    }
  }

  // --- Connection ---

  async connect(deviceId: string): Promise<boolean> {
    this.setState('CONNECTING');

    if (this._isDemo) {
      await this.delay(600);
      this.setState('INITIALIZING');
      this._connectedDeviceName = deviceId.includes('BLUEDRIVER')
        ? 'BlueDriver Pro (Demo)'
        : 'ELM327 OBD-II (Demo)';
      await this.delay(800);
      this.setState('READY');
      return true;
    }

    // Real BLE connection would go here
    this.emitError('Real BLE not configured. Set USE_REAL_BLE = true and use a dev build.');
    this.setState('ERROR');
    return false;
  }

  async disconnect(): Promise<void> {
    this._connectedDeviceName = null;
    this.setState('IDLE');
  }

  // --- Command Sending ---

  async sendCommand(command: string, timeout = COMMAND_TIMEOUT_MS): Promise<string> {
    if (this._isDemo) {
      await this.delay(30 + Math.random() * 70); // simulate latency

      // Check static responses
      const trimmed = command.trim().toUpperCase();
      if (DEMO_RESPONSES[trimmed]) {
        return DEMO_RESPONSES[trimmed];
      }

      // Check if it's a live Mode 01 PID request
      if (trimmed.startsWith('01') && trimmed.length === 4) {
        const pid = trimmed.substring(2);
        return simulateLivePID(pid);
      }

      return 'NO DATA >';
    }

    throw new Error('Not connected — real BLE not configured');
  }

  async sendCommandWithRetry(command: string, timeout = COMMAND_TIMEOUT_MS): Promise<string> {
    for (let attempt = 0; attempt <= BUS_BUSY_MAX_RETRIES; attempt++) {
      const response = await this.sendCommand(command, timeout);
      if (!response.toUpperCase().includes('BUS BUSY')) {
        return response;
      }
      if (attempt < BUS_BUSY_MAX_RETRIES) {
        await this.delay(BUS_BUSY_RETRY_DELAY_MS);
      }
    }
    return 'BUS BUSY';
  }

  // --- Utility ---

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  isConnected(): boolean {
    return (
      this._connectionState === 'READY' ||
      this._connectionState === 'SCANNING_OBD'
    );
  }

  getConnectedDeviceName(): string | null {
    return this._connectedDeviceName;
  }

  destroy(): void {
    this._connectedDeviceName = null;
    this.setState('IDLE');
  }
}

// Singleton instance
export const bluetoothManager = new BluetoothManager();
