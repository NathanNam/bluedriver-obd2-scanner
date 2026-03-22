import { useState, useEffect, useRef } from 'react';

export interface NewtonStatusResult {
  label: string;
  confidence: number;
  scores: Record<string, number>;
  windows: number;
  timestamp: number;
}

interface UseNewtonStatusOptions {
  available: boolean;
  polling: boolean;
  currentValues: Record<string, { value: number; timestamp: number }>;
}

export function useNewtonStatus({ available, polling, currentValues }: UseNewtonStatusOptions) {
  const [result, setResult] = useState<NewtonStatusResult | null>(null);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const flushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef(false);
  const currentValuesRef = useRef(currentValues);

  // Keep ref in sync without causing effect re-runs
  currentValuesRef.current = currentValues;

  // Manage stream lifecycle based on available + polling
  useEffect(() => {
    if (!available || !polling) {
      if (startedRef.current) {
        fetch('/api/newton/stream/stop', { method: 'POST' }).catch(() => {});
        startedRef.current = false;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setConnected(false);
      }
      if (flushIntervalRef.current) {
        clearInterval(flushIntervalRef.current);
        flushIntervalRef.current = null;
      }
      return;
    }

    // Start stream
    if (!startedRef.current) {
      fetch('/api/newton/stream/start', { method: 'POST' }).catch(() => {});
      startedRef.current = true;
    }

    // Connect to SSE
    if (!eventSourceRef.current) {
      const es = new EventSource('/api/newton/stream');
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setResult(data);
        } catch {}
      };
      es.onopen = () => setConnected(true);
      es.onerror = () => setConnected(false);
      eventSourceRef.current = es;
    }

    // Send PID snapshot every 1 second (Newton needs 32+ data points to start analyzing)
    if (!flushIntervalRef.current) {
      flushIntervalRef.current = setInterval(() => {
        const vals = currentValuesRef.current;
        if (!vals || Object.keys(vals).length === 0) return;

        const values: Record<string, number> = {};
        for (const [pid, parsed] of Object.entries(vals)) {
          values[pid] = (parsed as any).value ?? parsed;
        }

        fetch('/api/newton/stream/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timestamp: Date.now(), values }),
        }).catch(() => {});
      }, 1000);
    }

    return () => {
      if (flushIntervalRef.current) {
        clearInterval(flushIntervalRef.current);
        flushIntervalRef.current = null;
      }
    };
  }, [available, polling]); // Only re-run when these change, NOT on currentValues

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (startedRef.current) {
        fetch('/api/newton/stream/stop', { method: 'POST' }).catch(() => {});
        startedRef.current = false;
      }
      if (flushIntervalRef.current) {
        clearInterval(flushIntervalRef.current);
        flushIntervalRef.current = null;
      }
    };
  }, []);

  return { result, connected };
}
