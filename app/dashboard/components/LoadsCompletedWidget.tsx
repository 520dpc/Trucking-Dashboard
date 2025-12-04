"use client"; // Marks this widget as a Client Component.

import React from "react"; // Imports React for JSX and components.
import { KpiCard } from "./KpiCard"; // Imports shared KPI card component.

type LoadsCompletedWidgetProps = { // Declares props for the Loads Completed widget.
  loadsThisPeriod: number; // Number of loads completed in the current period.
  loadsPriorPeriod?: number | null; // Optional number of loads in the prior period.
  periodLabel: string; // Description of the current period.
  className?: string; // Optional className for styling overrides.
}; // Ends LoadsCompletedWidgetProps.

export function LoadsCompletedWidget({ // Declares and exports LoadsCompletedWidget.
  loadsThisPeriod, // Destructures loadsThisPeriod from props.
  loadsPriorPeriod, // Destructures loadsPriorPeriod from props.
  periodLabel, // Destructures periodLabel from props.
  className, // Destructures className to forward to KpiCard.
}: LoadsCompletedWidgetProps) { // Applies prop typing.

  const formattedValue = `${loadsThisPeriod}`; // Formats the current load count as a simple string.

  let trendLabel: string | undefined; // Declares an optional trend label string.
  let trendDirection: "up" | "down" | "neutral" = "neutral"; // Defaults trend direction to neutral.

  if (typeof loadsPriorPeriod === "number") { // Only compute trend if we know the prior-period load count.
    const diff = loadsThisPeriod - loadsPriorPeriod; // Calculates the difference in loads.
    const sign = diff > 0 ? "+" : diff < 0 ? "" : ""; // Uses "+" for positive changes and nothing for zero/negative.
    trendLabel = `${sign}${diff} loads vs prior period`; // Builds label like "+3 loads vs prior period".
    if (diff > 0) trendDirection = "up"; // More loads is good, so diff > 0 is an "up" trend.
    else if (diff < 0) trendDirection = "down"; // Fewer loads is bad, so diff < 0 is "down".
  }

  return ( // Renders the Loads Completed KPI card.
    <KpiCard
      title="Loads Completed" // KPI title showing this is about load count.
      value={formattedValue} // Main value showing number of loads.
      subLabel={periodLabel} // Period description under the value.
      trendLabel={trendLabel} // Optional label explaining change in load count.
      trendDirection={trendDirection} // Controls trend color (up/down/neutral).
      className={className} // Forwards any custom className to the card container.
    />
  );
}
