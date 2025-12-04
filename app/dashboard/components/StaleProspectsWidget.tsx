"use client"; // Marks this widget as a Client Component for interactive use inside the dashboard grid.

import React from "react"; // Imports React for JSX and component support.
import { KpiCard } from "./KpiCard"; // Imports the shared KPI card wrapper.

type StaleProspectsWidgetProps = { // Declares props for the Stale Prospects widget.
  staleProspectsCount: number; // Number of prospects considered stale (placeholder until Prospect model is wired).
  thresholdDays: number; // Number of days without touch that counts as "stale".
  className?: string; // Optional className for styling customization.
}; // Ends the StaleProspectsWidgetProps type.

export function StaleProspectsWidget({ // Declares and exports the StaleProspectsWidget component.
  staleProspectsCount, // Destructures staleProspectsCount from props.
  thresholdDays, // Destructures thresholdDays from props.
  className, // Destructures className to forward to KpiCard.
}: StaleProspectsWidgetProps) { // Applies props type.

  const value = `${staleProspectsCount}`; // Converts the count into a string for display.

  const subLabel =
    staleProspectsCount === 0 // If there are no stale prospects yet...
      ? "Prospect CRM coming soon" // Inform the user this is placeholder until we wire the Prospect model.
      : `No outreach in ${thresholdDays}+ days`; // Otherwise show the same threshold text as customers.

  const trendLabel =
    staleProspectsCount > 0 // If there are stale prospects...
      ? "Re-engage these prospects" // Suggests action to the user.
      : "All prospects recently touched (placeholder)"; // Placeholder text until real logic is added.

  const trendDirection: "up" | "down" | "neutral" =
    staleProspectsCount > 0 ? "down" : "neutral"; // Treats stale prospects as "down", and zero as neutral for now.

  return ( // Renders the KPI card summarizing stale prospect status.
    <KpiCard
      title="Stale Prospects" // Title indicating the KPI is about quiet prospects.
      value={value} // Main value showing count of stale prospects.
      subLabel={subLabel} // Secondary text explaining threshold or placeholder status.
      trendLabel={trendLabel} // Text indicating action or placeholder state.
      trendDirection={trendDirection} // Sets trend color direction.
      className={className} // Allows dashboard page to style this widget specifically.
    />
  );
}
