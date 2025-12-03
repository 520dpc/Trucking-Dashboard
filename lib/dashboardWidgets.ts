// lib/dashboardWidgets.ts

export type DashboardWidgetId =
  | "revenueKpi"
  | "expensesKpi"
  | "netProfitKpi"
  | "activeCustomersKpi"
  | "loadsCompletedCard"
  | "avgRpmCard"
  | "staleCustomersCard"
  | "staleProspectsCard"
  | "fuelOverviewCard";

export type WidgetLayoutConfig = {
  id: DashboardWidgetId; // unique ID for the widget, used by the grid + widget registry
  x: number;             // column position (0–11 in a 12-col grid)
  y: number;             // row position
  w: number;             // width in columns
  h: number;             // height in rows
};

// Default layout tuned to rowHeight=80 in DashboardGridClient.
export const DEFAULT_DASHBOARD_LAYOUT: WidgetLayoutConfig[] = [
  // ───────── TOP KPI ROW (2 rows tall each) ─────────
  { id: "revenueKpi",         x: 0,  y: 0, w: 3, h: 2 },
  { id: "expensesKpi",        x: 3,  y: 0, w: 3, h: 2 },
  { id: "netProfitKpi",       x: 6,  y: 0, w: 3, h: 2 },
  { id: "activeCustomersKpi", x: 9,  y: 0, w: 3, h: 2 },

  // ───────── MIDDLE ROW (3 rows tall) ─────────
  { id: "loadsCompletedCard", x: 0,  y: 2, w: 6, h: 3 },
  { id: "avgRpmCard",         x: 6,  y: 2, w: 6, h: 3 },

  // ───────── FOLLOW-UP ROW (3 rows tall) ─────────
  { id: "staleCustomersCard", x: 0,  y: 5, w: 6, h: 3 },
  { id: "staleProspectsCard", x: 6,  y: 5, w: 6, h: 3 },

  // ───────── FUEL KPI (2 rows tall) ─────────
  { id: "fuelOverviewCard",   x: 0,  y: 8, w: 3, h: 2 },
];
