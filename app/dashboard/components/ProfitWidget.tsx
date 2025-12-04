"use client"; // Marks this widget as a Client Component.

import React from "react"; // Imports React for component and JSX support.
import { KpiCard } from "./KpiCard"; // Imports the shared KPI wrapper.

type ProfitWidgetProps = { // Defines the props for the Profit widget.
  netProfit: number; // Net profit for the period (revenue - expenses - fuel).
  periodLabel: string; // Period label such as "Last 30 days".
  deltaPercent?: number | null; // Optional percent change in profit vs prior period.
  className?: string; // Optional className to style this widget differently.
}; // Ends ProfitWidgetProps type.

export function ProfitWidget({ // Declares and exports the ProfitWidget.
  netProfit, // Destructures netProfit from props.
  periodLabel, // Destructures periodLabel from props.
  deltaPercent, // Destructures deltaPercent from props.
  className, // Destructures className to forward to KpiCard.
}: ProfitWidgetProps) { // Applies type.

  const formattedValue = // Formats net profit as a signed currency value.
    `$${netProfit.toLocaleString("en-US", { // Uses thousands separators and no cents for clarity.
      maximumFractionDigits: 0, // Drops cents for a bold, simplified dashboard number.
    })}`; // Closes formatting.

  let trendDirection: "up" | "down" | "neutral" = "neutral"; // Defaults trend direction to neutral.

  if (typeof deltaPercent === "number") { // Only compute trend if deltaPercent is numeric.
    if (deltaPercent > 0) trendDirection = "up"; // Higher profit is good, so positive delta is "up".
    else if (deltaPercent < 0) trendDirection = "down"; // Lower profit is bad, so negative delta is "down".
  }

  const trendLabel =
    typeof deltaPercent === "number" // Only build label when deltaPercent exists.
      ? `${deltaPercent > 0 ? "+" : ""}${deltaPercent.toFixed(1)}% vs prior period` // Signed percent string with one decimal.
      : undefined; // If no delta, skip trend label.

  return ( // Renders the Profit KPI card.
    <KpiCard
      title="Net Profit" // KPI title for the card.
      value={formattedValue} // Shows net profit as the main value.
      subLabel={periodLabel} // Period context text under the value.
      trendLabel={trendLabel} // Optional profit trend description.
      trendDirection={trendDirection} // Determines trend color.
      className={className} // Allows external styling customization for this widget.
    />
  );
}
