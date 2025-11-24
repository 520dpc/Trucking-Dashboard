import { NextResponse } from "next/server";                       // Imports NextResponse to send JSON responses from this API route.
import { db } from "@/lib/db";                                    // Imports Prisma client so we can fetch loads from the database.

// Shape of the summary we will return for each customer.
type CustomerSummary = {                                          // Defines a TypeScript type for the response items.
  customerName: string;                                           // Name of the customer (from the broker field).
  loadCount: number;                                              // How many loads we’ve run for this customer.
  totalRevenue: number;                                           // Sum of rate across all loads for this customer.
  totalMiles: number;                                             // Sum of miles across all loads for this customer.
  totalCosts: number;                                             // Sum of fuel + lumper + tolls + otherCosts.
  netProfit: number;                                              // Revenue minus totalCosts.
  avgRatePerMile: number | null;                                  // Average rate per mile across all loads (null if miles = 0).
  avgProfitPerMile: number | null;                                // Average profit per mile (null if miles = 0).
};

// GET /api/customers/summary  → returns profitability by customer.
export async function GET() {                                     // Defines the GET handler for this analytics endpoint.
  try {                                                           // Wrap logic in try/catch to handle DB or runtime errors cleanly.
    const loads = await db.load.findMany({                        // Fetches all loads in the system (later we’ll filter by logged-in user).
      orderBy: { createdAt: "desc" },                             // Orders by newest first; not required for math, but useful for debugging.
    });                                                           // Ends Prisma query.

    const summaryMap = new Map<string, CustomerSummary>();        // Uses a Map keyed by customerName to accumulate stats for each customer.

    for (const load of loads) {                                   // Loops through every load returned from the database.
      const customerName = load.broker ?? "Unknown";              // Uses broker as the customer name; falls back to "Unknown" if null.

      const fuel = load.fuelCost ?? 0;                            // Ensures fuelCost is treated as 0 if somehow null.
      const lumper = load.lumper ?? 0;                            // Ensures lumper is treated as 0 if null.
      const tolls = load.tolls ?? 0;                              // Ensures tolls is treated as 0 if null.
      const other = load.otherCosts ?? 0;                         // Ensures otherCosts is treated as 0 if null.

      const totalCostForLoad = fuel + lumper + tolls + other;     // Computes total direct cost for this single load.
      const netProfitForLoad = load.rate - totalCostForLoad;      // Computes profit for this load: revenue minus costs.

      if (!summaryMap.has(customerName)) {                        // If we haven’t seen this customer yet, initialize their summary entry.
        summaryMap.set(customerName, {                            // Creates a new CustomerSummary object for this customer.
          customerName,                                           // Stores the customer’s name.
          loadCount: 0,                                           // Start with 0 loads; we’ll increment below.
          totalRevenue: 0,                                        // Start with 0 revenue.
          totalMiles: 0,                                          // Start with 0 miles.
          totalCosts: 0,                                          // Start with 0 total costs.
          netProfit: 0,                                           // Start with 0 profit.
          avgRatePerMile: null,                                   // We’ll compute averages after we finish aggregating.
          avgProfitPerMile: null,                                 // Same for profit per mile.
        });
      }

      const entry = summaryMap.get(customerName)!;                // Safely retrieves the existing summary object for this customer.

      entry.loadCount += 1;                                       // Increments how many loads this customer has.
      entry.totalRevenue += load.rate;                            // Adds this load’s revenue to the total.
      entry.totalMiles += load.miles;                             // Adds this load’s miles to the total miles.
      entry.totalCosts += totalCostForLoad;                       // Adds this load’s total cost to the total costs.
      entry.netProfit += netProfitForLoad;                        // Adds this load’s profit to the total profit.
    }

    // After aggregating, compute averages for each customer.
    const summaries: CustomerSummary[] = [];                      // Prepares an array to hold the final summary objects.

    for (const entry of summaryMap.values()) {                    // Loops through each aggregated customer entry.
      if (entry.totalMiles > 0) {                                 // Only compute per-mile metrics if we have some miles.
        entry.avgRatePerMile = entry.totalRevenue / entry.totalMiles;   // Average revenue per mile across all loads for this customer.
        entry.avgProfitPerMile = entry.netProfit / entry.totalMiles;    // Average profit per mile across all loads.
      } else {
        entry.avgRatePerMile = null;                              // If there are no miles, keep averages as null to avoid division by zero.
        entry.avgProfitPerMile = null;                            // Same for avgProfitPerMile.
      }

      summaries.push(entry);                                      // Pushes the completed summary into the array to be returned.
    }

    return NextResponse.json(summaries);                          // Returns the list of customer summaries as JSON to the client.
  } catch (err) {
    console.error("[CUSTOMER_SUMMARY_ERROR]", err);               // Logs the error with a clear tag for debugging.
    return NextResponse.json(                                    // Returns a 500 error if anything goes wrong.
      { error: "Failed to compute customer summary" },            // Message for the frontend/UI.
      { status: 500 }                                             // HTTP 500 = internal server error.
    );
  }
}
