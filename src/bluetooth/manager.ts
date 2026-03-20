// ============================================================
// Bluetooth Connection Manager — Web Bluetooth API + Demo Mode
// ============================================================

import { ConnectionState, DiscoveredDevice } from '../types';
import { terminateCommand } from '../obd2/commands';

const WEB_BLUETOOTH_AVAILABLE =
  typeof navigator !== 'undefined' && 'bluetooth' in navigator;

const COMMAND_TIMEOUT_MS = 5000;
const BUS_BUSY_RETRY_DELAY_MS = 200;
const BUS_BUSY_MAX_RETRIES = 3;

type StateListener = (state: ConnectionState) => void;
type DeviceListener = (device: DiscoveredDevice) => void;
type ErrorListener = (error: string) => void;

// --- Demo Simulation Data ---

const DEMO_RESPONSES: Record<string, string> = {
  'ATZ': 'ELM327 v2.1 >',
  'ATE0': 'OK >', 'ATL0': 'OK >', 'ATH0': 'OK >',
  'ATH1': 'OK >', 'ATSP0': 'OK >', 'ATAT1': 'OK >',
  '0100': '41 00 BE 3E B8 13 >',
  '0120': '41 20 80 05 B0 15 >',
  '0902': '49 02 01 31 47 31 59 43 32 45 30 35 5A 31 31 33 34 35 36 37 >',
  '0904': '49 04 01 45 43 55 31 32 33 >',
  '0101': '41 01 82 07 65 00 >',
  '011C': '41 1C 06 >',
  '03': '43 03 01 04 20 00 00 >',
  '07': '47 01 71 00 00 00 00 >',
  '0A': '4A 00 00 00 00 00 00 >',
  '04': '44 >',
  '0204 00': '42 04 9A >', '0205 00': '42 05 7B >',
  '0206 00': '42 06 82 >', '0207 00': '42 07 80 >',
  '020B 00': '42 0B 62 >', '020C 00': '42 0C 1A F8 >',
  '020D 00': '42 0D 00 >', '020E 00': '42 0E 8E >',
};

function simulateLivePID(pid: string): string {
  const now = Date.now();
  const wave = Math.sin(now / 2000);
  const noise = (Math.random() - 0.5) * 0.1;
  const hex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0').toUpperCase();

  const sims: Record<string, () => string> = {
    '0C': () => { const rpm = 750 + (wave + 1) * 1375 + noise * 500; const e = Math.round(rpm) * 4; return `41 0C ${hex(e >> 8)} ${hex(e & 0xFF)} >`; },
    '0D': () => `41 0D ${hex(Math.max(0, 60 + wave * 60 + noise * 20))} >`,
    '05': () => `41 05 ${hex(92 + wave * 5 + noise * 3 + 40)} >`,
    '04': () => `41 04 ${hex(((45 + wave * 25 + noise * 10) / 100) * 255)} >`,
    '11': () => `41 11 ${hex((Math.max(0, 40 + wave * 35 + noise * 15) / 100) * 255)} >`,
    '0F': () => `41 0F ${hex(35 + wave * 5 + 40)} >`,
    '0B': () => `41 0B ${hex(65 + wave * 30 + noise * 10)} >`,
    '0E': () => `41 0E ${hex((15 + wave * 10 + 64) * 2)} >`,
    '2F': () => `41 2F ${hex((65 / 100) * 255)} >`,
    '5C': () => `41 5C ${hex(100 + wave * 8 + 40)} >`,
    '06': () => `41 06 ${hex(128 + wave * 6)} >`,
    '07': () => `41 07 ${hex(128 + wave * 4)} >`,
    '10': () => { const v = Math.round(14 + wave * 11 + noise * 3) * 100; return `41 10 ${hex(v >> 8)} ${hex(v & 0xFF)} >`; },
  };

  return sims[pid.toUpperCase()]?.() ?? 'NO DATA >';
}

// ============================================================

class BluetoothManager {
  private _connectionState: ConnectionState = 'IDLE';
  private _connectedDeviceName: string | null = null;
  private _isDemo = true;

  // Web Bluetooth state
  private gattServer: BluetoothRemoteGATTServer | null = null;
  private txChar: BluetoothRemoteGATTCharacteristic | null = null;
  private rxChar: BluetoothRemoteGATTCharacteristic | null = null;
  private responseBuffer = '';
  private responseResolve: ((value: string) => void) | null = null;
  private responseTimeout: ReturnType<typeof setTimeout> | null = null;

