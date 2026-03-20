// ============================================================
// Gauge — circular arc gauge with animated needle (SVG)
// ============================================================

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { PIDDefinition } from '../types';
import { borderRadius, fontSize, spacing } from '../utils/theme';
import { useThemeColors } from '../utils/hooks';

interface Props {
  value: number | null;
  definition: PIDDefinition;
  size?: number;
  onPress?: () => void;
}

export function Gauge({ value, definition, size = 140, onPress }: Props) {
  const theme = useThemeColors();
  const animatedValue = useRef(new Animated.Value(0)).current;

  const displayValue = value ?? 0;
  const range = definition.max - definition.min;
  const normalized = Math.max(0, Math.min(1, (displayValue - definition.min) / range));

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: normalized,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [normalized]);

  // Arc geometry
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 12;
  const startAngle = 135; // degrees
  const endAngle = 405; // degrees (270 degree arc)
  const arcSweep = endAngle - startAngle;

  // Convert angle to radians and get point
  const angleToPoint = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: centerX + radius * Math.cos(rad),
      y: centerY + radius * Math.sin(rad),
    };
  };

  // Build arc path
  const buildArc = (startDeg: number, endDeg: number) => {
    const start = angleToPoint(startDeg);
    const end = angleToPoint(endDeg);
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  // Determine color based on thresholds
  const getValueColor = () => {
    if (value === null) return theme.textTertiary;
    // For fuel tank, reverse the logic (low is bad)
    if (definition.pid === '2F') {
      if (definition.criticalThreshold && displayValue <= definition.criticalThreshold) return theme.gaugeRed;
      if (definition.cautionThreshold && displayValue <= definition.cautionThreshold) return theme.gaugeYellow;
      return theme.gaugeGreen;
    }
    if (definition.criticalThreshold && displayValue >= definition.criticalThreshold) return theme.gaugeRed;
    if (definition.cautionThreshold && displayValue >= definition.cautionThreshold) return theme.gaugeYellow;
    return theme.gaugeGreen;
  };

  // Colored arc for current value
  const valueAngle = startAngle + normalized * arcSweep;
  const valueColor = getValueColor();

  // Needle endpoint
  const needleEnd = angleToPoint(valueAngle);

  const content = (
    <View style={[styles.container, { width: size, height: size + 36 }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background arc */}
        <Path
          d={buildArc(startAngle, endAngle)}
          stroke={theme.gaugeArc}
          strokeWidth={8}
          fill="none"
          strokeLinecap="round"
        />
        {/* Value arc */}
        {value !== null && normalized > 0.01 && (
          <Path
            d={buildArc(startAngle, Math.min(valueAngle, endAngle - 0.5))}
            stroke={valueColor}
            strokeWidth={8}
            fill="none"
            strokeLinecap="round"
          />
        )}
        {/* Center dot */}
        <Circle cx={centerX} cy={centerY} r={4} fill={theme.textSecondary} />
        {/* Needle */}
        <Path
          d={`M ${centerX} ${centerY} L ${needleEnd.x} ${needleEnd.y}`}
          stroke={valueColor}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      </Svg>
      {/* Value text overlay */}
      <View style={[styles.valueContainer, { top: centerY - 8 }]}>
        <Text style={[styles.value, { color: theme.text }]}>
          {value !== null ? Math.round(displayValue).toString() : '--'}
        </Text>
      </View>
      {/* Labels */}
      <View style={styles.labelContainer}>
        <Text style={[styles.label, { color: theme.textSecondary }]} numberOfLines={1}>
          {definition.shortName}
        </Text>
        <Text style={[styles.unit, { color: theme.textTertiary }]}>
          {definition.unit}
        </Text>
      </View>
      {/* Min/Max */}
      <View style={[styles.rangeContainer, { width: size }]}>
        <Text style={[styles.rangeText, { color: theme.textTertiary }]}>
          {definition.min}
        </Text>
        <Text style={[styles.rangeText, { color: theme.textTertiary }]}>
          {definition.max}
        </Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueContainer: {
    position: 'absolute',
    alignItems: 'center',
    left: 0,
    right: 0,
  },
  value: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  labelContainer: {
    alignItems: 'center',
    marginTop: -spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  unit: {
    fontSize: fontSize.xs,
  },
  rangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    position: 'absolute',
    bottom: 36,
  },
  rangeText: {
    fontSize: 9,
  },
});
