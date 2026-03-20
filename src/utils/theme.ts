// ============================================================
// Theme — colors & styling constants
// ============================================================

export const colors = {
  // Primary
  primary: '#007AFF',
  primaryDark: '#0055CC',
  primaryLight: '#4DA3FF',

  // Severity
  critical: '#FF3B30',
  warning: '#FF9500',
  success: '#34C759',
  info: '#5AC8FA',

  // Gauge zones
  gaugeGreen: '#34C759',
  gaugeYellow: '#FF9500',
  gaugeRed: '#FF3B30',
  gaugeArc: '#E5E5EA',

  // Backgrounds
  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceSecondary: '#F9F9FB',

  // Text
  text: '#000000',
  textSecondary: '#8E8E93',
  textTertiary: '#AEAEB2',
  textInverse: '#FFFFFF',

  // Borders
  border: '#E5E5EA',
  separator: '#C6C6C8',

  // Status
  connected: '#34C759',
  connecting: '#FF9500',
  disconnected: '#FF3B30',
  idle: '#8E8E93',
};

export const darkColors: typeof colors = {
  primary: '#0A84FF',
  primaryDark: '#0055CC',
  primaryLight: '#4DA3FF',

  critical: '#FF453A',
  warning: '#FF9F0A',
  success: '#30D158',
  info: '#64D2FF',

  gaugeGreen: '#30D158',
  gaugeYellow: '#FF9F0A',
  gaugeRed: '#FF453A',
  gaugeArc: '#38383A',

  background: '#000000',
  surface: '#1C1C1E',
  surfaceSecondary: '#2C2C2E',

  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  textTertiary: '#636366',
  textInverse: '#000000',

  border: '#38383A',
  separator: '#48484A',

  connected: '#30D158',
  connecting: '#FF9F0A',
  disconnected: '#FF453A',
  idle: '#8E8E93',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 28,
  xxxl: 34,
};
