"use client";                                                        // Client component so we can use hooks and react-grid-layout.

import { ReactNode, useEffect, useMemo, useState } from "react";     // React hooks for state, memoization, and effects.
import {
  Responsive,
  WidthProvider,
  type Layout,
  type Layouts,
} from "react-grid-layout";                                          // Grid engine for drag + resize.

import { type WidgetLayoutConfig } from "@/lib/dashboardWidgets";    // Shared layout type from the server side.

import "react-grid-layout/css/styles.css";                           // Base styles for react-grid-layout.
import "react-resizable/css/styles.css";                             // Styles for resize handles.

const ResponsiveGridLayout = WidthProvider(Responsive);              // Wraps the responsive grid so it receives width from the parent.

type DashboardGridClientProps = {
  initialLayout: WidgetLayoutConfig[];                               // Layout loaded on the server (DB or default).
  children: ReactNode;                                               // The widget cards we’re placing into the grid.
};

// Converts our layout into react-grid-layout Layout items, with calibrated minH per widget.
function toReactGridLayout(initial: WidgetLayoutConfig[]): Layout[] { // Transforms our WidgetLayoutConfig[] into RGL's Layout[].
  return initial.map((item) => {
    let minH: number;                                                // Will hold a minimum height (in rows) for each widget.

    switch (item.id) {                                               // Decide minimum height based on widget type.
      // Small-ish KPI cards.
      case "cashflowKpi":
      case "revenueKpi":
      case "expensesKpi":
      case "netProfitKpi":
      case "avgRpmCard":
      case "fuelOverviewCard":
      case "loadsCompletedCard":
      case "milesCard":
        minH = 2;                                                    // 2 rows × 80px = 160px min card height.
        break;

      // Larger content/follow-up cards.
      case "staleCustomersCard":
      case "staleProspectsCard":
      case "recentLoadsCard":
        minH = 3;                                                    // 3 rows × 80px = 240px min card height.
        break;

      // Utilization and other future widgets.
      case "fleetUtilization":
        minH = 2;                                                    // Keep this compact but still readable.
        break;

      default:
        minH = 2;                                                    // Safe default so no card is tiny.
    }

    const h = item.h ?? minH;                                        // Use configured height, or at least the minimum.

    return {
      i: item.id,                                                    // ID ties Layout item to widget React key.
      x: item.x,
      y: item.y,
      w: item.w,
      h,
      minH,                                                          // Prevent shrinking below content-safe height.
    };
  });
}

function buildLayouts(initialLayout: WidgetLayoutConfig[]): Layouts { // Helper to build a Layouts object for all breakpoints.
  const base = toReactGridLayout(initialLayout);                     // Base Layout[] for all breakpoints.
  return {
    lg: base,                                                        // Large screens (>= 1200px).
    md: base,                                                        // Medium screens (768–1199px) – still 12 columns.
    sm: base,                                                        // Small screens (< 768px) – will stack visually.
  };
}

export default function DashboardGridClient({
  initialLayout,
  children,
}: DashboardGridClientProps) {
  const [layouts, setLayouts] = useState<Layouts>(() =>              // Initializes layouts state once on first render.
    buildLayouts(initialLayout)                                      // Uses the helper to construct LG/MD/SM layouts.
  );

  // 🔁 CRITICAL: keep internal layouts in sync when initialLayout changes
  useEffect(() => {
    setLayouts(buildLayouts(initialLayout));                         // Whenever the server-provided layout changes, reset local layouts.
  }, [initialLayout]);                                               // Dependency on initialLayout ensures we pick up edits to DEFAULT_DASHBOARD_LAYOUT.

  const breakpoints = useMemo(                                       // Memoizes breakpoints so they aren’t recreated every render.
    () => ({
      lg: 1200,                                                      // Large breakpoint.
      md: 768,                                                       // Medium breakpoint.
      sm: 0,                                                         // Small breakpoint (mobile).
    }),
    []
  );

  const cols = useMemo(                                              // Memoizes column counts for each breakpoint.
    () => ({
      lg: 12,                                                        // 12-column grid on large screens.
      md: 12,                                                        // 12 columns on medium too (just narrower).
      sm: 1,                                                         // Single-column stack on small screens.
    }),
    []
  );

  const childArray = Array.isArray(children) ? children : [children]; // Normalizes children to an array for mapping.

  function handleLayoutChange(currentLayout: Layout[], allLayouts: Layouts) {
    setLayouts(allLayouts);                                          // Keeps local state in sync so drag feels responsive.
    // 🔜 Future: POST currentLayout to /api/dashboard/layout to persist per user.
    console.log("[DASHBOARD_LAYOUT_CHANGED]", currentLayout);        // Logs layout changes for debugging while building.
  }

  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={layouts}                                              // Feeds the current layouts into react-grid-layout.
      breakpoints={breakpoints}                                     // Breakpoint definitions.
      cols={cols}                                                   // Column counts per breakpoint.
      rowHeight={80}                                                // Each grid row is 80px tall – paired with minH above.
      margin={[12, 12]}                                             // 12px gap between cards horizontally & vertically.
      draggableHandle=".fc-widget-drag-handle"                      // Only drag when grabbing the drag handle (inside the card).
      onLayoutChange={handleLayoutChange}                          // Called whenever the user drags/resizes items.
      isResizable={true}                                            // Allows user to grow/shrink cards, within minH.
      resizeHandles={["se"]}                                        // Resize handle sits at the bottom-right corner.
      compactType="vertical"                                        // Compacts items vertically.
      autoSize={true}                                               // Let grid grow vertically to fit items.
    >
      {childArray.map((child, index) => {                           // Renders one grid item per widget child.
        const layoutItem = initialLayout[index];                    // Look up the matching layout item for this widget.
        const key = layoutItem?.id ?? `widget-${index}`;            // Use the widget ID as the React key if available.

        return (
          // This outer div is the grid item container react-grid-layout positions/resizes.
          <div key={key} className="relative h-full">
            {/* drag pill inside the card */}
            <div className="fc-widget-drag-handle pointer-events-auto absolute right-3 top-3 z-10 cursor-move rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400 shadow-sm">
              Drag
            </div>

            {/* card fills the grid cell */}
            <div className="h-full">
              {child}                                              {/* Renders the actual widget component inside the grid cell. */}
            </div>
          </div>
        );
      })}
    </ResponsiveGridLayout>
  );
}
