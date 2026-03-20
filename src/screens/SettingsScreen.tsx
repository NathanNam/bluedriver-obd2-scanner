// ============================================================
// SettingsScreen — units, theme, adapter info, about
// ============================================================

import React from 'react';
import { useThemeColors } from '../utils/hooks';
import { useSettingsStore } from '../store/settingsStore';
import { useBluetoothStore } from '../store/bluetoothStore';
import { UnitSystem, ThemeMode } from '../types';

export function SettingsScreen() {
  const theme = useThemeColors();
  const { unitSystem, themeMode, setUnitSystem, setThemeMode } = useSettingsStore();
  const { connectionState, connectedDeviceName } = useBluetoothStore();

  const ButtonGroup = ({
    options,
    selected,
    onSelect,
  }: {
    options: { label: string; value: string }[];
    selected: string;
    onSelect: (value: any) => void;
  }) => (
    <div
      style={{
        display: 'flex',
        borderRadius: 8,
        border: `1px solid ${theme.border}`,
        overflow: 'hidden',
        backgroundColor: theme.surfaceSecondary,
      }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onSelect(opt.value)}
          style={{
            flex: 1,
            padding: '10px 0',
            fontSize: 13,
            fontWeight: 500,
            border: 'none',
            cursor: 'pointer',
            backgroundColor: selected === opt.value ? theme.primary : 'transparent',
            color: selected === opt.value ? '#FFFFFF' : theme.text,
            transition: 'background-color 0.15s, color 0.15s',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 0',
      }}
    >
      <span style={{ fontSize: 14, color: theme.textSecondary }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>{value}</span>
    </div>
  );

  const Section = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div
      style={{
        backgroundColor: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
      }}
    >
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
        {title}
      </div>
      {children}
    </div>
  );

  return (
    <div style={{ minHeight: '100%', backgroundColor: theme.background, padding: 20, paddingBottom: 48 }}>
      <h1 style={{ margin: '0 0 20px', fontSize: 28, fontWeight: 700, color: theme.text }}>
        Settings
      </h1>

      {/* Units */}
      <Section title="Units">
        <ButtonGroup
          options={[
            { label: 'Imperial (\u00B0F, mph)', value: 'imperial' },
            { label: 'Metric (\u00B0C, km/h)', value: 'metric' },
          ]}
          selected={unitSystem}
          onSelect={(v: UnitSystem) => setUnitSystem(v)}
        />
      </Section>

      {/* Theme */}
      <Section title="Appearance">
        <ButtonGroup
          options={[
            { label: 'System', value: 'system' },
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
          ]}
          selected={themeMode}
          onSelect={(v: ThemeMode) => setThemeMode(v)}
        />
      </Section>

      {/* Adapter Info */}
      <Section title="Adapter">
        <InfoRow label="Status" value={connectionState} />
        <InfoRow label="Device" value={connectedDeviceName ?? 'None'} />
      </Section>

      {/* About */}
      <Section title="About">
        <InfoRow label="App Version" value="1.0.0" />
        <InfoRow label="OBD Protocol" value="ELM327" />
      </Section>
    </div>
  );
}
