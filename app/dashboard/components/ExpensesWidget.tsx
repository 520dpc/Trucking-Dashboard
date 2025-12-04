"use client"; // Marks this widget as a Client Component for interactive dashboard layouts.

import React from "react"; // Imports React to define a component and use JSX.
import { KpiCard } from "./KpiCard"; // Imports the shared KpiCard wrapper.

type ExpensesWidgetProps = { // Declares the props for the Expenses widget.
  totalExpenses: number; // Total expenses for the selected period.
  periodLabel: string; // Human-readable label for the period.
  deltaPercent?: number | null; // Optional percent change vs prior period.
  className?: string; // Optional className override for widget-specific styling.
}; // Ends ExpensesWidgetProps type.

export function ExpensesWidget({ // Declares and exports the ExpensesWidget component.
  totalExpenses, // Destructures totalExpenses from props.
  periodLabel, // Destructures periodLabel from props.
  deltaPercent, // Destructures deltaPercent from props.
  className, // Destructures optional className to pass to KpiCard.
}: ExpensesWidgetProps) { // Applies type to props.
  const formattedValue = // Builds a formatted expenses string.
    `$${totalExpenses.toLocaleString("en-US", { // Uses locale formatting for readability.
      maximumFractionDigits: 0, // Removes cents for a clean, high-level dashboard view.
    })}`; // Closes toLocaleString and template literal.

  let trendDirection: "up" | "down" | "neutral" = "neutral"; // Starts with neutral trend direction.

  if (typeof deltaPercent === "number") { // If a numeric delta is provided...
    if (deltaPercent > 0) trendDirection = "down"; // Higher expenses are bad, so a positive delta is a "down" trend.
    else if (deltaPercent < 0) trendDirection = "up"; // Lower expenses are good, so a negative delta is an "up" trend.
  }

  const trendLabel =
    typeof deltaPercent === "number" // Only build label if we have a numeric delta.
      ? `${deltaPercent > 0 ? "+" : ""}${deltaPercent.toFixed(1)}% vs prior period` // Signed percent string with one decimal place.
      : undefined; // If no delta, omit trend label.

  return ( // Renders the Expenses KPI card.
    <KpiCard
      title="Expenses" // Sets the title of the KPI.
      value={formattedValue} // Main value showing total expenses.
      subLabel={periodLabel} // Period context under the value.
      trendLabel={trendLabel} // Optional text describing expense changes vs prior period.
      trendDirection={trendDirection} // Direction controlling trend label color.
      className={className} // Allows the parent to customize styling for this widget specifically.
    />
  );
}
