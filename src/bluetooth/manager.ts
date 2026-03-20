// ============================================================
// Bluetooth Connection Manager
// Handles BLE device discovery, connection, and ELM327 comms
// ============================================================

import { Platform } from 'react-native';
import { ConnectionState, DiscoveredDevice } from '../types';
import { ELM327_INIT_SEQUENCE, terminateCommand } from '../obd2/commands';

// Lazy-load react-native-ble-plx so the app doesn't crash in Expo Go
// (Expo Go doesn't include BLE native modules)
let BleManagerClass: any = null;
try {
  BleManagerClass = require('react-native-ble-plx').BleManager;
} catch {
  console.warn('react-native-ble-plx not available — Bluetooth disabled (Expo Go mode)');
}

type Device = any;
type Subscription = { remove: () => void };

// BlueDriver BLE service/characteristic UUIDs (common defaults — verify with BLE scanner)
const BLUEDRIVER_SERVICE_UUID = 'EF680100-9B35-4933-9B10-52FFA9740042';
const BLUEDRIVER_TX_CHAR_UUID = 'EF680101-9B35-4933-9B10-52FFA9740042'; // Write to adapter
const BLUEDRIVER_RX_CHAR_UUID = 'EF680102-9B35-4933-9B10-52FFA9740042'; // Read from adapter

// Alternative common ELM327 BLE UUIDs
const ELM327_SERVICE_UUID = 'FFF0';
const ELM327_TX_CHAR_UUID = 'FFF1'; // Write
const ELM327_RX_CHAR_UUID = 'FFF2'; // Notify/Read

const SCAN_TIMEOUT_MS = 15000;
const COMMAND_TIMEOUT_MS = 5000;
const BUS_BUSY_RETRY_DELAY_MS = 200;
const BUS_BUSY_MAX_RETRIES = 3;

type StateListener = (state: ConnectionState) => void;
type DeviceListener = (device: DiscoveredDevice) => void;
type ErrorListener = (error: string) => void;

class BluetoothManager {
  private bleManager: any;
  private connectedDevice: Device | null = null;
  private serviceUUID: string | null = null;
  private txCharUUID: string | null = null;
  private rxCharUUID: string | null = null;
  private rxSubscription: Subscription | null = null;

  private responseBuffer = '';
  private responseResolve: ((value: string) => void) | null = null;
  private responseTimeout: ReturnType<typeof setTimeout> | null = null;

  private stateListeners: StateListener[] = [];
  private deviceListeners: DeviceListener[] = [];
  private errorListeners: ErrorListener[] = [];

  private _connectionState: ConnectionState = 'IDLE';

  constructor() {
    if (BleManagerClass) {
      this.bleManager = new BleManagerClass();
    } else {
      this.bleManager = null;
    }
  }

  get isBLEAvailable(): boolean {
    return this.bleManager !== null;
  }

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
    if (!this.bleManager) {
      this.emitError('Bluetooth is not available in Expo Go. Use a development build to enable BLE.');
      this.setState('ERROR');
      return;
    }

    if (this._connectionState !== 'IDLE' && this._connectionState !== 'DISCONNECTED') {
      return;
    }

    this.setState('SCANNING');

