// ============================================================
// Scan Store — one-time scan state & operations
// ============================================================

import { create } from 'zustand';
import { ScanResult, DTC, FreezeFrame } from '../types';
import { bluetoothManager } from '../bluetooth/manager';
import { SCAN_COMMANDS, FREEZE_FRAME_PIDS } from '../obd2/commands';
import {
  parseVIN,
  parseCalibrationId,
  parseMILStatus,
  parseDTCs,
  parseFreezeFrame,
  parseOBDStandard,
  isNoData,
} from '../obd2/parser';

interface ScanStore {
  isScanning: boolean;
  scanProgress: number; // 0-1
  scanStage: string;
  currentResult: ScanResult | null;
  scanHistory: ScanResult[];
  error: string | null;

  startScan: () => Promise<void>;
  clearCodes: () => Promise<boolean>;
  clearCurrentResult: () => void;
  loadHistory: () => void;
}

function generateId(): string {
  return `scan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export const useScanStore = create<ScanStore>((set, get) => ({
  isScanning: false,
  scanProgress: 0,
  scanStage: '',
  currentResult: null,
  scanHistory: [],
  error: null,

  startScan: async () => {
    if (!bluetoothManager.isConnected()) {
      set({ error: 'Not connected to adapter' });
      return;
    }

    set({
      isScanning: true,
      scanProgress: 0,
      scanStage: 'Starting scan...',
      error: null,
      currentResult: null,
    });

    const result: ScanResult = {
      id: generateId(),
      timestamp: Date.now(),
      vin: null,
      calibrationId: null,
      milStatus: false,
      obdStandard: null,
      protocol: null,
      storedDTCs: [],
      pendingDTCs: [],
      permanentDTCs: [],
      freezeFrame: null,
    };

    try {
      const totalSteps = 8;
      let step = 0;

      const progress = (stage: string) => {
        step++;
        set({ scanProgress: step / totalSteps, scanStage: stage });
      };

      // 1. Read VIN
      progress('Reading VIN...');
      try {
        const vinRaw = await bluetoothManager.sendCommandWithRetry(SCAN_COMMANDS.vin);
        result.vin = parseVIN(vinRaw);
      } catch { /* VIN not supported on all vehicles */ }

      // 2. Read Calibration ID
      progress('Reading ECU info...');
      try {
        const calRaw = await bluetoothManager.sendCommandWithRetry(SCAN_COMMANDS.calibrationId);
        result.calibrationId = parseCalibrationId(calRaw);
      } catch { /* optional */ }

      // 3. Monitor Status / MIL
      progress('Checking engine light...');
      try {
        const milRaw = await bluetoothManager.sendCommandWithRetry(SCAN_COMMANDS.monitorStatus);
        const mil = parseMILStatus(milRaw);
        result.milStatus = mil ?? false;
      } catch { /* default to false */ }

      // 4. Stored DTCs
      progress('Reading stored fault codes...');
      try {
        const storedRaw = await bluetoothManager.sendCommandWithRetry(SCAN_COMMANDS.storedDTCs);
        result.storedDTCs = parseDTCs(storedRaw, 'stored');
      } catch { /* no DTCs */ }

      // 5. Pending DTCs
      progress('Reading pending codes...');
      try {
        const pendingRaw = await bluetoothManager.sendCommandWithRetry(SCAN_COMMANDS.pendingDTCs);
        result.pendingDTCs = parseDTCs(pendingRaw, 'pending');
      } catch { /* no pending */ }

      // 6. Permanent DTCs
      progress('Reading permanent codes...');
      try {
        const permRaw = await bluetoothManager.sendCommandWithRetry(SCAN_COMMANDS.permanentDTCs);
        result.permanentDTCs = parseDTCs(permRaw, 'permanent');
      } catch { /* no permanent */ }

      // 7. Freeze Frame (only if DTCs exist)
      progress('Reading freeze frame data...');
      if (result.storedDTCs.length > 0) {
        try {
          const ffResponses: string[] = [];
          for (const ff of FREEZE_FRAME_PIDS) {
            const raw = await bluetoothManager.sendCommandWithRetry(ff.command);
            if (!isNoData(raw)) {
              ffResponses.push(raw);
            }
          }
          result.freezeFrame = parseFreezeFrame(ffResponses);
        } catch { /* optional */ }
      }

      // 8. OBD Standard
      progress('Checking OBD standard...');
      try {
        const stdRaw = await bluetoothManager.sendCommandWithRetry(SCAN_COMMANDS.obdStandard);
        result.obdStandard = parseOBDStandard(stdRaw);
      } catch { /* optional */ }

      // Save to history
      set((state) => ({
        isScanning: false,
        scanProgress: 1,
        scanStage: 'Complete',
        currentResult: result,
        scanHistory: [result, ...state.scanHistory],
      }));
    } catch (error: any) {
      set({
        isScanning: false,
        scanProgress: 0,
        scanStage: '',
        error: `Scan failed: ${error.message}`,
      });
    }
  },

  clearCodes: async () => {
    try {
      const response = await bluetoothManager.sendCommandWithRetry(SCAN_COMMANDS.clearDTCs);
      return response.toUpperCase().includes('44') || response.toUpperCase().includes('OK');
    } catch {
      set({ error: 'Failed to clear codes' });
      return false;
    }
  },

  clearCurrentResult: () => set({ currentResult: null }),

  loadHistory: () => {
    // In a full implementation, load from AsyncStorage
    // For now, history is kept in memory during session
  },
}));
