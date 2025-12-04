"use client"; // Marks this widget as a Client Component so it can be used in interactive dashboard layouts.

import React from "react"; // Imports React so we can define a functional component and use JSX.
import { KpiCard } from "./KpiCard"; // Imports the shared KpiCard layout component.

type RevenueWidgetProps = { // Defines the props required to render the Revenue widget.
  totalRevenue: number; // Total revenue for the selected period.
  periodLabel: string; // Human-readable label for the period (e.g., "Last 30 days").
  deltaPercent?: number | null; // Optional percent change vs prior period.
  className?: string; // Optional extra className for styling this widget differently if needed.
}; // Ends the RevenueWidgetProps type.

export function RevenueWidget({ // Declares and exports the RevenueWidget component.
  totalRevenue, // Destructures totalRevenue from props.
  periodLabel, // Destructures periodLabel from props.
  deltaPercent, // Destructures deltaPercent from props.
  className, // Destructures optional className from props so it can be forwarded to KpiCard.
}: RevenueWidgetProps) { // Applies the RevenueWidgetProps type to the component props.
  const formattedValue = // Builds a formatted string for total revenue.
    `$${totalRevenue.toLocaleString("en-US", { // Uses locale formatting for thousands separators.
      maximumFractionDigits: 0, // Removes cents to keep dashboard numbers clean and bold.
    })}`; // Closes toLocaleString and template literal.

  let trendDirection: "up" | "down" | "neutral" = "neutral"; // Initializes the trend direction as neutral.

  if (typeof deltaPercent === "number") { // Only compute a direction if deltaPercent is a valid number.
    if (deltaPercent > 0) trendDirection = "up"; // Positive change in revenue is good, so direction is up.
    else if (deltaPercent < 0) trendDirection = "down"; // Negative change in revenue is bad, so direction is down.
  }

  const trendLabel = // Computes the optional trend label text.
    typeof deltaPercent === "number" // If we have a numeric deltaPercent...
      ? `${deltaPercent > 0 ? "+" : ""}${deltaPercent.toFixed(1)}% vs prior period` // Build signed percent string with one decimal.
      : undefined; // If deltaPercent is missing, do not show any trend label.

  return ( // Renders the KPI card for revenue.
    <KpiCard
      title="Revenue" // Sets the card title.
      value={formattedValue} // Passes the formatted revenue value as the main KPI value.
      subLabel={periodLabel} // Shows which period this revenue covers.
      trendLabel={trendLabel} // Optional text describing revenue change vs prior period.
      trendDirection={trendDirection} // Indicates whether the trend is up, down, or neutral.
      className={className} // Forwards any widget-specific styling classes down to the KpiCard container.
    />
  );
}
