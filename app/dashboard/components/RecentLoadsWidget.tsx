"use client"; // Marks this widget as a Client Component.

import React from "react"; // Imports React for components and JSX.
import { KpiCard } from "./KpiCard"; // Imports the shared KPI card wrapper.

type RecentLoadsWidgetProps = { // Declares props for the Recent Loads widget.
  loadsLast7Days: number; // Number of loads completed in the last 7 days.
  loadsPrev7Days?: number | null; // Optional number of loads in the 7 days before that.
  className?: string; // Optional widget-specific styling override.
}; // Ends RecentLoadsWidgetProps.

export function RecentLoadsWidget({ // Declares and exports RecentLoadsWidget.
  loadsLast7Days, // Destructures loadsLast7Days from props.
  loadsPrev7Days, // Destructures loadsPrev7Days from props.
  className, // Destructures className to forward to KpiCard.
}: RecentLoadsWidgetProps) { // Applies prop typing.

  const formattedValue = `${loadsLast7Days}`; // Main value string showing load count in last 7 days.

  let trendLabel: string | undefined; // Optional label for explaining change vs prior 7 days.
  let trendDirection: "up" | "down" | "neutral" = "neutral"; // Default trend direction is neutral.

  if (typeof loadsPrev7Days === "number") { // Only compute trend if previous 7-day load count is available.
    const diff = loadsLast7Days - loadsPrev7Days; // Calculates difference between current and prior 7 days.
    const sign = diff > 0 ? "+" : diff < 0 ? "" : ""; // Uses "+" sign for positive differences.
    trendLabel = `${sign}${diff} loads vs prior 7 days`; // Builds label like "+2 loads vs prior 7 days".
    if (diff > 0) trendDirection = "up"; // More loads is good, so diff > 0 is "up".
    else if (diff < 0) trendDirection = "down"; // Fewer loads is bad, so diff < 0 is "down".
  }

  return ( // Renders the Recent Loads KPI card.
    <KpiCard
      title="Loads (Last 7 Days)" // Title for this KPI.
      value={formattedValue} // Shows number of loads completed in the last 7 days.
      subLabel="Completed loads" // Describes what the value means.
      trendLabel={trendLabel} // Optional trend text comparing to prior 7 days.
      trendDirection={trendDirection} // Controls the color of trend text.
      className={className} // Allows external styles to tweak this widget specifically.
    />
  );
}
