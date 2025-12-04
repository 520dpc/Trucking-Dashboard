"use client"; // Marks this widget as a Client Component.

import React from "react"; // Imports React to support JSX and components.
import { KpiCard } from "./KpiCard"; // Imports shared KPI card layout.

type FuelPercentWidgetProps = { // Declares props for the Fuel % of Revenue widget.
  fuelPercentOfRevenue: number; // Fuel cost as a percentage of revenue (e.g., 32.5).
  periodLabel: string; // Description of the period.
  deltaPercent?: number | null; // Optional change in fuel percentage vs prior period.
  className?: string; // Optional className override for this widget.
}; // Ends FuelPercentWidgetProps.

export function FuelPercentWidget({ // Declares and exports FuelPercentWidget.
  fuelPercentOfRevenue, // Destructures fuelPercentOfRevenue from props.
  periodLabel, // Destructures periodLabel from props.
  deltaPercent, // Destructures deltaPercent from props.
  className, // Destructures className to pass down.
}: FuelPercentWidgetProps) { // Applies prop typing.

  const formattedValue = `${fuelPercentOfRevenue.toFixed(1)}%`; // Formats fuel percentage with one decimal place.

  let trendDirection: "up" | "down" | "neutral" = "neutral"; // Defaults trend direction to neutral.

  if (typeof deltaPercent === "number") { // Only compute direction if deltaPercent is numeric.
    if (deltaPercent > 0) trendDirection = "down"; // Higher fuel % is worse, so positive change is a "down" trend.
    else if (deltaPercent < 0) trendDirection = "up"; // Lower fuel % is good, so negative change is an "up" trend.
  }

  const trendLabel =
    typeof deltaPercent === "number" // Only build label when deltaPercent exists.
      ? `${deltaPercent > 0 ? "+" : ""}${deltaPercent.toFixed(1)} pts vs prior period` // Signed "points" change with one decimal.
      : undefined; // If no delta, omit label.

  return ( // Renders the Fuel % of Revenue KPI card.
    <KpiCard
      title="Fuel % of Revenue" // KPI title for this card.
      value={formattedValue} // Main value showing fuel percentage.
      subLabel={periodLabel} // Period context label.
      trendLabel={trendLabel} // Optional description of change in fuel percentage.
      trendDirection={trendDirection} // Controls trend color for fuel trend.
      className={className} // Allows custom styling for this widget from outside.
    />
  );
}
