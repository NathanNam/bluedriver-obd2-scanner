// ============================================================
// Live Scan Store — real-time PID polling & gauge state
// ============================================================

import { create } from 'zustand';
import { GaugeConfig, LiveDataPoint, ParsedPID, RecordingSession } from '../types';
import { bluetoothManager } from '../bluetooth/manager';
import { buildMode01Command } from '../obd2/commands';
import { parseRawResponse, isNoData } from '../obd2/parser';
import { PID_REGISTRY, getAllPIDs } from '../obd2/pids';

const DEFAULT_GAUGE_CONFIG: GaugeConfig[] = [
  { slotIndex: 0, pid: '0C' }, // RPM
  { slotIndex: 1, pid: '0D' }, // Speed
  { slotIndex: 2, pid: '05' }, // Coolant Temp
  { slotIndex: 3, pid: '04' }, // Engine Load
];

const CHART_WINDOW_MS = 60000; // 60 seconds rolling window

interface LiveStore {
  isPolling: boolean;
  gaugeConfig: GaugeConfig[];
  currentValues: Record<string, ParsedPID>;
  chartData: LiveDataPoint[];
  unsupportedPIDs: Set<string>;

  // Recording
  isRecording: boolean;
  currentRecording: RecordingSession | null;
  recordings: RecordingSession[];

  // Actions
  startPolling: () => void;
  stopPolling: () => void;
  setGaugePID: (slotIndex: number, pid: string) => void;
  startRecording: () => void;
  stopRecording: () => void;
}

let pollingActive = false;
let pollingTimeout: ReturnType<typeof setTimeout> | null = null;

function generateId(): string {
  return `rec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export const useLiveStore = create<LiveStore>((set, get) => {
  const pollCycle = async () => {
    if (!pollingActive || !bluetoothManager.isConnected()) {
      set({ isPolling: false });
      return;
    }

    const state = get();
    const activePIDs = state.gaugeConfig.map((g) => g.pid);

    for (const pid of activePIDs) {
      if (!pollingActive) break;
      if (state.unsupportedPIDs.has(pid)) continue;

      try {
        const command = buildMode01Command(pid);
        const raw = await bluetoothManager.sendCommandWithRetry(command, 3000);

        if (isNoData(raw)) {
          // Mark PID as unsupported
          set((s) => ({
            unsupportedPIDs: new Set([...s.unsupportedPIDs, pid]),
          }));
          continue;
        }

        const parsed = parseRawResponse(raw, pid);
        if (parsed) {
          const dataPoint: LiveDataPoint = {
            pid: parsed.pid,
            value: parsed.value,
            timestamp: parsed.timestamp,
          };

          set((s) => {
            const newCurrentValues = {
              ...s.currentValues,
              [parsed.pid]: parsed,
            };

            // Update chart data (primary gauge only — slot 0)
            const primaryPID = s.gaugeConfig[0]?.pid;
            let newChartData = s.chartData;
            if (parsed.pid === primaryPID) {
              const cutoff = Date.now() - CHART_WINDOW_MS;
              newChartData = [
                ...s.chartData.filter((d) => d.timestamp > cutoff),
                dataPoint,
              ];
            }

            // Append to recording if active
            let newRecording = s.currentRecording;
            if (s.isRecording && newRecording) {
              newRecording = {
                ...newRecording,
                dataPoints: [...newRecording.dataPoints, dataPoint],
              };
            }

            return {
              currentValues: newCurrentValues,
              chartData: newChartData,
              currentRecording: newRecording,
            };
          });
        }
      } catch {
        // Skip this PID on error, continue polling
      }
    }

    // Schedule next cycle
    if (pollingActive) {
      pollingTimeout = setTimeout(pollCycle, 50); // Minimal delay between cycles
    }
  };

  return {
    isPolling: false,
    gaugeConfig: DEFAULT_GAUGE_CONFIG,
    currentValues: {},
    chartData: [],
    unsupportedPIDs: new Set<string>(),

    isRecording: false,
    currentRecording: null,
    recordings: [],

    startPolling: () => {
      if (pollingActive) return;
      pollingActive = true;
      set({ isPolling: true, unsupportedPIDs: new Set() });

      // Send live mode init commands
      (async () => {
        try {
          await bluetoothManager.sendCommand('ATH1'); // Headers on
          await bluetoothManager.sendCommand('ATAT1'); // Adaptive timing
        } catch {
          // Non-critical
        }
        pollCycle();
      })();
    },

    stopPolling: () => {
      pollingActive = false;
      if (pollingTimeout) {
        clearTimeout(pollingTimeout);
        pollingTimeout = null;
      }
      set({ isPolling: false });

      // Restore headers off
      (async () => {
        try {
          await bluetoothManager.sendCommand('ATH0');
        } catch {
          // Non-critical
        }
      })();
    },

    setGaugePID: (slotIndex: number, pid: string) => {
      set((state) => ({
        gaugeConfig: state.gaugeConfig.map((g) =>
          g.slotIndex === slotIndex ? { ...g, pid } : g
        ),
      }));
    },

    startRecording: () => {
      const session: RecordingSession = {
        id: generateId(),
        startTime: Date.now(),
        endTime: null,
        vin: null,
        dataPoints: [],
      };
      set({ isRecording: true, currentRecording: session });
    },

    stopRecording: () => {
      const state = get();
      if (state.currentRecording) {
        const completed = {
          ...state.currentRecording,
          endTime: Date.now(),
        };
        set((s) => ({
          isRecording: false,
          currentRecording: null,
          recordings: [completed, ...s.recordings],
        }));
      } else {
        set({ isRecording: false });
      }
    },
  };
});
