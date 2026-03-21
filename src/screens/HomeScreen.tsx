// ============================================================
// HomeScreen — BT device discovery, connection, mode selection
// ============================================================

import React, { useState } from 'react';
import { useThemeColors } from '../utils/hooks';
import { useBluetoothStore } from '../store/bluetoothStore';
import { ConnectionStatusBar } from '../components/ConnectionStatusBar';
import { bluetoothManager } from '../bluetooth/manager';

interface Props {
  onNavigate: (screen: string, params?: any) => void;
}

export function HomeScreen({ onNavigate }: Props) {
  const theme = useThemeColors();
  const {
    connectionState,
    discoveredDevices,
    connectedDeviceName,
    error,
    startScan,
    stopScan,
    connect,
    disconnect,
    clearError,
  } = useBluetoothStore();

  const [isDemo, setIsDemo] = useState(bluetoothManager.isDemo);
  const webBtAvailable = bluetoothManager.webBluetoothAvailable;

  const isScanning = connectionState === 'SCANNING';
  const isConnected = connectionState === 'READY' || connectionState === 'SCANNING_OBD';
  const isBusy = connectionState === 'CONNECTING' || connectionState === 'INITIALIZING';

  const handleModeToggle = () => {
    const newMode = !isDemo;
    bluetoothManager.setDemoMode(newMode);
    setIsDemo(newMode);
  };

  const handleScanToggle = async () => {
    if (isConnected) {
      const ok = window.confirm('Disconnect from the OBD2 adapter?');
      if (ok) await disconnect();
    } else if (isScanning) {
      stopScan();
    } else {
      await startScan();
    }
  };

  const handleDevicePress = async (deviceId: string) => {
    stopScan();
    await connect(deviceId);
  };

  return (
    <div style={{ minHeight: '100%', backgroundColor: theme.background, padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: theme.text }}>
          OBD2 Scanner
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: theme.textSecondary }}>
          Connect to your vehicle adapter
        </p>
      </div>

      {/* Demo / Real Bluetooth toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', marginBottom: 12,
        backgroundColor: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 10,
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>
            {isDemo ? 'Demo Mode' : 'Real Bluetooth'}
          </div>
          <div style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
            {isDemo
              ? 'Using simulated OBD2 data'
              : webBtAvailable
                ? 'Web Bluetooth enabled — use Chrome'
                : 'Web Bluetooth not supported in this browser'}
          </div>
        </div>
        <button
          onClick={handleModeToggle}
          disabled={isConnected}
          style={{
            padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600,
            backgroundColor: isDemo ? theme.primary : theme.warning,
            color: '#FFF',
            opacity: isConnected ? 0.5 : 1,
            cursor: isConnected ? 'not-allowed' : 'pointer',
          }}
        >
          {isDemo ? 'Use Real BT' : 'Use Demo'}
        </button>
      </div>

      {/* Connection status */}
      <ConnectionStatusBar state={connectionState} deviceName={connectedDeviceName} />

      {/* Error banner */}
      {error && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            backgroundColor: theme.critical + '18',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ color: theme.critical, fontSize: 14 }}>{error}</span>
          <button
            onClick={clearError}
            style={{
              background: 'none',
              border: 'none',
              color: theme.critical,
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Scan / Disconnect button */}
      <button
        onClick={handleScanToggle}
        disabled={isBusy}
        style={{
          marginTop: 16,
          width: '100%',
          padding: '14px 0',
          fontSize: 16,
          fontWeight: 600,
          color: '#FFFFFF',
          backgroundColor: isConnected
            ? theme.critical
            : isScanning
            ? theme.textSecondary
            : theme.primary,
          border: 'none',
          borderRadius: 10,
          cursor: isBusy ? 'not-allowed' : 'pointer',
          opacity: isBusy ? 0.5 : 1,
        }}
      >
        {isConnected
          ? 'Disconnect'
          : isScanning
          ? 'Stop Scanning'
          : isBusy
          ? 'Connecting...'
          : 'Scan for Devices'}
      </button>

      {/* Discovered devices list */}
      {!isConnected && discoveredDevices.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.5,
              color: theme.textSecondary,
              marginBottom: 10,
              textTransform: 'uppercase',
            }}
          >
            Discovered Devices
          </div>
          {discoveredDevices.map((device) => (
            <button
              key={device.id}
              onClick={() => handleDevicePress(device.id)}
              disabled={isBusy}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '14px 16px',
                marginBottom: 8,
                backgroundColor: theme.surface,
                border: `1px solid ${theme.border}`,
                borderRadius: 10,
                cursor: isBusy ? 'not-allowed' : 'pointer',
                textAlign: 'left',
              }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>
                  {device.name || 'Unknown Device'}
                </div>
                <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                  {device.id}
                </div>
              </div>
              {device.rssi != null && (
                <span style={{ fontSize: 12, color: theme.textTertiary }}>
                  {device.rssi} dBm
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Mode cards when connected */}
      {isConnected && (
        <div style={{ marginTop: 32 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.5,
              color: theme.textSecondary,
              marginBottom: 12,
              textTransform: 'uppercase',
            }}
          >
            Choose Scan Mode
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            <button
              onClick={() => onNavigate('scan')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                width: '100%',
                padding: 16,
                backgroundColor: theme.surface,
                border: `1px solid ${theme.border}`,
                borderRadius: 12,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  backgroundColor: theme.primary + '15',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
                {'{ }'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: theme.text }}>
                  One-Time Scan
                </div>
                <div style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2 }}>
                  Read fault codes, VIN, and vehicle info
                </div>
              </div>
              <span style={{ fontSize: 20, color: theme.textTertiary, fontWeight: 300 }}>
                {'>'}
              </span>
            </button>

            <button
              onClick={() => onNavigate('live')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                width: '100%',
                padding: 16,
                backgroundColor: theme.surface,
                border: `1px solid ${theme.border}`,
                borderRadius: 12,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  backgroundColor: theme.success + '15',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
                ~
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: theme.text }}>
                  Live Scan
                </div>
                <div style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2 }}>
                  Real-time gauges, charts, and recording
                </div>
              </div>
              <span style={{ fontSize: 20, color: theme.textTertiary, fontWeight: 300 }}>
                {'>'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
