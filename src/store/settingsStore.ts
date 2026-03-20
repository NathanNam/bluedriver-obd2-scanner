// ============================================================
// Settings Store — user preferences
// ============================================================

import { create } from 'zustand';
import { UnitSystem, ThemeMode } from '../types';

interface SettingsStore {
  unitSystem: UnitSystem;
  themeMode: ThemeMode;

  setUnitSystem: (system: UnitSystem) => void;
  setThemeMode: (mode: ThemeMode) => void;

  // Unit conversion helpers
  convertTemp: (celsius: number) => number;
  convertSpeed: (kmh: number) => number;
  tempUnit: () => string;
  speedUnit: () => string;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  unitSystem: 'imperial',
  themeMode: 'system',

  setUnitSystem: (system) => set({ unitSystem: system }),
  setThemeMode: (mode) => set({ themeMode: mode }),

  convertTemp: (celsius: number) => {
    if (get().unitSystem === 'imperial') {
      return Math.round((celsius * 9) / 5 + 32);
    }
    return celsius;
  },

  convertSpeed: (kmh: number) => {
    if (get().unitSystem === 'imperial') {
      return Math.round(kmh * 0.621371);
    }
    return kmh;
  },

  tempUnit: () => (get().unitSystem === 'imperial' ? '°F' : '°C'),
  speedUnit: () => (get().unitSystem === 'imperial' ? 'mph' : 'km/h'),
}));
