import { db } from "@/lib/db"; // Imports the shared Prisma client so this server component can query the database.
import ReportsChart from "./ReportsChart"; // Imports the client ReportsChart component; Next.js handles the client/server boundary.

// Type describing a single daily summary point we’ll send to the chart.
type DailySummaryPoint = { // Defines the shape of each data point used for the reports chart.
  date: string; // ISO date string in YYYY-MM-DD format (e.g., "2025-11-26") used as the X-axis value.
  revenue: number; // Total load revenue for that day.
  expenses: number; // Total expenses recorded for that day.
  profit: number; // Net profit for that day (revenue - expenses).
};

export default async function ReportsPage() { // Default export: async React Server Component for /dashboard/reports.
  // TEMP AUTH: find the demo user that owns the current data.
  const user = await db.user.findFirst({ // Looks up the demo user row in the User table.
    where: { email: "demo@demo.com" }, // Filters by the fixed demo email we use across the app until real auth is in place.
  });

  if (!user) { // If the demo user does not exist, we can’t show any real numbers yet.
    return (
      <div className="p-4 space-y-2"> {/* Basic padded container for the empty state. */}
        <h1 className="text-2xl font-semibold">Reports</h1> {/* Page title so the user knows they’re on the Reports page. */}
        <p className="text-sm text-gray-500">
          No data yet. Create loads and expenses to see reports.
        </p> {/* Helper text to guide the user to create data first. */}
      </div>
    );
  }

  const loads = await db.load.findMany({ // Fetches all loads for this user to calculate revenue.
    where: { userId: user.id }, // Filters loads by userId for multi-tenant safety later.
    select: {
      rate: true, // Only selects the rate (revenue) field for each load.
      createdAt: true, // Also selects createdAt so we can aggregate by day.
    },
    orderBy: { createdAt: "asc" }, // Orders loads oldest to newest for consistent aggregation.
  });

  const expenses = await db.expense.findMany({ // Fetches all expenses for this user to calculate costs.
    where: { userId: user.id }, // Filters expenses by userId to match loads.
    select: {
      amount: true, // Only selects the amount (cost) field for each expense.
      incurredAt: true, // Also selects incurredAt so we can aggregate by day.
    },
    orderBy: { incurredAt: "asc" }, // Orders expenses oldest to newest.
  });

  console.log(loads, expenses)
  const map = new Map<string, DailySummaryPoint>(); // Uses a Map keyed by date string to accumulate daily totals.

  // Helper to turn a JS Date into YYYY-MM-DD (date-only) string.
  const toDateKey = (d: Date) =>
    d.toISOString().slice(0, 10); // Converts a Date to an ISO string and slices to "YYYY-MM-DD" for grouping.

  // Aggregate loads into the daily map as revenue.
  for (const load of loads) { // Loops over every load record for this user.
    const dateKey = toDateKey(load.createdAt); // Builds the date-only key from the load’s createdAt.

    if (!map.has(dateKey)) { // If we haven’t seen this date yet, initialize an entry for it.
      map.set(dateKey, { // Creates a new DailySummaryPoint for this date.
        date: dateKey, // Stores the date string.
        revenue: 0, // Starts revenue at 0; we’ll add load revenue to it.
        expenses: 0, // Starts expenses at 0; expenses will be added in the second loop.
        profit: 0, // Starts profit at 0; computed after aggregation.
      });
    }

    const entry = map.get(dateKey)!; // Retrieves the existing daily entry for this date.
    entry.revenue += load.rate; // Adds this load’s rate to the total revenue for that day.
  }

  // Aggregate expenses into the same daily map as costs.
  for (const expense of expenses) { // Loops over every expense record for this user.
    const dateKey = toDateKey(expense.incurredAt); // Builds the date-only key from incurredAt.

    if (!map.has(dateKey)) { // If the date wasn’t created by loads, initialize it now.
      map.set(dateKey, { // Sets up a fresh DailySummaryPoint for this date.
        date: dateKey, // Stores the date string.
        revenue: 0, // Revenue defaults to 0 if there were no loads that day.
        expenses: 0, // Expenses will be incremented below.
        profit: 0, // Profit will be computed later.
      });
    }

    const entry = map.get(dateKey)!; // Retrieves the entry for this date.
    entry.expenses += expense.amount; // Adds this expense amount to the total expenses for that day.
  }

  // Compute profit and sort points chronologically.
  const dailyData: DailySummaryPoint[] = Array.from(map.values()) // Converts the Map values into an array of DailySummaryPoint.
    .map((entry) => ({ // Maps each entry to ensure profit is up-to-date.
      ...entry, // Copies date, revenue, and expenses fields.
      profit: entry.revenue - entry.expenses, // Computes daily profit (revenue minus expenses).
    }))
    .sort((a, b) => (a.date < b.date ? -1 : 1)); // Sorts by date string so the chart X-axis is chronological.

  return (
    <div className="p-4 space-y-4"> {/* Main page container with padding and vertical spacing. */}
      <div className="space-y-1"> {/* Header block for title and subtitle. */}
        <h1 className="text-2xl font-semibold">Reports</h1> {/* Page title. */}
        <p className="text-sm text-gray-500">
          Track revenue, expenses, and profit over time.
        </p> {/* Brief description of what this page shows. */}
      </div>

      {dailyData.length === 0 ? ( // If there are no data points at all, show a friendly empty state.
        <p className="text-sm text-gray-500">
          No activity yet. Add loads and expenses to see your trends.
        </p>
      ) : (
        <ReportsChart data={dailyData} /> // Render the Victory chart with the aggregated daily data.
      )}
    </div>
  );
}