  private stateListeners: StateListener[] = [];
  private deviceListeners: DeviceListener[] = [];
  private errorListeners: ErrorListener[] = [];

  get connectionState(): ConnectionState { return this._connectionState; }
  get isDemo(): boolean { return this._isDemo; }
  get webBluetoothAvailable(): boolean { return WEB_BLUETOOTH_AVAILABLE; }

  private setState(state: ConnectionState) {
    this._connectionState = state;
    this.stateListeners.forEach((fn) => fn(state));
  }

  onStateChange(listener: StateListener) {
    this.stateListeners.push(listener);
    return () => { this.stateListeners = this.stateListeners.filter((l) => l !== listener); };
  }

  onDeviceDiscovered(listener: DeviceListener) {
    this.deviceListeners.push(listener);
    return () => { this.deviceListeners = this.deviceListeners.filter((l) => l !== listener); };
  }

  onError(listener: ErrorListener) {
    this.errorListeners.push(listener);
    return () => { this.errorListeners = this.errorListeners.filter((l) => l !== listener); };
  }

  private emitError(error: string) {
    this.errorListeners.forEach((fn) => fn(error));
  }

  // --- Scanning ---

  async startScan(): Promise<void> {
    if (this._connectionState !== 'IDLE' && this._connectionState !== 'DISCONNECTED') return;
    this.setState('SCANNING');

    if (this._isDemo) {
      await this.delay(800);
      this.deviceListeners.forEach((fn) => fn({ id: 'DEMO-BLUEDRIVER-001', name: 'BlueDriver Pro (Demo)', rssi: -45 }));
      await this.delay(400);
      this.deviceListeners.forEach((fn) => fn({ id: 'DEMO-ELM327-002', name: 'ELM327 OBD-II (Demo)', rssi: -62 }));
      return;
    }

    // Web Bluetooth — browser shows its own device picker
    if (!WEB_BLUETOOTH_AVAILABLE) {
      this.emitError('Web Bluetooth is not available in this browser. Use Chrome or Edge.');
      this.setState('ERROR');
      return;
    }

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ['0000fff0-0000-1000-8000-00805f9b34fb'] },
          { namePrefix: 'BlueDr' },
          { namePrefix: 'ELM' },
          { namePrefix: 'OBD' },
          { namePrefix: 'V-LINK' },
        ],
        optionalServices: [
          '0000fff0-0000-1000-8000-00805f9b34fb',
          '0000ffe0-0000-1000-8000-00805f9b34fb',
          'ef680100-9b35-4933-9b10-52ffa9740042',
        ],
      });
      this.deviceListeners.forEach((fn) => fn({
        id: device.id,
        name: device.name ?? 'OBD2 Device',
        rssi: null,
      }));
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        this.setState('IDLE'); // User cancelled picker
      } else {
        this.emitError(`Scan failed: ${err.message}`);
        this.setState('ERROR');
      }
    }
  }

  stopScan(): void {
    if (this._connectionState === 'SCANNING') this.setState('IDLE');
  }

  // --- Connection ---

  async connect(deviceId: string): Promise<boolean> {
    this.setState('CONNECTING');

    if (this._isDemo) {
      await this.delay(600);
      this.setState('INITIALIZING');
      this._connectedDeviceName = deviceId.includes('BLUEDRIVER') ? 'BlueDriver Pro (Demo)' : 'ELM327 OBD-II (Demo)';
      await this.delay(800);
      this.setState('READY');
      return true;
    }

    // Real Web Bluetooth connect
    try {
      // Re-request the device to get a fresh handle with GATT access
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ['0000fff0-0000-1000-8000-00805f9b34fb'] },
          { namePrefix: 'BlueDr' },
          { namePrefix: 'ELM' },
          { namePrefix: 'OBD' },
        ],
        optionalServices: [
          '0000fff0-0000-1000-8000-00805f9b34fb',
          '0000ffe0-0000-1000-8000-00805f9b34fb',
          'ef680100-9b35-4933-9b10-52ffa9740042',
        ],
      });

      device.addEventListener('gattserverdisconnected', () => {
        this.gattServer = null;
        this.txChar = null;
        this.rxChar = null;
        this._connectedDeviceName = null;
        this.setState('DISCONNECTED');
      });

      this.setState('INITIALIZING');
      const server = await device.gatt!.connect();
      this.gattServer = server;
      this._connectedDeviceName = device.name ?? 'OBD2 Device';

      // Find service and characteristics
      const resolved = await this.resolveWebCharacteristics(server);
      if (!resolved) {
        this.emitError('Could not find OBD2 service on device');
        this.setState('ERROR');
        return false;
      }

      // Subscribe to RX notifications
      await this.rxChar!.startNotifications();
      this.rxChar!.addEventListener('characteristicvaluechanged', (event: any) => {
        const value = event.target.value as DataView;
        const decoded = new TextDecoder().decode(value);
        this.responseBuffer += decoded;

        if (this.responseBuffer.includes('>')) {
          const response = this.responseBuffer.replace(/>/g, '').trim();
          this.responseBuffer = '';
          if (this.responseTimeout) { clearTimeout(this.responseTimeout); this.responseTimeout = null; }
          if (this.responseResolve) { const r = this.responseResolve; this.responseResolve = null; r(response); }
        }
      });

      // ELM327 init
      for (const cmd of ['ATZ', 'ATE0', 'ATL0', 'ATH0', 'ATSP0']) {
        await this.sendCommand(cmd, 8000);
      }
      const pidCheck = await this.sendCommand('0100', 8000);
      if (!pidCheck.includes('41 00') && !pidCheck.includes('4100')) {
        this.emitError('ECU not responding');
        this.setState('ERROR');
        return false;
      }

      this.setState('READY');
      return true;
    } catch (err: any) {
      this.emitError(`Connection failed: ${err.message}`);
      this.setState('ERROR');
      return false;
    }
  }

  private async resolveWebCharacteristics(server: BluetoothRemoteGATTServer): Promise<boolean> {
    const serviceUUIDs = [
      '0000fff0-0000-1000-8000-00805f9b34fb',
      '0000ffe0-0000-1000-8000-00805f9b34fb',
      'ef680100-9b35-4933-9b10-52ffa9740042',
    ];

    for (const uuid of serviceUUIDs) {
      try {
        const service = await server.getPrimaryService(uuid);
        const chars = await service.getCharacteristics();
        const tx = chars.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);
        const rx = chars.find((c: any) => c.properties.notify);
        if (tx && rx) {
          this.txChar = tx;
          this.rxChar = rx;
          return true;
        }
      } catch { /* service not found, try next */ }
    }
    return false;
  }

  async disconnect(): Promise<void> {
    if (this.gattServer?.connected) {
      this.gattServer.disconnect();
    }
    this.gattServer = null;
    this.txChar = null;
    this.rxChar = null;
    this._connectedDeviceName = null;
    this.setState('IDLE');
  }

  // --- Command Sending ---

  async sendCommand(command: string, timeout = COMMAND_TIMEOUT_MS): Promise<string> {
    if (this._isDemo) {
      await this.delay(30 + Math.random() * 70);
      const trimmed = command.trim().toUpperCase();
      if (DEMO_RESPONSES[trimmed]) return DEMO_RESPONSES[trimmed];
      if (trimmed.startsWith('01') && trimmed.length === 4) return simulateLivePID(trimmed.substring(2));
      return 'NO DATA >';
    }

    if (!this.txChar) throw new Error('Not connected');
    this.responseBuffer = '';

    return new Promise<string>((resolve) => {
      this.responseResolve = resolve;
      this.responseTimeout = setTimeout(() => {
        this.responseResolve = null;
        resolve('');
      }, timeout);

      const data = new TextEncoder().encode(terminateCommand(command));
      this.txChar!.writeValue(data).catch(() => {
        if (this.responseTimeout) { clearTimeout(this.responseTimeout); this.responseTimeout = null; }
        this.responseResolve = null;
        resolve('');
      });
    });
  }

  async sendCommandWithRetry(command: string, timeout = COMMAND_TIMEOUT_MS): Promise<string> {
    for (let attempt = 0; attempt <= BUS_BUSY_MAX_RETRIES; attempt++) {
      const response = await this.sendCommand(command, timeout);
      if (!response.toUpperCase().includes('BUS BUSY')) return response;
      if (attempt < BUS_BUSY_MAX_RETRIES) await this.delay(BUS_BUSY_RETRY_DELAY_MS);
    }
    return 'BUS BUSY';
  }

  setDemoMode(demo: boolean) {
    this._isDemo = demo;
  }

  isConnected(): boolean {
    return this._connectionState === 'READY' || this._connectionState === 'SCANNING_OBD';
  }

  getConnectedDeviceName(): string | null {
    return this._connectedDeviceName;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  destroy(): void {
    this.disconnect();
  }
}

export const bluetoothManager = new BluetoothManager();
