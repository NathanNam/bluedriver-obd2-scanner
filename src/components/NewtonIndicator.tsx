import React from 'react';
import { HealthResult, NewtonAIResult } from '../hooks/useNewtonStatus';
import { useThemeColors } from '../utils/hooks';

interface Props {
  healthResult: HealthResult | null;
  newtonResult: NewtonAIResult | null;
  newtonConnected: boolean;
  newtonAvailable: boolean;
  polling: boolean;
}

export function NewtonIndicator({ healthResult, newtonResult, newtonConnected, newtonAvailable, polling }: Props) {
  const theme = useThemeColors();

  if (!polling) return null;

  const healthNormal = healthResult?.label === 'normal';
  const newtonAge = newtonResult ? Math.round((Date.now() - newtonResult.timestamp) / 1000) : 0;
  const newtonStale = newtonAge > 60;

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {/* Health Check — local threshold analysis */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', borderRadius: 8,
          backgroundColor: !healthResult ? theme.surfaceSecondary
            : healthNormal ? theme.success + '15' : theme.warning + '15',
          border: `1px solid ${!healthResult ? theme.border : healthNormal ? theme.success + '30' : theme.warning + '30'}`,
        }}
        title={healthResult?.issues?.join('\n') || 'All systems normal'}
      >
        <div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: !healthResult ? theme.textTertiary : healthNormal ? theme.success : theme.warning }} />
        <span style={{ fontSize: 10, fontWeight: 600, color: !healthResult ? theme.textTertiary : healthNormal ? theme.success : theme.warning }}>
          {!healthResult ? '...' : healthNormal ? 'OK' : 'Check'}
        </span>
      </div>

      {/* Newton AI — Machine State Lens (only when available) */}
      {newtonAvailable && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 10px', borderRadius: 8,
            backgroundColor: !newtonResult ? theme.surfaceSecondary
              : newtonStale ? theme.surfaceSecondary
                : newtonResult.label === 'normal' ? theme.success + '15' : theme.warning + '15',
            border: `1px solid ${!newtonResult ? theme.border
              : newtonStale ? theme.border
                : newtonResult.label === 'normal' ? theme.success + '30' : theme.warning + '30'}`,
          }}
          title={newtonResult
            ? `Newton: ${newtonResult.label} (${newtonResult.confidence}%) — ${newtonResult.windows} windows — ${newtonAge}s ago`
            : 'Newton AI analyzing...'}
        >
          <div style={{
            width: 6, height: 6, borderRadius: 3,
            backgroundColor: !newtonResult || newtonStale ? theme.textTertiary
              : newtonResult.label === 'normal' ? theme.success : theme.warning,
          }} />
          <div style={{ lineHeight: '12px' }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: theme.textSecondary }}>Newton</div>
            <div style={{
              fontSize: 10, fontWeight: 600,
              color: !newtonResult || newtonStale ? theme.textTertiary
                : newtonResult.label === 'normal' ? theme.success : theme.warning,
            }}>
              {!newtonResult ? 'Analyzing...'
                : newtonStale ? `${newtonResult.label} (stale)`
                  : `${newtonResult.label === 'normal' ? 'Normal' : 'Attention'} ${newtonResult.confidence}%`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
