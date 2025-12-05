"use client";                                                        // Marks this component as a Client Component so we can use hooks and react-grid-layout.

import { ReactNode, useState } from "react";                         // Imports ReactNode type plus useState hook for local state.
import {
  Responsive,
  WidthProvider,
  type Layout,
  type Layouts,
} from "react-grid-layout";                                          // Imports the responsive grid component and its layout types.

import { WidgetLayoutConfig } from "@/lib/dashboardWidgets";         // Imports the shared widget layout config type from the server side.

import "react-grid-layout/css/styles.css";                           // Loads base styles for react-grid-layout.
import "react-resizable/css/styles.css";                             // Loads styles for the resize handles.

const ResponsiveGridLayout = WidthProvider(Responsive);              // Wraps Responsive so it receives width from its parent container.

type DashboardGridClientProps = {                                    // Declares the props for this grid client component.
  initialLayout: WidgetLayoutConfig[];                               // The widget layout configuration loaded on the server (DB or default).
  children: ReactNode;                                               // The React widgets (cards/components) we’re placing into the grid.
};                                                                   // Ends DashboardGridClientProps type definition.

// Converts our layout into react-grid-layout Layout items, with calibrated minH per widget.
function toReactGridLayout(initial: WidgetLayoutConfig[]): Layout[] { // Helper that transforms WidgetLayoutConfig[] into Layout[] for react-grid-layout.
  return initial.map((item) => {                                     // Maps each widget layout config into a react-grid-layout Layout object.
    let minH: number;                                                // Declares the minimum height (in rows) for this widget.

    switch (item.id) {                                               // Chooses minH based on the widget id so different widgets get different minimum heights.
      // Small-ish KPI cards.
      case "revenueKpi":
      case "expensesKpi":
      case "netProfitKpi":
      case "activeCustomersKpi":
      case "fuelOverviewCard":
      case "cashflowKpi":
      case "avgRpmCard":
      case "loadsCompletedCard":
      case "milesCard":
      case "utilizationCard":
        minH = 2;                                                    // 2 rows × 80px = 160px minimum height for compact KPI tiles.
        break;

      // Larger content cards.
      case "staleCustomersCard":
      case "staleProspectsCard":
      case "recentLoadsCard":
        minH = 3;                                                    // 3 rows × 80px = 240px minimum height for denser widgets.
        break;

      default:
        minH = 2;                                                    // Safe default if we don’t recognize the widget id yet.
    }

    const h = item.h ?? minH;                                        // Uses configured height if provided, otherwise at least minH.

    return {                                                         // Returns the Layout object for react-grid-layout.
      i: item.id,                                                    // `i` is the layout item id; we match it to widget id for consistency.
      x: item.x,                                                     // Column position in the grid.
      y: item.y,                                                     // Row position in the grid.
      w: item.w,                                                     // Width in columns.
      h,                                                             // Height in rows.
      minH,                                                          // Minimum height constraint to protect content.
    };
  });
}

export default function DashboardGridClient({                        // Declares and exports the DashboardGridClient component.
  initialLayout,                                                     // Destructures initialLayout from props.
  children,                                                          // Destructures children (widgets) from props.
}: DashboardGridClientProps) {                                       // Applies the props type to this component.
  const [layouts, setLayouts] = useState<Layouts>(() => {            // Initializes per-breakpoint layouts in React state.
    const base = toReactGridLayout(initialLayout);                   // Builds the base Layout[] from the server-provided config.
    return {                                                         // Returns the Layouts object used by ResponsiveGridLayout.
      lg: base,                                                      // Layout for large screens (>= 1200px).
      md: base,                                                      // Layout for medium screens (768–1199px), still 12 columns.
      sm: base,                                                      // Layout for small screens (< 768px), will visually stack.
    };
  });

  const breakpoints = {                                              // Defines viewport breakpoints for responsive layouts.
    lg: 1200,                                                        // Large: width >= 1200px.
    md: 768,                                                         // Medium: width >= 768px and < 1200px.
    sm: 0,                                                           // Small: width < 768px.
  };

  const cols = {                                                     // Defines column counts for each breakpoint.
    lg: 12,                                                          // 12-column grid on large screens.
    md: 12,                                                          // 12-column grid on medium screens.
    sm: 1,                                                           // Single-column stack on small screens.
  };

  const childArray = Array.isArray(children)                         // Normalizes children into an array so we can inspect/index them.
    ? children                                                       // If children is already an array, use it directly.
    : [children];                                                    // Otherwise wrap the single child in an array.

  const widgetChildren = childArray                                  // Builds the list of *actual widget* children used in the grid.
    .filter(Boolean)                                                 // Drops any null/undefined children just in case.
    .slice(1);                                                       // Skips the first React transitional wrapper child that Next.js injects.

  function handleLayoutChange(currentLayout: Layout[], allLayouts: Layouts) { // Handles drag/resize events from react-grid-layout.
    setLayouts(allLayouts);                                          // Saves updated layouts in state so drag feels responsive.
    // 🔜 Future: POST currentLayout to /api/dashboard/layout to persist per user.
    console.log("[DASHBOARD_LAYOUT_CHANGED]", currentLayout);        // Logs layout changes to help debug while building.
  }

  return (                                                           // Returns the responsive grid layout with one item per widget.
    <ResponsiveGridLayout
      className="layout"                                             // CSS hook for styling the grid container if needed.
      layouts={layouts}                                              // Provides layouts for all breakpoints (lg/md/sm).
      breakpoints={breakpoints}                                      // Maps layout keys to viewport breakpoints.
      cols={cols}                                                    // Sets number of columns per breakpoint.
      rowHeight={80}                                                 // Each grid row is 80px tall; combined with minH this sets card height.
      margin={[12, 12]}                                              // 12px gap between cards horizontally and vertically.
      draggableHandle=".fc-widget-drag-handle"                       // Only drag when clicking the drag handle pill inside each card.
      onLayoutChange={handleLayoutChange}                            // Called whenever user drags or resizes any widget.
      isResizable={true}                                             // Enables resizing of the grid items.
      resizeHandles={["se"]}                                         // Shows resize handle at the bottom-right corner of each card.
      compactType="vertical"                                         // Compacts widgets vertically when others move.
      autoSize={true}                                                // Lets the grid height expand automatically to fit all rows.
    >
      {widgetChildren.map((child, index) => {                        // Renders one grid item per real widget child (wrapper skipped).
        const layoutItem = initialLayout[index];                     // Looks up the matching layout config entry by index.
        const key = layoutItem?.id ?? `widget-${index}`;             // Uses widget id as key when present, or a fallback based on index.

        return (
          // This outer div is the grid item container that react-grid-layout positions and resizes.
          <div key={key} className="relative h-full">
            {/* drag pill inside the card */}
            <div className="fc-widget-drag-handle pointer-events-auto absolute right-3 top-3 z-10 cursor-move rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400 shadow-sm">
              Drag                                                     {/* Visible pill that acts as the drag handle for this card. */}
            </div>

            {/* card fills the grid cell */}
            <div className="h-full">
              {child}                                                 {/* The actual widget component (KPI card, list, etc.) that fills the tile. */}
            </div>
          </div>
        );
      })}
    </ResponsiveGridLayout>
  );
}
