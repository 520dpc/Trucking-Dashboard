"use client"; // Marks this widget as a Client Component for interactivity.

import React from "react"; // Imports React for component and JSX.
import { KpiCard } from "./KpiCard"; // Imports shared KPI layout component.

type RpmWidgetProps = { // Declares props for the Rate Per Mile widget.
  rpm: number; // Average rate per mile for the period.
  periodLabel: string; // Description of the period (e.g., "This month").
  deltaRpm?: number | null; // Optional change in RPM vs prior period.
  className?: string; // Optional className override for styling this widget.
}; // Ends RpmWidgetProps.

export function RpmWidget({ // Declares and exports the RpmWidget component.
  rpm, // Destructures rpm from props.
  periodLabel, // Destructures periodLabel from props.
  deltaRpm, // Destructures deltaRpm from props.
  className, // Destructures className to forward to KpiCard.
}: RpmWidgetProps) { // Applies prop typing.

  const formattedValue = `${rpm.toFixed(2)} RPM`; // Formats the RPM value with two decimals and "RPM" suffix.

  let trendDirection: "up" | "down" | "neutral" = "neutral"; // Starts with neutral trend direction.

  if (typeof deltaRpm === "number") { // Only compute direction if we have numeric deltaRpm.
    if (deltaRpm > 0) trendDirection = "up"; // Higher RPM is good, so positive change is "up".
    else if (deltaRpm < 0) trendDirection = "down"; // Lower RPM is bad, so negative change is "down".
  }

  const trendLabel =
    typeof deltaRpm === "number" // Only build label if deltaRpm is provided.
      ? `${deltaRpm > 0 ? "+" : ""}${deltaRpm.toFixed(2)} vs prior period` // Signed RPM difference with two decimals.
      : undefined; // If missing, omit trend label.

  return ( // Renders the RPM KPI card.
    <KpiCard
      title="Rate Per Mile" // KPI title for RPM.
      value={formattedValue} // Main value showing RPM.
      subLabel={periodLabel} // Period label under the value.
      trendLabel={trendLabel} // Optional description of RPM change.
      trendDirection={trendDirection} // Controls trend color.
      className={className} // Allows external styling for this specific widget.
    />
  );
}
