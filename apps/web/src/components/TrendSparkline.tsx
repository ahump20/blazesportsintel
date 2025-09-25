import React, { useMemo } from 'react';

type TrendSparklineProps = {
  data: number[];
  accent: string;
  id?: string;
};

function buildPoints(data: number[]): string {
  if (data.length === 1) {
    return `0,20 100,20`;
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  return data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 40 - ((value - min) / range) * 40;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

export function TrendSparkline({ data, accent, id }: TrendSparklineProps) {
  const points = useMemo(() => buildPoints(data), [data]);
  const gradientId = useMemo(() => id ?? `spark-${Math.random().toString(36).slice(2)}`, [id]);

  if (!data.length) {
    return null;
  }

  return (
    <svg className="sparkline" viewBox="0 0 100 40" preserveAspectRatio="none" role="presentation">
      <defs>
        <linearGradient id={`${gradientId}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline className="sparkline__area" fill={`url(#${gradientId}-fill)`} points={`0,40 ${points} 100,40`} />
      <polyline className="sparkline__line" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" points={points} />
    </svg>
  );
}
