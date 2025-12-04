"use client"; // Marks this widget as a Client Component so it can be used inside the interactive dashboard grid.

import React from "react"; // Imports React so we can define a functional component and use JSX.
import { KpiCard } from "./KpiCard"; // Imports the shared KPI card layout wrapper.

type StaleCustomersWidgetProps = { // Declares props for the Stale Customers widget.
  staleCustomersCount: number; // Number of customers who have not been contacted within the threshold.
  thresholdDays: number; // Number of days without contact that defines "stale".
  className?: string; // Optional className to customize styling from the parent.
}; // Ends the StaleCustomersWidgetProps type.

export function StaleCustomersWidget({ // Declares and exports the StaleCustomersWidget component.
  staleCustomersCount, // Destructures staleCustomersCount from props.
  thresholdDays, // Destructures thresholdDays from props.
  className, // Destructures optional className to pass into KpiCard.
}: StaleCustomersWidgetProps) { // Applies the props type to the component.
  const value = `${staleCustomersCount}`; // Formats the stale customer count as a string for display.

  const subLabel =
    staleCustomersCount === 1 // Chooses a grammatically correct label based on singular/plural.
      ? `No contact in ${thresholdDays}+ days` // Singular phrasing when there is exactly one stale customer.
      : `No contact in ${thresholdDays}+ days`; // Same text works for plural, but could be customized further if desired.

  const trendLabel =
    staleCustomersCount > 0 // If there are any stale customers...
      ? "Follow up with these accounts" // Encourages follow-up action.
      : "All customers recently contacted"; // Otherwise shows a reassuring status.

  const trendDirection: "up" | "down" | "neutral" =
    staleCustomersCount > 0 ? "down" : "up"; // Treats having stale customers as "down" and all fresh as "up".

  return ( // Renders the KPI card representing stale customer status.
    <KpiCard
      title="Stale Customers" // Title indicating this KPI is about customers going quiet.
      value={value} // Main value showing how many customers are stale.
      subLabel={subLabel} // Secondary text explaining the staleness threshold.
      trendLabel={trendLabel} // Text guiding the user on what this means.
      trendDirection={trendDirection} // Color direction: red-ish if stale > 0, green-ish otherwise.
      className={className} // Forwards any widget-specific styling classes to the card container.
    />
  );
}
