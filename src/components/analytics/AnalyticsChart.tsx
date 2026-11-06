import React, { useState, useMemo } from 'react';

export interface ChartDataPoint {
  label: string;
  views: number;
  hourNumber?: number;
}

interface AnalyticsChartProps {
  data: ChartDataPoint[];
  metricLabel?: string;
  timeRange?: 'today' | '24h' | '7d' | '30d';
  onTimeRangeChange?: (range: 'today' | '7d' | '30d') => void;
  onMetricChange?: (metric: 'views' | 'visitors') => void;
  selectedMetric?: 'views' | 'visitors';
  totalViews?: number;
  totalVisitors?: number;
}

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({
  data = [],
  metricLabel = 'Views',
  timeRange = 'today',
  onTimeRangeChange,
  onMetricChange,
  selectedMetric = 'views',
  totalViews = 0,
  totalVisitors = 0
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Determine maximum value for Y-axis scaling
  const maxValue = useMemo(() => {
    if (!data.length) return 10;
    const max = Math.max(...data.map(d => d.views || 0));
    return max <= 0 ? 10 : Math.ceil(max * 1.25);
  }, [data]);

  // Y-axis tick intervals
  const yTicks = useMemo(() => {
    return [
      maxValue,
      Math.round(maxValue * 0.66),
      Math.round(maxValue * 0.33),
      0
    ];
  }, [maxValue]);

  // Chart layout dimensions
  const svgWidth = 720;
  const svgHeight = 160;
  const chartTop = 15;
  const chartBottom = 135;
  const chartHeight = chartBottom - chartTop;
  const chartLeft = 32;
  const chartRight = svgWidth - 12;
  const chartWidth = chartRight - chartLeft;

  const barWidth = useMemo(() => {
    if (data.length === 0) return 12;
    const slot = chartWidth / data.length;
    return Math.max(4, Math.min(slot * 0.65, 20));
  }, [chartWidth, data.length]);

  return (
    <div className="bg-white border border-neutral-200/90 rounded-xl p-4 sm:p-5 shadow-2xs">
      {/* Chart Top Bar: Metric Selector, Time Range & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-2 border-b border-neutral-100">
        <div className="flex items-center space-x-3">
          {/* Metric Selector Buttons */}
          <div className="inline-flex items-center bg-neutral-100/90 p-0.5 rounded-lg text-xs font-semibold text-neutral-600">
            <button
              type="button"
              onClick={() => onMetricChange?.('views')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                selectedMetric === 'views'
                  ? 'bg-white text-neutral-900 shadow-2xs font-bold'
                  : 'hover:text-neutral-900'
              }`}
            >
              Views ({totalViews})
            </button>
            <button
              type="button"
              onClick={() => onMetricChange?.('visitors')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                selectedMetric === 'visitors'
                  ? 'bg-white text-neutral-900 shadow-2xs font-bold'
                  : 'hover:text-neutral-900'
              }`}
            >
              Visitors ({totalVisitors})
            </button>
          </div>

          <span className="hidden sm:inline-block text-neutral-300">|</span>

          <span className="text-xs text-neutral-500 font-medium hidden sm:inline-block">
            {timeRange === 'today' ? 'Hourly Activity (24h)' : timeRange === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
          </span>
        </div>

        {/* Date Filter Buttons */}
        <div className="flex items-center space-x-1 self-start sm:self-auto">
          {(['today', '7d', '30d'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onTimeRangeChange?.(r)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
                timeRange === r
                  ? 'bg-neutral-900 text-white font-semibold shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              {r === 'today' ? 'Today' : r === '7d' ? '7 Days' : '30 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Chart Visualization */}
      <div className="relative w-full overflow-hidden select-none" style={{ minHeight: '170px' }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible"
          preserveAspectRatio="none"
        >
          {/* Horizontal Gridlines */}
          {yTicks.map((val, idx) => {
            const y = chartTop + (idx / (yTicks.length - 1)) * chartHeight;
            return (
              <g key={idx}>
                <line
                  x1={chartLeft}
                  y1={y}
                  x2={chartRight}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeDasharray="3 3"
                  strokeWidth="0.8"
                />
                <text
                  x={chartLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="9"
                  fill="#9ca3af"
                  fontFamily="monospace"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Data Bars */}
          {data.map((point, index) => {
            const slotWidth = chartWidth / data.length;
            const xCenter = chartLeft + index * slotWidth + slotWidth / 2;
            const barX = xCenter - barWidth / 2;
            const val = Math.max(0, point.views || 0);
            const height = maxValue > 0 ? (val / maxValue) * chartHeight : 0;
            const barY = chartBottom - height;
            const isHovered = hoveredIndex === index;

            return (
              <g
                key={index}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Full-height transparent hit area for smooth hover */}
                <rect
                  x={chartLeft + index * slotWidth}
                  y={chartTop}
                  width={slotWidth}
                  height={chartHeight}
                  fill={isHovered ? 'rgba(16, 185, 129, 0.08)' : 'transparent'}
                  rx="3"
                />

                {/* Visible Data Bar */}
                {height > 0 ? (
                  <rect
                    x={barX}
                    y={barY}
                    width={barWidth}
                    height={Math.max(2, height)}
                    rx="2"
                    fill={isHovered ? '#047857' : '#10b981'}
                    className="transition-colors duration-150"
                  />
                ) : (
                  /* Zero baseline tick */
                  <circle
                    cx={xCenter}
                    cy={chartBottom - 1}
                    r="1.5"
                    fill={isHovered ? '#10b981' : '#e5e7eb'}
                  />
                )}
              </g>
            );
          })}

          {/* Baseline axis */}
          <line
            x1={chartLeft}
            y1={chartBottom}
            x2={chartRight}
            y2={chartBottom}
            stroke="#d1d5db"
            strokeWidth="1"
          />

          {/* X-axis Labels (Sampled to prevent clutter) */}
          {data.map((point, index) => {
            // Show label every 3 hours for 24h, or every few days
            const slotWidth = chartWidth / data.length;
            const xCenter = chartLeft + index * slotWidth + slotWidth / 2;
            const shouldShow = data.length <= 12 
              ? true 
              : data.length <= 24 
                ? index % 3 === 0 || index === data.length - 1
                : index % 5 === 0;

            if (!shouldShow) return null;

            return (
              <text
                key={`label-${index}`}
                x={xCenter}
                y={chartBottom + 16}
                textAnchor="middle"
                fontSize="9"
                fill="#6b7280"
                fontFamily="sans-serif"
                fontWeight="500"
              >
                {point.label}
              </text>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIndex !== null && data[hoveredIndex] && (
          <div
            className="absolute pointer-events-none z-20 -translate-x-1/2 -translate-y-full px-2.5 py-1.5 rounded-md bg-neutral-900 text-white text-[11px] shadow-lg flex flex-col items-center whitespace-nowrap transition-all duration-75"
            style={{
              left: `${((chartLeft + hoveredIndex * (chartWidth / data.length) + (chartWidth / data.length) / 2) / svgWidth) * 100}%`,
              top: `${Math.max(10, ((chartBottom - ((Math.max(0, data[hoveredIndex].views || 0) / maxValue) * chartHeight)) / svgHeight) * 100 - 8)}%`
            }}
          >
            <span className="font-bold tabular-nums">
              {data[hoveredIndex].views} {metricLabel.toLowerCase()}
            </span>
            <span className="text-[9px] text-neutral-400 font-medium">
              {data[hoveredIndex].label}
            </span>
            {/* Tooltip caret arrow */}
            <div className="w-2 h-2 bg-neutral-900 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
          </div>
        )}
      </div>
    </div>
  );
};
