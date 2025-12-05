"use client";                                                        // Marks this component as a Client Component so it can be used inside other client components.

import React, { ReactNode } from "react";                            // Imports React plus the ReactNode type for children.

type TrendDirection = "up" | "down" | "neutral";                     // Declares a union type for trend direction.

type KpiCardProps = {                                                // Declares the props for the KpiCard component.
  title: string;                                                     // Title text shown at the top-left of the card.
  value?: string;                                                    // Main KPI value shown prominently.
  subLabel?: string;                                                 // Smaller text below the value (usually the period label).
  trendLabel?: string;                                               // Optional text describing the trend vs prior period.
  trendDirection?: TrendDirection;                                   // Optional direction that controls trend text color.
  className?: string;                                                // Optional extra CSS classes to customize the outer card styling.
  children?: ReactNode;                                              // Optional children rendered below the KPI row (lists, extra info, etc.).
};                                                                   // Ends KpiCardProps type.

export function KpiCard({                                           // Declares and exports the KpiCard functional component.
  title,                                                             // Destructures title from props.
  value,                                                             // Destructures value from props.
  subLabel,                                                          // Destructures subLabel from props.
  trendLabel,                                                        // Destructures trendLabel from props.
  trendDirection = "neutral",                                       // Destructures trendDirection from props with a default of "neutral".
  className,                                                         // Destructures className from props.
  children,                                                          // Destructures children from props.
}: KpiCardProps) {                                                   // Applies KpiCardProps type to the component props.
  let trendColor = "text-slate-400";                                 // Starts with a neutral gray trend color.

  if (trendDirection === "up") {                                     // If the trend direction is "up" (good)...
    trendColor = "text-emerald-500";                                 // ...use a green-ish color.
  } else if (trendDirection === "down") {                            // Otherwise if the trend direction is "down" (bad)...
    trendColor = "text-rose-500";                                    // ...use a red-ish color.
  }

  return (                                                           // Returns the JSX that renders the KPI card.
    <div
      className={                                                     // Sets the outer card className.
        `flex h-full flex-col rounded-2xl border bg-white px-4 py-4 shadow-sm ` + // Base card styling: rounded, bordered, padded.
        (className ?? "")                                             // Appends any optional extra classes from props.
      }
    >
      <div className="mb-2 flex items-start justify-between gap-2">   {/* Header row with title on the left and trend text on the right. */}
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {title}                                                     {/* Renders the KPI title. */}
        </div>
        {trendLabel && (                                              /* If a trendLabel was provided, show it on the right. */
          <div className={`text-[11px] font-medium ${trendColor}`}>
            {trendLabel}                                              {/* Renders the trend description (e.g., "+5% vs prior period"). */}
          </div>
        )}
      </div>

      {value && (                                                     /* If a value is provided, render the main KPI value. */
        <div className="text-3xl font-semibold tracking-tight text-slate-900">
          {value}                                                     {/* Renders the main KPI number. */}
        </div>
      )}

      {subLabel && (                                                  /* If a subLabel is provided, render it below the value. */
        <div className="mt-1 text-xs text-slate-500">
          {subLabel}                                                  {/* Renders secondary description such as the period. */}
        </div>
      )}

      {children && (                                                  /* If children are provided, render the list/content section. */
        <div className="mt-4 border-t border-slate-200 pt-3 text-xs text-slate-700 overflow-hidden">
          <div className="max-h-48 space-y-2 overflow-y-auto pr-1">   {/* Scrollable area so long lists do not blow up card height. */}
            {children}                                                {/* Renders whatever the caller passes (lists, pills, etc.). */}
          </div>
        </div>
      )}
    </div>
  );
}
