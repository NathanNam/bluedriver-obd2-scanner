// ============================================================
// Live Scan Store — real-time PID polling & gauge state
// ============================================================

import { create } from 'zustand';
import { GaugeConfig, LiveDataPoint, ParsedPID, RecordingSession, PIDStats, PIDAlert } from '../types';
import { bluetoothManager } from '../bluetooth/manager';
import { buildMode01Command } from '../obd2/commands';
import { parseRawResponse, isNoData } from '../obd2/parser';
import { PID_REGISTRY, getAllPIDs } from '../obd2/pids';

const DEFAULT_GAUGE_CONFIG: GaugeConfig[] = [
  { slotIndex: 0, pid: '0C' }, // RPM
  { slotIndex: 1, pid: '0D' }, // Speed
  { slotIndex: 2, pid: '05' }, // Coolant Temp
  { slotIndex: 3, pid: '2F' }, // Fuel Tank Level
];

const CHART_WINDOW_MS = 60000;

// PIDs to poll at full rate (gauge PIDs). Others poll every Nth cycle.
const SECONDARY_POLL_INTERVAL = 3;

interface LiveStore {
  isPolling: boolean;
  gaugeConfig: GaugeConfig[];
  currentValues: Record<string, ParsedPID>;
  chartData: LiveDataPoint[];
  unsupportedPIDs: Set<string>;

  // Stats & monitoring
  pidStats: Record<string, PIDStats>;
  refreshRate: number;
  activeAlerts: Record<string, PIDAlert>;

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
let cycleCount = 0;
let cycleTimestamps: number[] = [];

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
    const gaugePIDs = new Set(state.gaugeConfig.map((g) => g.pid));

    // Build PID list: gauge PIDs every cycle, others every Nth cycle
    const allPIDs = getAllPIDs().map((def) => def.pid);
    const pidsThisCycle = allPIDs.filter((pid) => {
      if (gaugePIDs.has(pid)) return true;
      return cycleCount % SECONDARY_POLL_INTERVAL === 0;
    });

    for (const pid of pidsThisCycle) {
      if (!pollingActive) break;
      if (state.unsupportedPIDs.has(pid)) continue;

      try {
        const command = buildMode01Command(pid);
        const raw = await bluetoothManager.sendCommandWithRetry(command, 3000);

        if (isNoData(raw)) {
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
            const newCurrentValues = { ...s.currentValues, [parsed.pid]: parsed };

            // Chart data (primary gauge)
            const primaryPID = s.gaugeConfig[0]?.pid;
            let newChartData = s.chartData;
            if (parsed.pid === primaryPID) {
              const cutoff = Date.now() - CHART_WINDOW_MS;
              newChartData = [...s.chartData.filter((d) => d.timestamp > cutoff), dataPoint];
            }

            // Recording
            let newRecording = s.currentRecording;
            if (s.isRecording && newRecording) {
              newRecording = { ...newRecording, dataPoints: [...newRecording.dataPoints, dataPoint] };
            }

            // Min/Max/Avg stats
            const existing = s.pidStats[parsed.pid];
            let newStats: PIDStats;
            if (existing) {
              const newCount = existing.count + 1;
              const newSum = existing.sum + parsed.value;
              newStats = {
                min: Math.min(existing.min, parsed.value),
                max: Math.max(existing.max, parsed.value),
                sum: newSum,
                count: newCount,
                avg: newSum / newCount,
              };
            } else {
              newStats = { min: parsed.value, max: parsed.value, sum: parsed.value, count: 1, avg: parsed.value };
            }
            const newPidStats = { ...s.pidStats, [parsed.pid]: newStats };

            // Alert thresholds
            const def = PID_REGISTRY[parsed.pid];
            const newAlerts = { ...s.activeAlerts };
            if (def?.criticalThreshold !== undefined) {
              const isCritical = def.pid === '2F'
                ? parsed.value <= def.criticalThreshold
                : parsed.value >= def.criticalThreshold;
              if (isCritical) {
                newAlerts[parsed.pid] = {
                  pid: parsed.pid,
                  name: def.shortName,
                  value: parsed.value,
                  threshold: def.criticalThreshold,
                  unit: def.unit,
                  timestamp: Date.now(),
                };
              } else {
                delete newAlerts[parsed.pid];
              }
            }

            return {
              currentValues: newCurrentValues,
              chartData: newChartData,
              currentRecording: newRecording,
              pidStats: newPidStats,
              activeAlerts: newAlerts,
            };
          });
        }
      } catch {
        // Skip this PID on error
      }
    }

    // Refresh rate: track cycle completions
    cycleCount++;
    const now = Date.now();
    cycleTimestamps = [...cycleTimestamps.filter((t) => t > now - 5000), now];
    const refreshRate = Math.round((cycleTimestamps.length / 5) * 10) / 10; // avg cycles/sec over 5s window
    set({ refreshRate });

    if (pollingActive) {
      pollingTimeout = setTimeout(pollCycle, 50);
    }
  };

  return {
    isPolling: false,
    gaugeConfig: DEFAULT_GAUGE_CONFIG,
    currentValues: {},
    chartData: [],
    unsupportedPIDs: new Set<string>(),
    pidStats: {},
    refreshRate: 0,
    activeAlerts: {},

    isRecording: false,
    currentRecording: null,
    recordings: [],

    startPolling: () => {
      if (pollingActive) return;
      pollingActive = true;
      cycleCount = 0;
      cycleTimestamps = [];
      set({
        isPolling: true,
        unsupportedPIDs: new Set(),
        pidStats: {},
        refreshRate: 0,
        activeAlerts: {},
      });

      (async () => {
        try {
          await bluetoothManager.sendCommand('ATH1');
          await bluetoothManager.sendCommand('ATAT1');
        } catch { /* Non-critical */ }
        pollCycle();
      })();
    },

    stopPolling: () => {
      pollingActive = false;
      if (pollingTimeout) { clearTimeout(pollingTimeout); pollingTimeout = null; }
      set({ isPolling: false });

      (async () => {
        try { await bluetoothManager.sendCommand('ATH0'); } catch { /* Non-critical */ }
      })();
    },

    setGaugePID: (slotIndex: number, pid: string) => {
      set((state) => ({
        gaugeConfig: state.gaugeConfig.map((g) => g.slotIndex === slotIndex ? { ...g, pid } : g),
      }));
    },

    startRecording: () => {
      const session: RecordingSession = {
        id: generateId(), startTime: Date.now(), endTime: null, vin: null, dataPoints: [],
      };
      set({ isRecording: true, currentRecording: session });
    },

    stopRecording: () => {
      const state = get();
      if (state.currentRecording) {
        const completed = { ...state.currentRecording, endTime: Date.now() };
        set((s) => ({ isRecording: false, currentRecording: null, recordings: [completed, ...s.recordings] }));
      } else {
        set({ isRecording: false });
      }
    },
  };
});
