"use client"; // Makes this a Client Component so dashboard widgets can use it inside interactive layouts.

import React from "react"; // Imports React so we can type props and define the functional component.

type KpiCardProps = { // Describes the props that every KPI card can accept.
  title: string; // Main label at the top of the card (e.g. "Revenue").
  value: string; // Primary KPI value text (e.g. "$42,000" or "1.85 RPM").
  subLabel?: string; // Optional smaller text under the value (e.g. "Last 30 days").
  trendLabel?: string; // Optional text describing change (e.g. "+12% vs prior period").
  trendDirection?: "up" | "down" | "neutral"; // Used to color the trend label (green/red/gray).
  className?: string; // Optional extra className so individual widgets can tweak styling.
  children?: React.ReactNode; // Optional extra content region (e.g. mini chart, badge, extra stats).
}; // Ends the KpiCardProps type definition.

export function KpiCard({ // Declares and exports the KpiCard component.
  title, // Destructures the title from props.
  value, // Destructures the value from props.
  subLabel, // Destructures the subLabel from props.
  trendLabel, // Destructures the trendLabel from props.
  trendDirection = "neutral", // Defaults trendDirection to "neutral" if not provided.
  className = "", // Defaults className to an empty string so we can safely concatenate it.
  children, // Destructures children for optional extra content inside the card.
}: KpiCardProps) { // Applies the KpiCardProps type to enforce prop shapes.
  const trendColor = // Computes a Tailwind class for the trend text color.
    trendDirection === "up" // If direction is "up"...
      ? "text-emerald-600" // ...use green since that's positive.
      : trendDirection === "down" // Else if direction is "down"...
      ? "text-rose-600" // ...use red since that's negative.
      : "text-slate-500"; // Otherwise, keep it neutral gray.

  return ( // Returns the JSX structure for the KPI card.
    <div
      className={`
        h-full                         // Ensures the card stretches to fill the grid cell height.
        flex flex-col                  // Uses a vertical flex layout to stack title, value, and extras.
        rounded-xl                     // Gives the card softly rounded corners.
        border                         // Adds a basic border; can be visually overridden via className.
        bg-white                       // Sets a default white background; can also be overridden.
        p-4                            // Adds inner padding so content isn’t cramped.
        shadow-sm                      // Adds a light shadow for card separation from the background.
        ${className}                   // Allows the caller to inject or override styles per widget.
      `}
    >
      <div className="flex items-center justify-between gap-2"> {/* Top row: title on the left, optional trend text on the right. */}
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {title} {/* Renders the title text for the KPI. */}
        </h2>
        {trendLabel && ( // Only render the trend label if one was provided.
          <span className={`text-xs font-medium ${trendColor}`}>
            {trendLabel} {/* Displays the trend text, such as "+12.3% vs prior period". */}
          </span>
        )}
      </div>

      <div className="mt-2 text-2xl font-semibold text-slate-900">
        {value} {/* Shows the main KPI value in larger bold text. */}
      </div>

      {subLabel && ( // Only render the sub-label if one was provided.
        <div className="mt-1 text-xs text-slate-500">
          {subLabel} {/* Displays extra context such as "Last 30 days". */}
        </div>
      )}

      {children && ( // If any children were passed, render them in a flexible area at the bottom.
        <div className="mt-3 flex-1 text-xs text-slate-600">
          {children} {/* Allows widgets to inject extra UI while retaining the KpiCard wrapper. */}
        </div>
      )}
    </div>
  );
}
