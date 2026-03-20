// ============================================================
// Bluetooth Store — connection state & device management
// ============================================================

import { create } from 'zustand';
import { ConnectionState, DiscoveredDevice } from '../types';
import { bluetoothManager } from '../bluetooth/manager';

interface BluetoothStore {
  connectionState: ConnectionState;
  discoveredDevices: DiscoveredDevice[];
  connectedDeviceName: string | null;
  error: string | null;

  startScan: () => Promise<void>;
  stopScan: () => void;
  connect: (deviceId: string) => Promise<boolean>;
  disconnect: () => Promise<void>;
  clearError: () => void;
}

export const useBluetoothStore = create<BluetoothStore>((set, get) => {
  // Subscribe to BT manager events
  bluetoothManager.onStateChange((state) => {
    set({ connectionState: state });
    if (state === 'READY' || state === 'SCANNING_OBD') {
      set({ connectedDeviceName: bluetoothManager.getConnectedDeviceName() });
    }
    if (state === 'IDLE' || state === 'DISCONNECTED') {
      set({ connectedDeviceName: null });
    }
  });

  bluetoothManager.onDeviceDiscovered((device) => {
    set((state) => {
      const exists = state.discoveredDevices.some((d) => d.id === device.id);
      if (exists) return state;
      return { discoveredDevices: [...state.discoveredDevices, device] };
    });
  });

  bluetoothManager.onError((error) => {
    set({ error });
  });

  return {
    connectionState: 'IDLE',
    discoveredDevices: [],
    connectedDeviceName: null,
    error: null,

    startScan: async () => {
      set({ discoveredDevices: [], error: null });
      await bluetoothManager.startScan();
    },

    stopScan: () => {
      bluetoothManager.stopScan();
    },

    connect: async (deviceId: string) => {
      set({ error: null });
      return bluetoothManager.connect(deviceId);
    },

    disconnect: async () => {
      await bluetoothManager.disconnect();
      set({ connectedDeviceName: null });
    },

    clearError: () => set({ error: null }),
  };
});
