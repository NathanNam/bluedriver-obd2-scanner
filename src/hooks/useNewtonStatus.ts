import { useState, useEffect, useRef } from 'react';
import { ParsedPID, PIDStats } from '../types';
import { PID_REGISTRY } from '../obd2/pids';

export interface HealthResult {
  label: 'normal' | 'attention';
  confidence: number;
  issues: string[];
  timestamp: number;
}

export interface NewtonAIResult {
  label: string;
  confidence: number;
  scores: Record<string, number>;
  windows: number;
  timestamp: number;
}

interface UseNewtonStatusOptions {
  available: boolean; // Newton API key configured
  polling: boolean;
  currentValues: Record<string, ParsedPID>;
  pidStats: Record<string, PIDStats>;
  activeAlerts: Record<string, any>;
  vehicleContext?: string;
}

/**
 * Returns both:
 * - healthResult: instant local threshold analysis (always available)
 * - newtonResult: real Newton AI Machine State Lens classification (when API key set)
 */
export function useNewtonStatus({ available, polling, currentValues, pidStats, activeAlerts, vehicleContext }: UseNewtonStatusOptions) {
  const [healthResult, setHealthResult] = useState<HealthResult | null>(null);
  const [newtonResult, setNewtonResult] = useState<NewtonAIResult | null>(null);
  const [newtonConnected, setNewtonConnected] = useState(false);

  const healthIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const flushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef(false);
  const currentValuesRef = useRef(currentValues);

  currentValuesRef.current = currentValues;

  // --- Local Health Analysis (always runs when polling) ---
  useEffect(() => {
    if (!polling) {
      setHealthResult(null);
      if (healthIntervalRef.current) { clearInterval(healthIntervalRef.current); healthIntervalRef.current = null; }
      return;
    }

    const analyze = () => {
      const cv = currentValuesRef.current;
      if (Object.keys(cv).length === 0) return;

      const issues: string[] = [];

      for (const [pid, parsed] of Object.entries(cv)) {
        const def = PID_REGISTRY[pid];
        if (!def) continue;
        const v = parsed.value;

        if (def.criticalThreshold !== undefined) {
          if (pid === '2F') {
            if (v <= def.criticalThreshold) issues.push(`${def.shortName} critically low (${Math.round(v)}${def.unit})`);
            else if (def.cautionThreshold && v <= def.cautionThreshold) issues.push(`${def.shortName} low (${Math.round(v)}${def.unit})`);
          } else {
            if (v >= def.criticalThreshold) issues.push(`${def.shortName} critical (${Math.round(v)}${def.unit})`);
            else if (def.cautionThreshold && v >= def.cautionThreshold) issues.push(`${def.shortName} high (${Math.round(v)}${def.unit})`);
          }
        }
      }

      const stft = cv['06'];
      const ltft = cv['07'];
      if (stft && Math.abs(stft.value) > 20) issues.push(`STFT extreme (${stft.value.toFixed(1)}%)`);
      if (ltft && Math.abs(ltft.value) > 15) issues.push(`LTFT high (${ltft.value.toFixed(1)}%)`);

      const hasIssues = issues.length > 0;
      setHealthResult({
        label: hasIssues ? 'attention' : 'normal',
        confidence: hasIssues ? Math.min(95, 50 + issues.length * 15) : Math.min(95, 80),
        issues,
        timestamp: Date.now(),
      });
    };

    analyze();
    healthIntervalRef.current = setInterval(analyze, 5000);
    return () => { if (healthIntervalRef.current) clearInterval(healthIntervalRef.current); };
  }, [polling]);

  // --- Newton AI Streaming (only when API key available + polling) ---
  useEffect(() => {
    if (!available || !polling) {
      if (startedRef.current) {
        fetch('/api/newton/stream/stop', { method: 'POST' }).catch(() => {});
        startedRef.current = false;
      }
      if (eventSourceRef.current) { eventSourceRef.current.close(); eventSourceRef.current = null; setNewtonConnected(false); }
      if (flushIntervalRef.current) { clearInterval(flushIntervalRef.current); flushIntervalRef.current = null; }
      setNewtonResult(null);
      return;
    }

    if (!startedRef.current) {
      fetch('/api/newton/stream/start', { method: 'POST' }).catch(() => {});
      if (vehicleContext) {
        fetch('/api/newton/vehicle-context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context: vehicleContext }),
        }).catch(() => {});
      }
      startedRef.current = true;
    }

    if (!eventSourceRef.current) {
      const es = new EventSource('/api/newton/stream');
      es.onmessage = (event) => {
        try { setNewtonResult(JSON.parse(event.data)); } catch {}
      };
      es.onopen = () => setNewtonConnected(true);
      es.onerror = () => setNewtonConnected(false);
      eventSourceRef.current = es;
    }

    if (!flushIntervalRef.current) {
      flushIntervalRef.current = setInterval(() => {
        const vals = currentValuesRef.current;
        if (!vals || Object.keys(vals).length === 0) return;
        const values: Record<string, number> = {};
        for (const [pid, parsed] of Object.entries(vals)) {
          values[pid] = parsed.value;
        }
        fetch('/api/newton/stream/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timestamp: Date.now(), values }),
        }).catch(() => {});
      }, 1000);
    }

    return () => {
      if (flushIntervalRef.current) { clearInterval(flushIntervalRef.current); flushIntervalRef.current = null; }
    };
  }, [available, polling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) { eventSourceRef.current.close(); }
      if (startedRef.current) { fetch('/api/newton/stream/stop', { method: 'POST' }).catch(() => {}); }
      if (flushIntervalRef.current) clearInterval(flushIntervalRef.current);
      if (healthIntervalRef.current) clearInterval(healthIntervalRef.current);
    };
  }, []);

  return { healthResult, newtonResult, newtonConnected };
}
