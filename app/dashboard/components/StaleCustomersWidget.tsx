"use client";                                                        // Marks this widget as a Client Component so it can be used inside the dashboard grid.

import React from "react";                                           // Imports React for JSX support.
import { KpiCard } from "./KpiCard";                                 // Imports the shared KPI card layout wrapper.

type StaleCustomerListItem = {                                       // Declares the shape of each list item for the stale customers list.
  id: string;                                                        // Unique id of the customer (used as React key).
  name: string;                                                      // Display name of the customer.
  daysStale: number;                                                 // Number of days since the last contact.
};                                                                   // Ends StaleCustomerListItem type.

type StaleCustomersWidgetProps = {                                   // Declares props for the Stale Customers widget.
  staleCustomersCount: number;                                       // Total number of stale customers.
  thresholdDays: number;                                             // Threshold in days defining "stale".
  customers: StaleCustomerListItem[];                                // List of stale customers to display (usually top N).
  className?: string;                                                // Optional custom CSS classes for the outer card.
};                                                                   // Ends StaleCustomersWidgetProps type.

export function StaleCustomersWidget({                               // Declares and exports the StaleCustomersWidget component.
  staleCustomersCount,                                               // Destructures staleCustomersCount from props.
  thresholdDays,                                                     // Destructures thresholdDays from props.
  customers,                                                         // Destructures customers list from props.
  className,                                                         // Destructures optional className from props.
}: StaleCustomersWidgetProps) {                                      // Applies the props type to the component.
  const value = `${staleCustomersCount}`;                            // Formats the stale customer count as a string for the KPI value.

  const subLabel =                                                   // Computes the subLabel describing the threshold.
    staleCustomersCount === 0                                        // If there are no stale customers...
      ? "All customers recently contacted"                           // ...show a positive message.
      : `No contact in ${thresholdDays}+ days`;                      // Otherwise show how many days counts as stale.

  const trendLabel =                                                 // Computes the trend label text.
    staleCustomersCount > 0                                          // If any customers are stale...
      ? "Follow up with these accounts"                              // ...encourage follow-up.
      : "Customer touchpoints look healthy";                         // Otherwise show a positive health message.

  const trendDirection: "up" | "down" | "neutral" =                  // Chooses a trend direction for color.
    staleCustomersCount > 0 ? "down" : "up";                         // Having stale customers is bad ("down"), zero is good ("up").

  return (                                                           // Returns the KPI card with an embedded list of customers.
    <KpiCard
      title="Stale Customers"                                        // Sets the card title.
      value={value}                                                  // Shows the number of stale customers as the main value.
      subLabel={subLabel}                                            // Shows threshold / health text below the value.
      trendLabel={trendLabel}                                        // Shows an action-oriented trend message.
      trendDirection={trendDirection}                                // Controls the color of the trend text.
      className={className}                                          // Passes through any custom styling for this widget.
    >
      {customers?.length === 0 ? (                                    // If there are no individual stale customers to list...
        <p className="text-xs text-emerald-100">                     {/* Shows a simple positive message. */}
          No customers are past the {thresholdDays}-day mark.
        </p>
      ) : (
        <ul className="space-y-1">                                   {/* Renders a vertical list of stale customers. */}
          {customers?.map((c) => (                                    // Maps each stale customer into a list item.
            <li
              key={c.id}
              className="flex items-center justify-between py-1 text-xs text-black-200"
              >
              <span className="truncate">{c.name}</span>
              <span className="whitespace-nowrap text-red-500">
                {c.neverContacted ? "No calls yet" : `${c.daysStale}d stale`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </KpiCard>
  );
}
