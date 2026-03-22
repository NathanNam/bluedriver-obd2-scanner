import React from 'react';
import { NewtonStatusResult } from '../hooks/useNewtonStatus';
import { useThemeColors } from '../utils/hooks';

interface Props {
  result: NewtonStatusResult | null;
  polling: boolean;
}

export function NewtonIndicator({ result, polling }: Props) {
  const theme = useThemeColors();

  if (!polling) return null;

  const isNormal = result?.label === 'normal';
  const hasIssues = result?.issues && result.issues.length > 0;

  const dotColor = !result ? theme.textTertiary : isNormal ? theme.success : theme.warning;
  const label = !result ? 'Analyzing...' : isNormal ? 'Car OK' : 'Attention';

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 12px', borderRadius: 8,
        backgroundColor: !result ? theme.surfaceSecondary
          : isNormal ? theme.success + '15'
            : theme.warning + '15',
        border: `1px solid ${!result ? theme.border : isNormal ? theme.success + '30' : theme.warning + '30'}`,
        cursor: hasIssues ? 'pointer' : 'default',
      }}
        title={hasIssues ? result!.issues.join('\n') : undefined}
      >
        <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor }} />
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: theme.text, lineHeight: '14px' }}>
            Newton
          </div>
          <div style={{
            fontSize: 10, fontWeight: 600,
            color: !result ? theme.textTertiary : isNormal ? theme.success : theme.warning,
          }}>
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}
