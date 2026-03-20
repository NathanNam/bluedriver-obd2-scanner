// ============================================================
// StatusBadge — colored pill badge for status labels
// ============================================================

import React from 'react';

interface Props {
  label: string;
  color: string;
  textColor?: string;
  size?: 'small' | 'medium';
}

export function StatusBadge({ label, color, textColor = '#FFFFFF', size = 'medium' }: Props) {
  const isSmall = size === 'small';

  return (
    <span
      style={{
        display: 'inline-block',
        backgroundColor: color,
        borderRadius: isSmall ? 4 : 6,
        paddingLeft: isSmall ? 6 : 8,
        paddingRight: isSmall ? 6 : 8,
        paddingTop: isSmall ? 2 : 4,
        paddingBottom: isSmall ? 2 : 4,
        color: textColor,
        fontSize: isSmall ? 11 : 13,
        fontWeight: 600,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}
