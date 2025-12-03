// app/dashboard/DashboardGridClient.tsx
"use client";                                                        // Client component so we can use hooks and react-grid-layout.

import { ReactNode, useState } from "react";                         // React hooks for local state.
import {
  Responsive,
  WidthProvider,
  type Layout,
  type Layouts,
} from "react-grid-layout";                                          // Grid engine for drag + resize.

import { WidgetLayoutConfig } from "@/lib/dashboardWidgets";         // Shared layout type from the server side.

import "react-grid-layout/css/styles.css";                           // Base styles for react-grid-layout.
import "react-resizable/css/styles.css";                             // Styles for resize handles.

const ResponsiveGridLayout = WidthProvider(Responsive);              // Injects width into responsive grid.

type DashboardGridClientProps = {
  initialLayout: WidgetLayoutConfig[];                               // Layout loaded on the server (DB or default).
  children: ReactNode;                                               // The widget cards we’re placing into the grid.
};

// Converts our layout into react-grid-layout Layout items, with calibrated minH per widget.
function toReactGridLayout(initial: WidgetLayoutConfig[]): Layout[] {
  return initial.map((item) => {
    // Decide minimum height (in rows) for this widget.
    let minH: number;

    switch (item.id) {
      // Small-ish KPI cards.
      case "revenueKpi":
      case "expensesKpi":
      case "netProfitKpi":
      case "activeCustomersKpi":
      case "fuelOverviewCard":
        minH = 2;                                                   // 2 rows × 80px = 160px min.
        break;

      // Larger content cards.
      case "loadsCompletedCard":
      case "avgRpmCard":
      case "staleCustomersCard":
      case "staleProspectsCard":
        minH = 3;                                                   // 3 rows × 80px = 240px min.
        break;

      default:
        minH = 2;                                                   // Safe default.
    }

    const h = item.h ?? minH;                                       // Use configured height, or at least the minimum.

    return {
      i: item.id,                                                   // ID ties layout item to widget React key.
      x: item.x,
      y: item.y,
      w: item.w,
      h,
      minH,                                                         // Prevent shrinking below content-safe height.
    };
  });
}

export default function DashboardGridClient({
  initialLayout,
  children,
}: DashboardGridClientProps) {
  const [layouts, setLayouts] = useState<Layouts>(() => {
    const base = toReactGridLayout(initialLayout);                  // Base Layout[] for all breakpoints.
    return {
      lg: base,                                                     // Large screens (>= 1200px).
      md: base,                                                     // Medium screens (768–1199px) – still 12 columns.
      sm: base,                                                     // Small screens (< 768px) – will stack visually.
    };
  });

  const breakpoints = {
    lg: 1200,
    md: 768,
    sm: 0,
  };

  const cols = {
    lg: 12,                                                         // 12-column grid on large screens.
    md: 12,                                                         // 12 columns on medium too (just narrower).
    sm: 1,                                                          // Single-column stack on small screens.
  };

  const childArray = Array.isArray(children) ? children : [children];

  function handleLayoutChange(currentLayout: Layout[], allLayouts: Layouts) {
    setLayouts(allLayouts);                                         // Keep local state in sync so drag feels responsive.
    // 🔜 Future: POST currentLayout to /api/dashboard/layout to persist per user.
    console.log("[DASHBOARD_LAYOUT_CHANGED]", currentLayout);
  }

  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={layouts}
      breakpoints={breakpoints}
      cols={cols}
      rowHeight={80}                                                // Each grid row is 80px tall – paired with minH above.
      margin={[12, 12]}                                             // 12px gap between cards horizontally & vertically.
      draggableHandle=".fc-widget-drag-handle"                      // Only drag when grabbing the drag handle (inside the card).
      onLayoutChange={handleLayoutChange}
      isResizable={true}                                            // Allow user to grow/shrink cards, within minH.
      resizeHandles={["se"]}                                       // Handle sits at the bottom-right corner.
      compactType="vertical"
      autoSize={true}
    >
      {childArray.map((child, index) => {
        const layoutItem = initialLayout[index];
        const key = layoutItem?.id ?? `widget-${index}`;

        return (
          // This outer div is the grid item container react-grid-layout positions/resizes.
          <div key={key} className="relative h-full">
            {/* drag pill inside the card */}
            <div className="fc-widget-drag-handle pointer-events-auto absolute right-3 top-3 z-10 cursor-move rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400 shadow-sm">
              Drag
            </div>

            {/* card fills the grid cell */}
            <div className="h-full">
              {child}
            </div>
          </div>
        );
      })}
    </ResponsiveGridLayout>
  );
}
