"use client"; // Marks this widget as a Client Component.

import React from "react"; // Imports React.
import { KpiCard } from "./KpiCard"; // Imports shared KPI card layout.

type UtilizationWidgetProps = { // Declares props for the Utilization widget.
  utilizationPercent: number; // Approximate fleet utilization percentage.
  periodLabel: string; // Description of the period being measured.
  deltaPercent?: number | null; // Optional change in utilization vs prior period.
  className?: string; // Optional custom classes for styling.
}; // Ends UtilizationWidgetProps.

export function UtilizationWidget({ // Declares and exports UtilizationWidget.
  utilizationPercent, // Destructures utilizationPercent.
  periodLabel, // Destructures periodLabel.
  deltaPercent, // Destructures deltaPercent.
  className, // Destructures className to pass down.
}: UtilizationWidgetProps) { // Applies props type.

  const formattedValue = `${utilizationPercent.toFixed(1)}%`; // Formats utilization percentage with one decimal place.

  let trendDirection: "up" | "down" | "neutral" = "neutral"; // Defaults to neutral trend.

  if (typeof deltaPercent === "number") { // Only compute direction if deltaPercent is numeric.
    if (deltaPercent > 0) trendDirection = "up"; // Higher utilization is good, so positive delta is "up".
    else if (deltaPercent < 0) trendDirection = "down"; // Lower utilization is bad, so negative delta is "down".
  }

  const trendLabel =
    typeof deltaPercent === "number" // Only build label if deltaPercent exists.
      ? `${deltaPercent > 0 ? "+" : ""}${deltaPercent.toFixed(1)} pts vs prior period` // Signed points change string.
      : undefined; // If missing, do not show trend label.

  return ( // Renders the Fleet Utilization KPI card.
    <KpiCard
      title="Fleet Utilization" // KPI title for this card.
      value={formattedValue} // Main utilization value.
      subLabel={periodLabel} // Period context for this KPI.
      trendLabel={trendLabel} // Optional utilization trend description.
      trendDirection={trendDirection} // Controls trend label color.
      className={className} // Allows the parent to adjust styling for this specific widget.
    />
  );
}
