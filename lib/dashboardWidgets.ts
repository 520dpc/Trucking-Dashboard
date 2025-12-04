// lib/dashboardWidgets.ts                                          // Central registry of dashboard widget IDs + default layout.

export type DashboardWidgetId =                                    // Union type of all widget IDs used by the dashboard grid.
  | "cashflowKpi"                                                  // Net cashflow KPI card.
  | "revenueKpi"                                                   // Revenue KPI card.
  | "expensesKpi"                                                  // Expenses KPI card.
  | "netProfitKpi"                                                 // Net profit KPI card.
  | "avgRpmCard"                                                   // Rate per mile KPI card.
  | "fuelOverviewCard"                                             // Fuel % of revenue KPI card.
  | "loadsCompletedCard"                                           // Loads completed KPI card.
  | "milesCard"                                                    // Total miles KPI card.
  | "recentLoadsCard"                                              // Loads (last 7 days) KPI card.
  | "staleCustomersCard"                                           // Stale customers follow-up widget.
  | "staleProspectsCard"                                           // Stale prospects follow-up widget.
  | "fleetUtilization";                                            // Fleet utilization KPI card.

export type WidgetLayoutConfig = {                                 // Shape of each widget’s layout in the grid.
  id: DashboardWidgetId;                                           // Unique widget ID; must match a React widget we render.
  x: number;                                                       // Column position (0–11 in the 12-column grid).
  y: number;                                                       // Row position (0 = top row).
  w: number;                                                       // Width (number of columns this widget spans).
  h: number;                                                       // Height in rows (rowHeight = 80px in DashboardGridClient).
};                                                                  // Ends WidgetLayoutConfig type.

// Default layout tuned to rowHeight = 80 in DashboardGridClient.   // This layout is used as the starting point for new users.
export const DEFAULT_DASHBOARD_LAYOUT: WidgetLayoutConfig[] = [    // Array describing where each widget should appear by default.
  // ───────── TOP KPI ROW (2 rows tall each, 4 tiles) ─────────
  { id: "cashflowKpi",        x: 0,  y: 0, w: 3, h: 2 },           // Net cashflow in the top-left.
  { id: "revenueKpi",         x: 3,  y: 0, w: 3, h: 2 },           // Revenue next to cashflow.
  { id: "expensesKpi",        x: 6,  y: 0, w: 3, h: 2 },           // Expenses in the first row.
  { id: "netProfitKpi",       x: 9,  y: 0, w: 3, h: 2 },           // Net profit at the top-right.

  // ───────── MIDDLE KPI ROW (2 rows tall, 4 tiles) ─────────
  { id: "avgRpmCard",         x: 0,  y: 2, w: 3, h: 2 },           // Rate per mile on the left of row 2.
  { id: "fuelOverviewCard",   x: 3,  y: 2, w: 3, h: 2 },           // Fuel % of revenue next to RPM.
  { id: "loadsCompletedCard", x: 6,  y: 2, w: 3, h: 2 },           // Loads completed in row 2.
  { id: "milesCard",          x: 9,  y: 2, w: 3, h: 2 },           // Total miles at the right of row 2.

  // ───────── FOLLOW-UP / RELATIONSHIP ROW (3 rows tall, 3 tiles) ─────────
  { id: "staleCustomersCard", x: 0,  y: 4, w: 4, h: 3 },           // Stale customers widget spanning 4 columns.
  { id: "staleProspectsCard", x: 4,  y: 4, w: 4, h: 3 },           // Stale prospects widget in the middle.
  { id: "recentLoadsCard",    x: 8,  y: 4, w: 4, h: 3 },           // Loads (last 7 days) widget on the right.

  // ───────── UTILIZATION ROW (2 rows tall, 1 tile) ─────────
  { id: "fleetUtilization",   x: 0,  y: 7, w: 4, h: 2 },           // Fleet utilization tile on its own row, wide enough to read.
];                                                                  // Ends DEFAULT_DASHBOARD_LAYOUT array.
