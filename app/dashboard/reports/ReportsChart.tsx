"use client"; // This component runs on the client so we can use hooks and Victory.

import { useMemo, useState } from "react";
import {
  VictoryAxis,
  VictoryChart,
  VictoryLine,
  VictoryTheme,
} from "victory";

// One day of summary stats coming from the server.
type DailySummaryPoint = {
  date: string;    // "YYYY-MM-DD"
  revenue: number; // total revenue that day
  expenses: number;// total expenses that day
  profit: number;  // revenue - expenses
};

type ReportsChartProps = {
  data: DailySummaryPoint[];
};

type TimeRange = "7d" | "30d" | "90d" | "180d" | "365d" | "all";

export default function ReportsChart({ data }: ReportsChartProps) {
  const [range, setRange] = useState<TimeRange>("90d");

  // Parse "YYYY-MM-DD" safely to Date.
  const parseDate = (value: string) => new Date(`${value}T00:00:00Z`);

  // Latest date in the dataset.
  const maxDate = useMemo(() => {
    if (data.length === 0) return null;
    return data
      .map((d) => parseDate(d.date))
      .reduce((latest, current) => (current > latest ? current : latest));
  }, [data]);

  // Filter by selected time range.
  const filtered = useMemo(() => {
    if (!maxDate || range === "all") return data;

    const daysBack = (() => {
      switch (range) {
        case "7d": return 7;
        case "30d": return 30;
        case "90d": return 90;
        case "180d": return 180;
        case "365d": return 365;
        default: return 365;
      }
    })();

    const cutoff = new Date(
      maxDate.getTime() - daysBack * 24 * 60 * 60 * 1000
    );

    return data.filter((point) => parseDate(point.date) >= cutoff);
  }, [data, maxDate, range]);

  // Build series for Victory: x = Date, y = number
  const revenueSeries = filtered.map((p) => ({
    x: parseDate(p.date),
    y: p.revenue,
  }));

  const expensesSeries = filtered.map((p) => ({
    x: parseDate(p.date),
    y: p.expenses,
  }));

  const profitSeries = filtered.map((p) => ({
    x: parseDate(p.date),
    y: p.profit,
  }));

  return (
    <div className="space-y-4 rounded-xl border bg-white p-4 shadow-sm">
      {/* HERO + LEGEND */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900">
            Revenue vs Expenses vs Profit
          </h2>
          <p className="text-xs text-slate-500">
            Blue = revenue, red = expenses, green = profit. Use the time
            filters to zoom in on performance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-2 border-r pr-3">
            <span className="flex items-center gap-1 text-xs text-slate-700">
              <span className="h-3 w-3 rounded-sm bg-[#228be6]" />
              Revenue
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-700">
              <span className="h-3 w-3 rounded-sm bg-[#e03131]" />
              Expenses
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-700">
              <span className="h-3 w-3 rounded-sm bg-[#2f9e44]" />
              Profit
            </span>
          </div>

          {/* Time range buttons */}
          <div className="flex flex-wrap items-center gap-1 pl-1">
            {[
              { key: "7d", label: "1W" },
              { key: "30d", label: "1M" },
              { key: "90d", label: "3M" },
              { key: "180d", label: "6M" },
              { key: "365d", label: "1Y" },
              { key: "all", label: "All" },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setRange(opt.key as TimeRange)}
                className={[
                  "rounded-full px-2 py-1 text-xs transition",
                  range === opt.key
                    ? "bg-sky-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                ].join(" ")}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CHART */}
      <div className="w-full overflow-x-auto">
        <VictoryChart
          theme={VictoryTheme.material}
          height={320}
          padding={{ top: 40, bottom: 60, left: 70, right: 40 }}
        >
          {/* X axis: Dates */}
          <VictoryAxis
            tickFormat={(t) => {
              const d = new Date(t);
              // Format as MM-DD
              return `${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
                d.getUTCDate()
              ).padStart(2, "0")}`;
            }}
            style={{
              tickLabels: { fontSize: 9, angle: -40, padding: 30 },
            }}
          />

          {/* Y axis: dollars */}
          <VictoryAxis
            dependentAxis
            tickFormat={(t) => `$${t}`}
            style={{
              tickLabels: { fontSize: 9 },
            }}
          />

          {/* Revenue line (blue) */}
          <VictoryLine
            data={revenueSeries}
            style={{ data: { stroke: "#228be6", strokeWidth: 2 } }}
            interpolation="monotoneX"
          />

          {/* Expenses line (red) */}
          <VictoryLine
            data={expensesSeries}
            style={{ data: { stroke: "#e03131", strokeWidth: 2 } }}
            interpolation="monotoneX"
          />

          {/* Profit line (green) */}
          <VictoryLine
            data={profitSeries}
            style={{ data: { stroke: "#2f9e44", strokeWidth: 2 } }}
            interpolation="monotoneX"
          />
        </VictoryChart>
      </div>
    </div>
  );
}
