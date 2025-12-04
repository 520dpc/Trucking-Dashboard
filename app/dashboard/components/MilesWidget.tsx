"use client"; // Marks this widget as a Client Component.

import React from "react"; // Imports React for components and JSX.
import { KpiCard } from "./KpiCard"; // Imports shared KPI card component.

type MilesWidgetProps = { // Declares props for the Miles widget.
  totalMiles: number; // Total miles driven in the period.
  periodLabel: string; // Description of the period (e.g., "Last 30 days").
  avgMilesPerDay?: number | null; // Optional average miles per day.
  className?: string; // Optional className for styling.
}; // Ends MilesWidgetProps.

export function MilesWidget({ // Declares and exports MilesWidget.
  totalMiles, // Destructures totalMiles.
  periodLabel, // Destructures periodLabel.
  avgMilesPerDay, // Destructures avgMilesPerDay.
  className, // Destructures className to forward.
}: MilesWidgetProps) { // Applies props type.

  const formattedValue = `${totalMiles.toLocaleString("en-US")} mi`; // Formats total miles with thousands and "mi".

  const subLabel =
    avgMilesPerDay != null // If we know average miles per day...
      ? `${avgMilesPerDay.toFixed(0)} mi/day • ${periodLabel}` // Show average per day plus the period.
      : periodLabel; // Otherwise just show the period label.

  return ( // Renders the Total Miles KPI card.
    <KpiCard
      title="Total Miles" // KPI title for this card.
      value={formattedValue} // Main value showing total miles.
      subLabel={subLabel} // Secondary info with average per day or just period.
      trendLabel={undefined} // No explicit trend label for miles yet.
      trendDirection="neutral" // Keeps trend neutral since we aren’t comparing periods here.
      className={className} // Allows the parent to tweak styling for this widget specifically.
    />
  );
}
