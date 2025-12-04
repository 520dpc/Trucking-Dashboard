"use client"; // Marks this widget as a Client Component.

import React from "react"; // Imports React for JSX and components.
import { KpiCard } from "./KpiCard"; // Imports shared KPI card layout.

type CashflowWidgetProps = { // Declares props for the Cashflow widget.
  netCashflow: number; // Net cashflow (cash in - cash out) for the period.
  periodLabel: string; // Description of the period.
  deltaPercent?: number | null; // Optional percent change in cashflow vs prior period.
  className?: string; // Optional className override for styling.
}; // Ends CashflowWidgetProps.

export function CashflowWidget({ // Declares and exports CashflowWidget.
  netCashflow, // Destructures netCashflow.
  periodLabel, // Destructures periodLabel.
  deltaPercent, // Destructures deltaPercent.
  className, // Destructures className to pass to KpiCard.
}: CashflowWidgetProps) { // Applies props type.

  const sign = netCashflow >= 0 ? "" : "-"; // Determines whether to prefix a minus sign for negative cashflow.
  const absValue = Math.abs(netCashflow); // Uses absolute value so the number itself is always positive.

  const formattedValue = `${sign}$${absValue.toLocaleString("en-US", { // Builds a formatted signed currency string.
    maximumFractionDigits: 0, // Drops cents to keep the dashboard high-level.
  })}`; // Closes formatting and template literal.

  let trendDirection: "up" | "down" | "neutral" = "neutral"; // Defaults trend to neutral.

  if (typeof deltaPercent === "number") { // Only compute trend if deltaPercent is numeric.
    if (deltaPercent > 0) trendDirection = "up"; // Higher net cashflow is good, so positive delta is "up".
    else if (deltaPercent < 0) trendDirection = "down"; // Lower net cashflow is bad, so negative delta is "down".
  }

  const trendLabel =
    typeof deltaPercent === "number" // Only build label if deltaPercent exists.
      ? `${deltaPercent > 0 ? "+" : ""}${deltaPercent.toFixed(1)}% vs prior period` // Signed percent change string.
      : undefined; // If no delta, do not show trend label.

  return ( // Renders the Net Cashflow KPI card.
    <KpiCard
      title="Net Cashflow" // Title for this KPI.
      value={formattedValue} // Main value showing net cash position.
      subLabel={periodLabel} // Period description under the value.
      trendLabel={trendLabel} // Optional text showing how cashflow changed.
      trendDirection={trendDirection} // Controls trend label color.
      className={className} // Allows external styling overrides for this widget.
    />
  );
}
