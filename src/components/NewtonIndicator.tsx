import React from 'react';
import { NewtonStatusResult } from '../hooks/useNewtonStatus';
import { useThemeColors } from '../utils/hooks';

interface Props {
  result: NewtonStatusResult | null;
  connected: boolean;
  available: boolean;
}

export function NewtonIndicator({ result, connected, available }: Props) {
  const theme = useThemeColors();

  if (!available) return null;

  const isNormal = result?.label === 'normal';
  const isAttention = result?.label === 'attention';
  const age = result ? Math.round((Date.now() - result.timestamp) / 1000) : 0;
  const isStale = age > 30;

  const dotColor = !result
    ? theme.textTertiary
    : isStale
      ? theme.textTertiary
      : isNormal
        ? theme.success
        : theme.warning;

  const label = !connected
    ? 'Connecting...'
    : !result
      ? 'Analyzing...'
      : isNormal
        ? 'Car OK'
        : 'Attention';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 12px', borderRadius: 8,
      backgroundColor: !result ? theme.surfaceSecondary
        : isNormal ? theme.success + '15'
          : theme.warning + '15',
      border: `1px solid ${!result ? theme.border : isNormal ? theme.success + '30' : theme.warning + '30'}`,
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: dotColor,
      }} />
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: theme.text, lineHeight: '14px' }}>
          Newton
        </div>
        <div style={{
          fontSize: 10, fontWeight: 600,
          color: !result ? theme.textTertiary : isNormal ? theme.success : theme.warning,
        }}>
          {label}
          {result && !isStale && ` ${result.confidence}%`}
        </div>
      </div>
    </div>
  );
}