    return new Promise<void>((resolve) => {
      const scanTimeout = setTimeout(() => {
        this.bleManager.stopDeviceScan();
        if (this._connectionState === 'SCANNING') {
          this.setState('IDLE');
        }
        resolve();
      }, SCAN_TIMEOUT_MS);

      this.bleManager.startDeviceScan(null, { allowDuplicates: false }, (error: any, device: any) => {
        if (error) {
          clearTimeout(scanTimeout);
          this.emitError(`Scan error: ${error.message}`);
          this.setState('ERROR');
          resolve();
          return;
        }

        if (device && device.name) {
          this.deviceListeners.forEach((fn) =>
            fn({
              id: device.id,
              name: device.name,
              rssi: device.rssi,
            })
          );
        }
      });
    });
  }

  stopScan(): void {
    this.bleManager?.stopDeviceScan();
    if (this._connectionState === 'SCANNING') {
      this.setState('IDLE');
    }
  }

  // --- Connection ---

  async connect(deviceId: string): Promise<boolean> {
    if (!this.bleManager) {
      this.emitError('Bluetooth is not available in Expo Go.');
      return false;
    }

    try {
      this.setState('CONNECTING');
      this.bleManager.stopDeviceScan();

      const device = await this.bleManager.connectToDevice(deviceId, {
        requestMTU: 512,
        timeout: 10000,
      });

      await device.discoverAllServicesAndCharacteristics();
      this.connectedDevice = device;

      // Try to find the right service/characteristic UUIDs
      const resolved = await this.resolveCharacteristics(device);
      if (!resolved) {
        this.emitError('Could not find OBD2 service on device');
        this.setState('ERROR');
        return false;
      }

      // Subscribe to notifications from the RX characteristic
      this.subscribeToNotifications();

      // Monitor disconnection
      device.onDisconnected((error: any, dev: any) => {
        this.cleanup();
        this.setState('DISCONNECTED');
        if (error) {
          this.emitError(`Device disconnected: ${error.message}`);
        }
      });

      // Initialize ELM327
      this.setState('INITIALIZING');
      const initialized = await this.initializeELM327();
      if (!initialized) {
        this.emitError('Failed to initialize ELM327 adapter');
        this.setState('ERROR');
        return false;
      }

      this.setState('READY');
      return true;
    } catch (error: any) {
      this.emitError(`Connection failed: ${error.message}`);
      this.setState('ERROR');
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connectedDevice) {
      try {
        await this.bleManager?.cancelDeviceConnection(this.connectedDevice.id);
      } catch {
        // Device may already be disconnected
      }
    }
    this.cleanup();
    this.setState('IDLE');
  }

  private cleanup() {
    if (this.rxSubscription) {
      this.rxSubscription.remove();
      this.rxSubscription = null;
    }
    this.connectedDevice = null;
    this.responseBuffer = '';
    if (this.responseTimeout) {
      clearTimeout(this.responseTimeout);
      this.responseTimeout = null;
    }
    if (this.responseResolve) {
      this.responseResolve('');
      this.responseResolve = null;
    }
  }

  // --- Characteristic Resolution ---

  private async resolveCharacteristics(device: Device): Promise<boolean> {
    try {
      const services = await device.services();
      for (const service of services) {
        const chars = await service.characteristics();
        const charUUIDs = chars.map((c: any) => c.uuid.toUpperCase());

        // Try BlueDriver UUIDs
        if (service.uuid.toUpperCase().includes(BLUEDRIVER_SERVICE_UUID.toUpperCase().substring(0, 8))) {
          this.serviceUUID = service.uuid;
          const tx = chars.find((c: any) => c.isWritableWithResponse || c.isWritableWithoutResponse);
          const rx = chars.find((c: any) => c.isNotifiable || c.isIndicatable);
          if (tx && rx) {
            this.txCharUUID = tx.uuid;
            this.rxCharUUID = rx.uuid;
            return true;
          }
        }

        // Try common ELM327 UUIDs
        if (
          service.uuid.toUpperCase().includes(ELM327_SERVICE_UUID) ||
          service.uuid.toUpperCase().includes('FFE0')
        ) {
          this.serviceUUID = service.uuid;
          const tx = chars.find((c: any) => c.isWritableWithResponse || c.isWritableWithoutResponse);
          const rx = chars.find((c: any) => c.isNotifiable || c.isIndicatable);
          if (tx && rx) {
            this.txCharUUID = tx.uuid;
            this.rxCharUUID = rx.uuid;
            return true;
          }
        }
      }

      // Fallback: find any writable + notifiable characteristic pair
      for (const service of services) {
        const chars = await service.characteristics();
        const tx = chars.find((c: any) => c.isWritableWithResponse || c.isWritableWithoutResponse);
        const rx = chars.find((c: any) => c.isNotifiable || c.isIndicatable);
        if (tx && rx) {
          this.serviceUUID = service.uuid;
          this.txCharUUID = tx.uuid;
          this.rxCharUUID = rx.uuid;
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  // --- Notifications ---

  private subscribeToNotifications() {
    if (!this.connectedDevice || !this.serviceUUID || !this.rxCharUUID) return;

    this.rxSubscription = this.connectedDevice.monitorCharacteristicForService(
      this.serviceUUID,
      this.rxCharUUID,
      (error: any, characteristic: any) => {
        if (error) {
          return;
        }
        if (characteristic?.value) {
          // BLE data comes as base64 encoded
          const decoded = atob(characteristic.value);
          this.responseBuffer += decoded;

          // ELM327 response is complete when we see '>' prompt
          if (this.responseBuffer.includes('>')) {
            const response = this.responseBuffer.replace(/>/g, '').trim();
            this.responseBuffer = '';

            if (this.responseTimeout) {
              clearTimeout(this.responseTimeout);
              this.responseTimeout = null;
            }
            if (this.responseResolve) {
              const resolve = this.responseResolve;
              this.responseResolve = null;
              resolve(response);
            }
          }
        }
      }
    );
  }

  // --- Command Sending ---

  /**
   * Send a command to the ELM327 adapter and wait for response.
   * Returns the raw response string.
   */
  async sendCommand(command: string, timeout = COMMAND_TIMEOUT_MS): Promise<string> {
    if (!this.connectedDevice || !this.serviceUUID || !this.txCharUUID) {
      throw new Error('Not connected');
    }

    // Clear any pending response
    this.responseBuffer = '';

    return new Promise<string>(async (resolve, reject) => {
      this.responseResolve = resolve;

      this.responseTimeout = setTimeout(() => {
        this.responseResolve = null;
        resolve(''); // Timeout returns empty string, caller handles
      }, timeout);

      try {
        const data = btoa(terminateCommand(command));
        await this.connectedDevice!.writeCharacteristicWithResponseForService(
          this.serviceUUID!,
          this.txCharUUID!,
          data
        );
      } catch (error: any) {
        if (this.responseTimeout) {
          clearTimeout(this.responseTimeout);
          this.responseTimeout = null;
        }
        this.responseResolve = null;
        reject(new Error(`Write failed: ${error.message}`));
      }
    });
  }

  /**
   * Send command with automatic BUS BUSY retry
   */
  async sendCommandWithRetry(
    command: string,
    timeout = COMMAND_TIMEOUT_MS
  ): Promise<string> {
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

  // --- ELM327 Init ---

  private async initializeELM327(): Promise<boolean> {
    try {
      for (const step of ELM327_INIT_SEQUENCE) {
        const response = await this.sendCommand(step.command, 8000);
        const cleaned = response.trim().toUpperCase();

        if (step.expectedContains) {
          if (!cleaned.includes(step.expectedContains.toUpperCase())) {
            console.warn(`Init step "${step.description}" unexpected: ${response}`);
            // Continue anyway — some adapters have different version strings
          }
        } else if (step.expected) {
          if (!cleaned.includes(step.expected.toUpperCase())) {
            console.warn(`Init step "${step.description}" unexpected: ${response}`);
          }
        }
      }

      // Verify ECU communication with supported PIDs request
      const pidResponse = await this.sendCommand('0100', 8000);
      if (
        pidResponse.trim().toUpperCase().includes('41 00') ||
        pidResponse.trim().toUpperCase().includes('4100')
      ) {
        return true;
      }

      // Some vehicles respond without space
      if (pidResponse.trim().length > 0 && !pidResponse.includes('NO DATA')) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  // --- Utility ---

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  isConnected(): boolean {
    return (
      this.connectedDevice !== null &&
      this._connectionState !== 'IDLE' &&
      this._connectionState !== 'DISCONNECTED' &&
      this._connectionState !== 'ERROR'
    );
  }

  getConnectedDeviceName(): string | null {
    return this.connectedDevice?.name ?? null;
  }

  destroy(): void {
    this.cleanup();
    this.bleManager?.destroy();
  }
}

// Singleton instance
export const bluetoothManager = new BluetoothManager();
