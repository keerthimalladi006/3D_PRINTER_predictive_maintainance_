import { useEffect, useRef, useState } from 'react';

interface SeriesConfig {
  key: string;
  color: string;
  label: string;
}

interface Props {
  series: { t: number; [key: string]: number }[];
  configs: SeriesConfig[];
  height?: number;
  yLabel?: string;
  highlightStart?: number;
  highlightEnd?: number;
  showXAxis?: boolean;
  showLegend?: boolean;
  compact?: boolean;
}

export function TimeSeriesChart({
  series,
  configs,
  height = 160,
  yLabel,
  highlightStart,
  highlightEnd,
  showXAxis = true,
  showLegend = true,
  compact = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(e.contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Read theme-aware colors from CSS variables
  const [gridColor, setGridColor] = useState('rgb(28, 33, 42)');
  const [axisColor, setAxisColor] = useState('rgb(40, 45, 56)');
  const [chartTextColor, setChartTextColor] = useState('rgb(104, 112, 126)');

  useEffect(() => {
    const root = document.documentElement;
    const cs = getComputedStyle(root);
    const gv = cs.getPropertyValue('--c-grid-line').trim();
    const av = cs.getPropertyValue('--c-axis-line').trim();
    const tv = cs.getPropertyValue('--c-chart-text').trim();
    if (gv) setGridColor(`rgb(${gv})`);
    if (av) setAxisColor(`rgb(${av})`);
    if (tv) setChartTextColor(`rgb(${tv})`);
  });

  const padL = compact ? 36 : 48;
  const padR = 12;
  const padT = compact ? 8 : 16;
  const padB = showXAxis ? (compact ? 18 : 24) : 8;
  const plotW = Math.max(0, width - padL - padR);
  const plotH = Math.max(0, height - padT - padB);

  const tMin = series.length > 0 ? series[0].t : 0;
  const tMax = series.length > 0 ? series[series.length - 1].t : 1;

  let vMin = Infinity;
  let vMax = -Infinity;
  for (const s of series) {
    for (const c of configs) {
      const v = s[c.key];
      if (v < vMin) vMin = v;
      if (v > vMax) vMax = v;
    }
  }
  if (!isFinite(vMin) || !isFinite(vMax)) {
    vMin = 0;
    vMax = 1;
  }
  const range = vMax - vMin || 1;
  vMin -= range * 0.08;
  vMax += range * 0.08;

  const xScale = (t: number) => padL + ((t - tMin) / (tMax - tMin || 1)) * plotW;
  const yScale = (v: number) => padT + plotH - ((v - vMin) / (vMax - vMin || 1)) * plotH;

  const gridVals = [0, 0.25, 0.5, 0.75, 1].map((f) => vMin + f * (vMax - vMin));

  const paths = configs.map((c) => {
    if (series.length === 0) return '';
    let d = '';
    for (let i = 0; i < series.length; i++) {
      const x = xScale(series[i].t);
      const y = yScale(series[i][c.key]);
      d += i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d;
  });

  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => tMin + f * (tMax - tMin));

  const fmtTime = (t: number) => {
    const d = new Date(t);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  const fmtVal = (v: number) => {
    const r = Math.abs(v);
    if (r >= 100) return v.toFixed(0);
    if (r >= 10) return v.toFixed(1);
    if (r >= 1) return v.toFixed(2);
    return v.toFixed(3);
  };

  return (
    <div ref={containerRef} className="w-full">
      {showLegend && (
        <div className="mb-1.5 flex flex-wrap items-center gap-3">
          {configs.map((c) => (
            <span key={c.key} className="flex items-center gap-1.5 text-2xs text-txt-secondary">
              <span className="inline-block w-3 h-px" style={{ backgroundColor: c.color }} />
              {c.label}
            </span>
          ))}
        </div>
      )}
      <svg width={width} height={height} className="block overflow-visible">
        {gridVals.map((v, i) => (
          <g key={i}>
            <line
              x1={padL}
              x2={padL + plotW}
              y1={yScale(v)}
              y2={yScale(v)}
              stroke={gridColor}
              strokeWidth={1}
            />
            <text
              x={padL - 6}
              y={yScale(v) + 3}
              textAnchor="end"
              fill={chartTextColor}
              fontSize={10}
              fontFamily="monospace"
            >
              {fmtVal(v)}
            </text>
          </g>
        ))}

        {yLabel && (
          <text
            x={12}
            y={padT + plotH / 2}
            textAnchor="middle"
            transform={`rotate(-90 12 ${padT + plotH / 2})`}
            fill={chartTextColor}
            fontSize={10}
          >
            {yLabel}
          </text>
        )}

        {highlightStart !== undefined && highlightEnd !== undefined && (
          <rect
            x={xScale(highlightStart)}
            y={padT}
            width={Math.max(1, xScale(highlightEnd) - xScale(highlightStart))}
            height={plotH}
            fill="rgba(200, 40, 40, 0.07)"
            stroke="rgba(200, 40, 40, 0.3)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}

        {paths.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={configs[i].color}
            strokeWidth={1.2}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {showXAxis &&
          xTicks.map((t, i) => (
            <text
              key={i}
              x={xScale(t)}
              y={height - 4}
              textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}
              fill={chartTextColor}
              fontSize={10}
              fontFamily="monospace"
            >
              {fmtTime(t)}
            </text>
          ))}

        <line
          x1={padL}
          x2={padL + plotW}
          y1={padT + plotH}
          y2={padT + plotH}
          stroke={axisColor}
          strokeWidth={1}
        />
      </svg>
    </div>
  );
}
