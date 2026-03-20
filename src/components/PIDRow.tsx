// ============================================================
// PIDRow — row in PID picker list
// ============================================================

import React from 'react';
import { PIDDefinition, ParsedPID } from '../types';
import { useThemeColors } from '../utils/hooks';

interface Props {
  definition: PIDDefinition;
  currentValue?: ParsedPID | null;
  isSelected: boolean;
  isUnsupported: boolean;
  onSelect: () => void;
}

export function PIDRow({ definition, currentValue, isSelected, isUnsupported, onSelect }: Props) {
  const theme = useThemeColors();

  return (
    <button
      onClick={onSelect}
      disabled={isUnsupported}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        border: `1px solid ${isSelected ? theme.primary : theme.border}`,
        borderRadius: 6,
        marginBottom: 4,
        backgroundColor: isSelected ? theme.primary + '15' : theme.surface,
        opacity: isUnsupported ? 0.4 : 1,
        cursor: isUnsupported ? 'default' : 'pointer',
        width: '100%',
        textAlign: 'left',
        outline: 'none',
        fontFamily: 'inherit',
      }}
    >
      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: theme.text,
            display: 'block',
          }}
        >
          {definition.name}
        </span>
        <span
          style={{
            fontSize: 11,
            marginTop: 2,
            color: theme.textSecondary,
            display: 'block',
          }}
        >
          PID 0x{definition.pid} | {definition.min}&ndash;{definition.max} {definition.unit}
        </span>
      </div>

      {/* Value */}
      <div style={{ textAlign: 'right', minWidth: 80, flexShrink: 0 }}>
        {currentValue ? (
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: theme.primary,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {Math.round(currentValue.value)} {definition.unit}
          </span>
        ) : isUnsupported ? (
          <span style={{ fontSize: 13, color: theme.textTertiary }}>N/A</span>
        ) : (
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: theme.textTertiary,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            --
          </span>
        )}
      </div>
    </button>
  );
}
