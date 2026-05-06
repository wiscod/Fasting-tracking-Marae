"use client";

export type ChartPoint = {
  label: string;
  value: number;
  value2?: number;
};

const COLORS = {
  team: "#7c3aed",    // brand-600 purple
  personal: "#16a34a", // green-600
  single: "#7c3aed",
};

// ─── Line Chart ──────────────────────────────────────────────────────────────

export function LineChart({
  data,
  height = 120,
  series1Label = "Équipe",
  series2Label = "Perso",
  showSeries2 = false,
  yUnit = "",
}: {
  data: ChartPoint[];
  height?: number;
  series1Label?: string;
  series2Label?: string;
  showSeries2?: boolean;
  yUnit?: string;
}) {
  if (data.length === 0) return <Empty />;

  const allValues = data.flatMap((d) =>
    showSeries2 ? [d.value, d.value2 ?? 0] : [d.value],
  );
  const maxVal = Math.max(...allValues, 1);
  const W = 400;
  const H = height;
  const PAD = { top: 8, right: 8, bottom: 28, left: 32 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const n = data.length;
  const step = n > 1 ? innerW / (n - 1) : innerW;

  const toX = (i: number) => PAD.left + (n > 1 ? i * step : innerW / 2);
  const toY = (v: number) => PAD.top + innerH - (v / maxVal) * innerH;

  const linePath = (key: "value" | "value2") =>
    data
      .map((d, i) => {
        const v = key === "value" ? d.value : (d.value2 ?? 0);
        return `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`;
      })
      .join(" ");

  const yTicks = [0, Math.round(maxVal / 2), maxVal];

  return (
    <div className="flex flex-col gap-1">
      {showSeries2 && (
        <div className="flex gap-4 px-1 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded-full" style={{ background: COLORS.team }} />
            {series1Label}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded-full" style={{ background: COLORS.personal }} />
            {series2Label}
          </span>
        </div>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height }}
        aria-hidden="true"
      >
        {/* Y grid + ticks */}
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left} y1={toY(t)}
              x2={W - PAD.right} y2={toY(t)}
              stroke="#e2e8f0" strokeWidth="1"
            />
            <text
              x={PAD.left - 4} y={toY(t)}
              textAnchor="end" dominantBaseline="middle"
              fontSize="9" fill="#94a3b8"
            >
              {t}{yUnit}
            </text>
          </g>
        ))}

        {/* Series 2 (personal) */}
        {showSeries2 && (
          <>
            <path d={linePath("value2")} fill="none" stroke={COLORS.personal} strokeWidth="2" strokeLinejoin="round" />
            {data.map((d, i) => (
              <circle key={i} cx={toX(i)} cy={toY(d.value2 ?? 0)} r="3" fill={COLORS.personal}>
                <title>{d.label}: {d.value2 ?? 0}{yUnit}</title>
              </circle>
            ))}
          </>
        )}

        {/* Series 1 (team) */}
        <path d={linePath("value")} fill="none" stroke={COLORS.team} strokeWidth="2.5" strokeLinejoin="round" />
        {data.map((d, i) => (
          <circle key={i} cx={toX(i)} cy={toY(d.value)} r="3.5" fill={COLORS.team}>
            <title>{d.label}: {d.value}{yUnit}</title>
          </circle>
        ))}

        {/* X labels */}
        {data.map((d, i) => (
          <text
            key={i}
            x={toX(i)} y={H - 6}
            textAnchor="middle" fontSize="9" fill="#94a3b8"
          >
            {d.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

export function BarChart({
  data,
  height = 100,
  series1Label = "Équipe",
  series2Label = "Perso",
  showSeries2 = false,
  color = COLORS.team,
  yUnit = "",
}: {
  data: ChartPoint[];
  height?: number;
  series1Label?: string;
  series2Label?: string;
  showSeries2?: boolean;
  color?: string;
  yUnit?: string;
}) {
  if (data.length === 0) return <Empty />;

  const allValues = data.flatMap((d) =>
    showSeries2 ? [d.value + (d.value2 ?? 0)] : [d.value],
  );
  const maxVal = Math.max(...allValues, 1);
  const W = 400;
  const H = height;
  const PAD = { top: 8, right: 8, bottom: 28, left: 32 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const n = data.length;
  const barGroupW = innerW / n;
  const barW = Math.max(4, barGroupW * 0.55);
  const gap = showSeries2 ? 1 : 0;
  const singleBarW = showSeries2 ? (barW - gap) / 2 : barW;

  return (
    <div className="flex flex-col gap-1">
      {showSeries2 && (
        <div className="flex gap-4 px-1 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded-sm" style={{ background: COLORS.team }} />
            {series1Label}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded-sm" style={{ background: COLORS.personal }} />
            {series2Label}
          </span>
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} aria-hidden="true">
        {/* Y grid */}
        {[0, Math.round(maxVal / 2), maxVal].map((t) => (
          <g key={t}>
            <line
              x1={PAD.left} y1={PAD.top + innerH - (t / maxVal) * innerH}
              x2={W - PAD.right} y2={PAD.top + innerH - (t / maxVal) * innerH}
              stroke="#e2e8f0" strokeWidth="1"
            />
            <text
              x={PAD.left - 4}
              y={PAD.top + innerH - (t / maxVal) * innerH}
              textAnchor="end" dominantBaseline="middle"
              fontSize="9" fill="#94a3b8"
            >
              {t}{yUnit}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const cx = PAD.left + i * barGroupW + barGroupW / 2;
          const bh1 = (d.value / maxVal) * innerH;
          const bh2 = ((d.value2 ?? 0) / maxVal) * innerH;
          return (
            <g key={i}>
              {/* bar 1 */}
              <rect
                x={cx - (showSeries2 ? singleBarW + gap / 2 : singleBarW / 2)}
                y={PAD.top + innerH - bh1}
                width={singleBarW}
                height={Math.max(bh1, 1)}
                fill={COLORS.team} rx="2"
              >
                <title>{d.label}: {d.value}{yUnit}</title>
              </rect>
              {/* bar 2 */}
              {showSeries2 && (
                <rect
                  x={cx + gap / 2}
                  y={PAD.top + innerH - bh2}
                  width={singleBarW}
                  height={Math.max(bh2, 1)}
                  fill={COLORS.personal} rx="2"
                >
                  <title>{d.label}: {d.value2 ?? 0}{yUnit}</title>
                </rect>
              )}
              {/* X label */}
              <text
                x={cx} y={H - 6}
                textAnchor="middle" fontSize="9" fill="#94a3b8"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Chart section wrapper ────────────────────────────────────────────────────

export function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
        {title}
      </p>
      {children}
    </div>
  );
}

function Empty() {
  return (
    <p className="py-4 text-center text-xs text-slate-400">Pas de données</p>
  );
}
