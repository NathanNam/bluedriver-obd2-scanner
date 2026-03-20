// ============================================================
// ConnectionStatusBar — shows BT connection state in a compact bar
// ============================================================

import React from 'react';
import { ConnectionState } from '../types';
import { useThemeColors } from '../utils/hooks';

interface Props {
  state: ConnectionState;
  deviceName?: string | null;
}

const spinnerKeyframes = `
@keyframes obd2-spinner {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

export function ConnectionStatusBar({ state, deviceName }: Props) {
  const theme = useThemeColors();

  const stateConfig: Record<ConnectionState, { color: string; label: string; showSpinner: boolean }> = {
    IDLE: { color: theme.idle, label: 'Not Connected', showSpinner: false },
    SCANNING: { color: theme.connecting, label: 'Scanning...', showSpinner: true },
    CONNECTING: { color: theme.connecting, label: 'Connecting...', showSpinner: true },
    INITIALIZING: { color: theme.connecting, label: 'Initializing...', showSpinner: true },
    READY: { color: theme.connected, label: deviceName ? `Connected: ${deviceName}` : 'Connected', showSpinner: false },
    SCANNING_OBD: { color: theme.connected, label: 'Reading data...', showSpinner: true },
    ERROR: { color: theme.disconnected, label: 'Error', showSpinner: false },
    DISCONNECTED: { color: theme.disconnected, label: 'Disconnected', showSpinner: false },
  };

  const config = stateConfig[state];

  return (
    <>
      <style>{spinnerKeyframes}</style>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          padding: '8px 12px',
          borderRadius: 6,
          border: `1px solid ${theme.border}`,
          backgroundColor: theme.surface,
          gap: 8,
        }}
      >
        {/* Colored dot */}
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: config.color,
            flexShrink: 0,
          }}
        />

        {/* Label */}
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: theme.text,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {config.label}
        </span>

        {/* CSS spinner when connecting */}
        {config.showSpinner && (
          <div
            style={{
              width: 16,
              height: 16,
              border: `2px solid ${theme.border}`,
              borderTopColor: config.color,
              borderRadius: '50%',
              animation: 'obd2-spinner 0.8s linear infinite',
              flexShrink: 0,
            }}
          />
        )}
      </div>
    </>
  );
}
