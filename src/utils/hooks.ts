import { useSyncExternalStore } from 'react';
import { colors, darkColors } from './theme';
import { useSettingsStore } from '../store/settingsStore';

function subscribeToColorScheme(callback: () => void) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function getSystemIsDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function useThemeColors() {
  const systemIsDark = useSyncExternalStore(subscribeToColorScheme, getSystemIsDark);
  const themeMode = useSettingsStore((s) => s.themeMode);
  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemIsDark);
  return isDark ? darkColors : colors;
}

function subscribeToResize(callback: () => void) {
  window.addEventListener('resize', callback);
  return () => window.removeEventListener('resize', callback);
}

function getWindowWidth() {
  return window.innerWidth;
}

export function useWindowWidth() {
  return useSyncExternalStore(subscribeToResize, getWindowWidth);
}
