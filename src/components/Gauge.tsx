// ============================================================
// Gauge — SVG circular arc gauge for live PID data
// ============================================================

import React, { useState, useEffect } from 'react';
import { PIDDefinition, PIDStats } from '../types';
import { useThemeColors } from '../utils/hooks';

interface Props {
  value: number | null;
  definition: PIDDefinition;
  size?: number;
  onPress?: () => void;
  stats?: PIDStats | null;
  isCritical?: boolean;
}

export function Gauge({ value, definition, size = 140, onPress, stats, isCritical }: Props) {
  const theme = useThemeColors();
  const [flashOn, setFlashOn] = useState(false);

  // Flash animation for critical alerts
  useEffect(() => {
    if (!isCritical) { setFlashOn(false); return; }
    const interval = setInterval(() => setFlashOn((v) => !v), 500);
    return () => clearInterval(interval);
  }, [isCritical]);

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
    return { x: centerX + radius * Math.cos(rad), y: centerY + radius * Math.sin(rad) };
  };

  const buildArc = (startDeg: number, endDeg: number) => {
    const start = angleToPoint(startDeg);
    const end = angleToPoint(endDeg);
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  const getValueColor = () => {
    if (value === null) return theme.textTertiary;
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
        height: size + (stats ? 52 : 36),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        border: isCritical ? `3px solid ${flashOn ? theme.gaugeRed : 'transparent'}` : '3px solid transparent',
        borderRadius: 12,
        transition: 'border-color 0.2s ease',
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <path d={buildArc(startAngle, endAngle)} stroke={theme.gaugeArc} strokeWidth={8} fill="none" strokeLinecap="round" />
        {value !== null && normalized > 0.01 && (
          <path d={buildArc(startAngle, Math.min(valueAngle, endAngle - 0.5))} stroke={valueColor} strokeWidth={8} fill="none" strokeLinecap="round" />
        )}
        <circle cx={centerX} cy={centerY} r={4} fill={theme.textSecondary} />
        <line x1={centerX} y1={centerY} x2={needleEnd.x} y2={needleEnd.y} stroke={valueColor} strokeWidth={2.5} strokeLinecap="round" />
      </svg>

      {/* Value text */}
      <div style={{ position: 'absolute', top: centerY - 8, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: isCritical && flashOn ? theme.gaugeRed : theme.text, fontVariantNumeric: 'tabular-nums' }}>
          {value !== null ? Math.round(displayValue).toString() : '--'}
        </span>
      </div>

      {/* Labels */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: theme.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: size }}>
          {definition.shortName}
        </span>
        <span style={{ fontSize: 11, color: theme.textTertiary }}>{definition.unit}</span>
      </div>

      {/* Min/Max/Avg stats */}
      {stats && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 2 }}>
          <span style={{ fontSize: 9, color: theme.textTertiary, fontVariantNumeric: 'tabular-nums' }}>
            L:{Math.round(stats.min)}
          </span>
          <span style={{ fontSize: 9, color: theme.textTertiary, fontVariantNumeric: 'tabular-nums' }}>
            H:{Math.round(stats.max)}
          </span>
          <span style={{ fontSize: 9, color: theme.textTertiary, fontVariantNumeric: 'tabular-nums' }}>
            Avg:{Math.round(stats.avg)}
          </span>
        </div>
      )}

      {/* Range labels */}
      <div style={{ position: 'absolute', bottom: stats ? 52 : 36, width: size, display: 'flex', justifyContent: 'space-between', padding: '0 12px', boxSizing: 'border-box', pointerEvents: 'none' }}>
        <span style={{ fontSize: 9, color: theme.textTertiary }}>{definition.min}</span>
        <span style={{ fontSize: 9, color: theme.textTertiary }}>{definition.max}</span>
      </div>
    </div>
  );

  if (onPress) {
    return <div onClick={onPress} style={{ cursor: 'pointer' }}>{content}</div>;
  }
  return content;
}
