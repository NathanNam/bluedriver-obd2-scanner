// ============================================================
// Custom hooks
// ============================================================

import { useColorScheme } from 'react-native';
import { colors, darkColors } from './theme';
import { useSettingsStore } from '../store/settingsStore';

export function useThemeColors() {
  const systemScheme = useColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);

  const isDark =
    themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');

  return isDark ? darkColors : colors;
}
