// ============================================================
// Gauge — SVG circular arc gauge for live PID data
// ============================================================

import React from 'react';
import { PIDDefinition } from '../types';
import { useThemeColors } from '../utils/hooks';

interface Props {
  value: number | null;
  definition: PIDDefinition;
  size?: number;
  onPress?: () => void;
}

export function Gauge({ value, definition, size = 140, onPress }: Props) {
  const theme = useThemeColors();

  const displayValue = value ?? 0;
  const range = definition.max - definition.min;
  const normalized = Math.max(0, Math.min(1, (displayValue - definition.min) / range));

  // Arc geometry
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 12;
  const startAngle = 135;
  const endAngle = 405;
  const arcSweep = endAngle - startAngle;

  const angleToPoint = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: centerX + radius * Math.cos(rad),
      y: centerY + radius * Math.sin(rad),
    };
  };

  const buildArc = (startDeg: number, endDeg: number) => {
    const start = angleToPoint(startDeg);
    const end = angleToPoint(endDeg);
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  // Determine color based on thresholds
  const getValueColor = () => {
    if (value === null) return theme.textTertiary;
    // For fuel tank (PID 2F), reverse the logic — low is bad
    if (definition.pid === '2F') {
      if (definition.criticalThreshold && displayValue <= definition.criticalThreshold) return theme.gaugeRed;
      if (definition.cautionThreshold && displayValue <= definition.cautionThreshold) return theme.gaugeYellow;
      return theme.gaugeGreen;
    }
    if (definition.criticalThreshold && displayValue >= definition.criticalThreshold) return theme.gaugeRed;
    if (definition.cautionThreshold && displayValue >= definition.cautionThreshold) return theme.gaugeYellow;
    return theme.gaugeGreen;
  };

  const valueAngle = startAngle + normalized * arcSweep;
  const valueColor = getValueColor();
  const needleEnd = angleToPoint(valueAngle);

  const content = (
    <div
      style={{
        width: size,
        height: size + 36,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background arc */}
        <path
          d={buildArc(startAngle, endAngle)}
          stroke={theme.gaugeArc}
          strokeWidth={8}
          fill="none"
          strokeLinecap="round"
        />
        {/* Value arc */}
        {value !== null && normalized > 0.01 && (
          <path
            d={buildArc(startAngle, Math.min(valueAngle, endAngle - 0.5))}
            stroke={valueColor}
            strokeWidth={8}
            fill="none"
            strokeLinecap="round"
          />
        )}
        {/* Center dot */}
        <circle cx={centerX} cy={centerY} r={4} fill={theme.textSecondary} />
        {/* Needle */}
        <line
          x1={centerX}
          y1={centerY}
          x2={needleEnd.x}
          y2={needleEnd.y}
          stroke={valueColor}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      </svg>

      {/* Value text overlay */}
      <div
        style={{
          position: 'absolute',
          top: centerY - 8,
          left: 0,
          right: 0,
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: theme.text,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value !== null ? Math.round(displayValue).toString() : '--'}
        </span>
      </div>

      {/* Labels */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginTop: -8,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: theme.textSecondary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: size,
          }}
        >
          {definition.shortName}
        </span>
        <span style={{ fontSize: 11, color: theme.textTertiary }}>
          {definition.unit}
        </span>
      </div>

      {/* Min / Max range labels */}
      <div
        style={{
          position: 'absolute',
          bottom: 36,
          width: size,
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          padding: '0 12px',
          boxSizing: 'border-box',
          pointerEvents: 'none',
        }}
      >
        <span style={{ fontSize: 9, color: theme.textTertiary }}>{definition.min}</span>
        <span style={{ fontSize: 9, color: theme.textTertiary }}>{definition.max}</span>
      </div>
    </div>
  );

  if (onPress) {
    return (
      <div onClick={onPress} style={{ cursor: 'pointer' }}>
        {content}
      </div>
    );
  }

  return content;
}
