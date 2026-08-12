import { useState } from "react";
import type { CSSProperties } from "react";

type ChartPoint = { label: string; value: number };

const compactMoney = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

const currency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);

export function LineChart({
  points,
  comparisonPoints,
  className = "",
}: {
  points: ChartPoint[];
  comparisonPoints?: ChartPoint[];
  className?: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const width = 640;
  const height = 220;
  const padding = 20;
  const max = Math.max(
    1,
    ...points.map((point) => point.value),
    ...(comparisonPoints ?? []).map((point) => point.value),
  );
  const coordinates = points.map((point, index) => ({
    ...point,
    x:
      points.length === 1
        ? width / 2
        : padding + (index / (points.length - 1)) * (width - padding * 2),
    y: height - padding - (point.value / max) * (height - padding * 2),
  }));
  const line = coordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${padding},${height - padding} ${line} ${width - padding},${height - padding}`;
  const comparisonCoordinates = (comparisonPoints ?? []).map((point, index) => ({
    ...point,
    x:
      comparisonPoints?.length === 1
        ? width / 2
        : padding +
          (index / Math.max(1, (comparisonPoints?.length ?? 1) - 1)) *
            (width - padding * 2),
    y: height - padding - (point.value / max) * (height - padding * 2),
  }));
  const updateActivePoint = (clientX: number, element: HTMLDivElement) => {
    if (!coordinates.length) return;
    const bounds = element.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - bounds.left) / bounds.width));
    setActiveIndex(Math.round(ratio * (coordinates.length - 1)));
  };
  const active = activeIndex === null ? null : coordinates[activeIndex];

  return (
    <div
      className={`line-chart ${className}`}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        updateActivePoint(event.clientX, event.currentTarget);
      }}
      onPointerMove={(event) => {
        if (event.pointerType === "mouse" && event.buttons === 0) return;
        updateActivePoint(event.clientX, event.currentTarget);
      }}
      onMouseMove={(event) => updateActivePoint(event.clientX, event.currentTarget)}
      onMouseLeave={() => setActiveIndex(null)}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Gráfico de linha"
      >
        <defs>
          <linearGradient id="line-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity=".2" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((position) => (
          <line
            key={position}
            x1={padding}
            y1={height * position}
            x2={width - padding}
            y2={height * position}
            className="chart-grid-line"
          />
        ))}
        <polygon points={area} fill="url(#line-area)" />
        <polyline points={line} className="chart-line" />
        {comparisonCoordinates.length > 1 && (
          <polyline
            points={comparisonCoordinates.map((point) => `${point.x},${point.y}`).join(" ")}
            className="chart-line chart-line-previous"
          />
        )}
        {coordinates.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            <circle cx={point.x} cy={point.y} r="5" className="chart-point">
              <title>{`${point.label}: ${compactMoney(point.value)}`}</title>
            </circle>
          </g>
        ))}
        {active && (
          <line
            x1={active.x}
            y1={padding}
            x2={active.x}
            y2={height - padding}
            className="chart-touch-guide"
          />
        )}
      </svg>
      {active && (
        <div
          className="chart-tooltip"
          style={{ left: `${(active.x / width) * 100}%` }}
          role="status"
        >
          <small>{active.label}</small>
          <strong>{currency(active.value)}</strong>
        </div>
      )}
      <div className="chart-axis-labels">
        {coordinates.map((point, index) =>
          index === 0 ||
          index === coordinates.length - 1 ||
          index % Math.max(1, Math.ceil(coordinates.length / 5)) === 0 ? (
            <span key={`${point.label}-${index}`}>{point.label}</span>
          ) : null,
        )}
      </div>
    </div>
  );
}

export function Sparkline({ points }: { points: ChartPoint[] }) {
  return <LineChart points={points} className="sparkline" />;
}

export function ComparisonBars({
  items,
}: {
  items: Array<{ label: string; value: number; tone: string }>;
}) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <div className="comparison-bars">
      {items.map((item) => (
        <div key={item.label}>
          <span>
            <strong>{item.label}</strong>
            <b>{compactMoney(item.value)}</b>
          </span>
          <i>
            <em
              className={`bar-${item.tone}`}
              style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }}
              title={`${item.label}: ${compactMoney(item.value)}`}
            />
          </i>
        </div>
      ))}
    </div>
  );
}

export function HorizontalRanking({
  items,
}: {
  items: Array<{ label: string; value: number; detail?: string }>;
}) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <div className="horizontal-ranking">
      {items.map((item) => (
        <div key={item.label}>
          <span>
            <strong>{item.label}</strong>
            <b>{item.detail ?? item.value}</b>
          </span>
          <i>
            <em
              style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }}
            />
          </i>
        </div>
      ))}
    </div>
  );
}

export function ProgressRing({ value }: { value: number }) {
  const bounded = Math.min(100, Math.max(0, value));
  return (
    <div
      className="progress-ring"
      style={{ "--progress": `${bounded * 3.6}deg` } as CSSProperties}
      role="img"
      aria-label={`${bounded.toFixed(0)} por cento`}
    >
      <strong>{bounded.toFixed(0)}%</strong>
    </div>
  );
}
