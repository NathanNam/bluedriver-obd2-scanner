import { useState, useEffect, useRef } from 'react';
import { ParsedPID, PIDStats } from '../types';
import { PID_REGISTRY } from '../obd2/pids';

export interface NewtonStatusResult {
  label: 'normal' | 'attention';
  confidence: number;
  issues: string[];
  timestamp: number;
}

interface UseNewtonStatusOptions {
  polling: boolean;
  currentValues: Record<string, ParsedPID>;
  pidStats: Record<string, PIDStats>;
  activeAlerts: Record<string, any>;
}

/**
 * Local health analysis based on OBD2 thresholds.
 * Runs every 5 seconds while polling is active.
 * No API calls — instant, reliable, works offline.
 */
export function useNewtonStatus({ polling, currentValues, pidStats, activeAlerts }: UseNewtonStatusOptions) {
  const [result, setResult] = useState<NewtonStatusResult | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!polling) {
      setResult(null);
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }

    const analyze = () => {
      if (Object.keys(currentValues).length === 0) return;

      const issues: string[] = [];

      // Check each PID against thresholds
      for (const [pid, parsed] of Object.entries(currentValues)) {
        const def = PID_REGISTRY[pid];
        if (!def) continue;
        const v = parsed.value;

        // Critical thresholds
        if (def.criticalThreshold !== undefined) {
          if (pid === '2F') {
            // Fuel: low is bad
            if (v <= def.criticalThreshold) issues.push(`${def.shortName} critically low (${Math.round(v)}${def.unit})`);
            else if (def.cautionThreshold && v <= def.cautionThreshold) issues.push(`${def.shortName} low (${Math.round(v)}${def.unit})`);
          } else {
            if (v >= def.criticalThreshold) issues.push(`${def.shortName} critical (${Math.round(v)}${def.unit})`);
            else if (def.cautionThreshold && v >= def.cautionThreshold) issues.push(`${def.shortName} high (${Math.round(v)}${def.unit})`);
          }
        }
      }

      // Check fuel trims — lean/rich condition
      const stft = currentValues['06'];
      const ltft = currentValues['07'];
      if (stft && Math.abs(stft.value) > 20) issues.push(`Short-term fuel trim extreme (${stft.value.toFixed(1)}%)`);
      if (ltft && Math.abs(ltft.value) > 15) issues.push(`Long-term fuel trim high (${ltft.value.toFixed(1)}%)`);

      // Check for erratic RPM (high variance in stats)
      const rpmStats = pidStats['0C'];
      if (rpmStats && rpmStats.count > 10) {
        const rpmRange = rpmStats.max - rpmStats.min;
        if (rpmRange > 2000 && rpmStats.avg < 1500) {
          issues.push('RPM unstable at idle');
        }
      }

      // Any active alerts from the threshold system
      const alertCount = Object.keys(activeAlerts).length;

      const hasIssues = issues.length > 0 || alertCount > 0;
      const confidence = hasIssues
        ? Math.min(95, 50 + issues.length * 15)
        : Math.min(95, 70 + Object.keys(currentValues).length * 2);

      setResult({
        label: hasIssues ? 'attention' : 'normal',
        confidence,
        issues,
        timestamp: Date.now(),
      });
    };

    // Analyze immediately and then every 5 seconds
    analyze();
    intervalRef.current = setInterval(analyze, 5000);

    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };
  }, [polling, currentValues, pidStats, activeAlerts]);

  return { result };
}
