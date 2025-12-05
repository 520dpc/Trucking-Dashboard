"use client";                                                        // Marks this widget as a Client Component so it can run in the browser.

import React from "react";                                           // Imports React so we can use JSX and define components.
import { KpiCard } from "./KpiCard";                                 // Imports the shared KPI card layout wrapper.

// Props passed into the StaleProspectsWidget component.
type StaleProspectsWidgetProps = {                                   // Declares the props for the Stale Prospects widget.
  staleProspectsCount: number;                                       // Total number of stale prospects (placeholder for now).
  thresholdDays: number;                                             // Threshold in days defining "stale".
  className?: string;                                                // Optional CSS className to customize outer card styling.
};                                                                   // Ends StaleProspectsWidgetProps type.

// Widget to show how many prospects are stale (no outreach in N days).
export function StaleProspectsWidget({                               // Declares and exports the StaleProspectsWidget component.
  staleProspectsCount,                                               // Destructures staleProspectsCount from props.
  thresholdDays,                                                     // Destructures thresholdDays from props.
  className,                                                         // Destructures optional className from props.
}: StaleProspectsWidgetProps) {                                      // Applies the props type to the component.
  const value = `${staleProspectsCount}`;                            // Converts the stale prospect count to a string for display.

  const subLabel =                                                   // Builds the secondary label under the main value.
    staleProspectsCount === 0                                        // If there are no stale prospects yet...
      ? "Prospect CRM coming soon"                                   // ...remind the user this is placeholder until we add a Prospect model.
      : `No outreach in ${thresholdDays}+ days`;                     // Otherwise show how many days counts as stale.

  const trendLabel =                                                 // Builds a small trend/action label.
    staleProspectsCount > 0                                          // If there are stale prospects...
      ? "Re-engage these prospects"                                  // ...encourage follow-up outreach.
      : "All prospects recently touched (placeholder)";              // Otherwise show a neutral/positive placeholder message.

  const trendDirection: "up" | "down" | "neutral" =                  // Chooses a trend direction for color.
    staleProspectsCount > 0 ? "down" : "neutral";                    // Stale prospects are bad ("down"); zero is neutral for now.

  return (                                                           // Returns the KPI card JSX for the Stale Prospects widget.
    <KpiCard
      title="Stale Prospects"                                        // Title at the top of the card.
      value={value}                                                  // Main KPI value showing count of stale prospects.
      subLabel={subLabel}                                            // Secondary label explaining either the threshold or placeholder.
      trendLabel={trendLabel}                                        // Text describing what to do or that this is coming soon.
      trendDirection={trendDirection}                                // Controls the trend text color (down = red-ish, neutral = gray).
      className={className}                                          // Allows caller to style this widget differently via className.
    >
      {/* No detailed list yet because Prospect model isn't wired. */}
      <p className="text-xs text-amber-100">                         {/* Small text placeholder inside the card body. */}
        Prospect tracking will be enabled once the CRM/Prospects     {/* Explains that this widget is a placeholder for future CRM. */}
        module is wired in.
      </p>
    </KpiCard>
  );
}
