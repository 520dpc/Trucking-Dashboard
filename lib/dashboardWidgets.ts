// lib/dashboardWidgets.ts

// Union type listing every widget that can appear on the dashboard grid.         //
export type DashboardWidgetId =
  | "revenueKpi"                 // Top-row KPI: total revenue.
  | "expensesKpi"                // Top-row KPI: total expenses.
  | "netProfitKpi"               // Top-row KPI: net profit (revenue - expenses).
  | "activeCustomersKpi"         // Top-row KPI: count of active customers.
  | "loadsCompletedCard"         // Card: loads completed summary.
  | "avgRpmCard"                 // Card: average rate per mile summary.
  | "staleCustomersCard"         // Card: customers needing follow-up.
  | "staleProspectsCard"         // Card: prospects needing follow-up (future).
  | "fuelOverviewCard";          // Card: national diesel price overview from EIA.

// Layout configuration for a single widget on the grid.                          //
export type WidgetLayoutConfig = {
  id: DashboardWidgetId;         // Which widget this layout entry refers to.
  x: number;                     // X position in grid units (column index, 0-based).
  y: number;                     // Y position in grid units (row index, 0-based).
  w: number;                     // Width in grid units (how many columns the widget spans).
  h: number;                     // Height in grid units (how many row units tall).
};

// Default layout for a 12-column grid based roughly on your sketch.             //
// NOTE: We are not yet using x/y/h in CSS; we mainly use `w` (width) for spans. //
export const DEFAULT_DASHBOARD_LAYOUT: WidgetLayoutConfig[] = [
  {
    id: "revenueKpi",            // Revenue KPI in the top row.
    x: 0,                        // Left-most columns.
    y: 0,                        // First row.
    w: 3,                        // 3 of 12 columns wide.
    h: 1,                        // 1 row tall.
  },
  {
    id: "expensesKpi",           // Expenses KPI next to revenue.
    x: 3,
    y: 0,
    w: 3,
    h: 1,
  },
  {
    id: "netProfitKpi",          // Net profit KPI.
    x: 6,
    y: 0,
    w: 3,
    h: 1,
  },
  {
    id: "activeCustomersKpi",    // Active customers KPI.
    x: 9,
    y: 0,
    w: 3,
    h: 1,
  },
  {
    id: "loadsCompletedCard",    // Loads completed card in the second block row.
    x: 0,
    y: 1,
    w: 6,                        // Half-width card.
    h: 2,
  },
  {
    id: "avgRpmCard",            // Average rate-per-mile card next to loads.
    x: 6,
    y: 1,
    w: 6,                        // Other half-width.
    h: 2,
  },
  {
    id: "staleCustomersCard",    // Customers needing follow-up (bottom-left).
    x: 0,
    y: 3,
    w: 6,
    h: 3,
  },
  {
    id: "staleProspectsCard",    // Prospects needing follow-up (bottom-right placeholder).
    x: 6,
    y: 3,
    w: 6,
    h: 3,
  },
  {
    id: "fuelOverviewCard",      // Fuel overview card; appears after the other widgets by default.
    x: 0,
    y: 6,
    w: 3,                        // Quarter-width on xl screens.
    h: 1,
  },
];
