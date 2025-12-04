import { db } from "@/lib/db"; // Imports the Prisma client so this server component can query the database.
import DashboardGridClient from "./DashboardGridClient"; // Imports the client-side grid component that handles drag + resize.
import { RevenueWidget } from "./components/RevenueWidget"; // Imports the Revenue KPI widget.
import { ExpensesWidget } from "./components/ExpensesWidget"; // Imports the Expenses KPI widget.
import { ProfitWidget } from "./components/ProfitWidget"; // Imports the Net Profit KPI widget.
import { RpmWidget } from "./components/RpmWidget"; // Imports the Rate Per Mile KPI widget.
import { FuelPercentWidget } from "./components/FuelPercentWidget"; // Imports the Fuel % of Revenue KPI widget.
import { LoadsCompletedWidget } from "./components/LoadsCompletedWidget"; // Imports the Loads Completed KPI widget.
import { RecentLoadsWidget } from "./components/RecentLoadsWidget"; // Imports the Loads (Last 7 Days) KPI widget.
import { UtilizationWidget } from "./components/UtilizationWidget"; // Imports the Fleet Utilization KPI widget.
import { MilesWidget } from "./components/MilesWidget"; // Imports the Total Miles KPI widget.
import { CashflowWidget } from "./components/CashflowWidget"; // Imports the Net Cashflow KPI widget.
import { StaleCustomersWidget } from "./components/StaleCustomersWidget"; // Imports the Stale Customers widget.
import { StaleProspectsWidget } from "./components/StaleProspectsWidget"; // Imports the Stale Prospects widget.
import type { WidgetLayoutConfig } from "@/lib/dashboardWidgets"; // Imports the shared layout type used by DashboardGridClient.

export const dynamic = "force-dynamic"; // Tells Next.js not to cache this page so KPI data is always fresh per request.

// Helper to safely sum arrays of numbers, ignoring null/undefined.
function sum(values: (number | null | undefined)[]): number { // Declares a sum helper that accepts an array of possibly-null numbers.
  return values.reduce((acc, v) => acc + (v ?? 0), 0); // Reduces the array, treating null/undefined as 0.
}

// Helper to compute percent change vs a previous value.
function percentChange(current: number, previous: number): number | null { // Declares a helper for percentage change.
  if (previous <= 0) return null; // If previous is zero or negative, returns null to avoid divide-by-zero junk.
  return ((current - previous) / previous) * 100; // Computes ((current - previous) / previous) * 100.
}

// Helper to approximate utilization based on miles vs a theoretical maximum.
function approxUtilization(totalMiles: number, days: number): number { // Declares a helper for rough utilization.
  const maxMilesPerDay = 600; // Assumes ~600 miles/day per truck as a sanity upper bound.
  const theoreticalMax = maxMilesPerDay * days; // Computes maximum possible miles over the period.
  if (theoreticalMax <= 0) return 0; // If no days or invalid window, returns 0% utilization.
  const ratio = (totalMiles / theoreticalMax) * 100; // Computes actual miles as a percentage of theoretical max.
  return Math.max(0, Math.min(100, ratio)); // Clamps the result between 0 and 100.
}

export default async function DashboardPage() { // Default export: async React Server Component for the dashboard route.
  const now = new Date(); // Captures the current time for all period calculations.
  const daysInPeriod = 30; // Defines the primary KPI period as the last 30 days.

  const periodStart = new Date(now); // Creates a Date object we can mutate for the current period start.
  periodStart.setDate(periodStart.getDate() - daysInPeriod); // Moves periodStart back 30 days.

  const prevPeriodStart = new Date(periodStart); // Clones periodStart to compute the previous period start.
  prevPeriodStart.setDate(prevPeriodStart.getDate() - daysInPeriod); // Moves previous period start back another 30 days.

  const last7Start = new Date(now); // Creates a Date object for the last 7-day window start.
  last7Start.setDate(last7Start.getDate() - 7); // Moves last7Start back 7 days.

  const prev7Start = new Date(last7Start); // Clones last7Start to compute the prior 7-day window start.
  prev7Start.setDate(prev7Start.getDate() - 7); // Moves prev7Start back another 7 days.

  const staleThresholdDays = 30; // Defines how many days of silence counts as "stale" for customers.
  const staleCutoff = new Date(now); // Creates a Date object to represent the cutoff for stale contacts.
  staleCutoff.setDate(staleCutoff.getDate() - staleThresholdDays); // Moves staleCutoff back by the threshold days.

  const [ // Uses Promise.all to fetch all required data from Prisma in parallel for performance.
    loadsCurrent, // Holds loads from the current 30-day period.
    loadsPrev, // Holds loads from the previous 30-day period.
    loadsLast7, // Holds loads from the last 7 days.
    loadsPrev7, // Holds loads from the 7 days before that.
    expensesCurrent, // Holds expenses in the current 30-day period.
    expensesPrev, // Holds expenses in the previous 30-day period.
    customersWithNotes, // Holds customers plus their most recent call note.
  ] = await Promise.all([
    db.load.findMany({ // Queries loads created in the current 30-day window.
      where: { createdAt: { gte: periodStart, lte: now } }, // Filters loads whose createdAt is between periodStart and now.
    }),
    db.load.findMany({ // Queries loads created in the previous 30-day window.
      where: { createdAt: { gte: prevPeriodStart, lt: periodStart } }, // Filters loads between prevPeriodStart and periodStart.
    }),
    db.load.findMany({ // Queries loads created in the last 7 days.
      where: { createdAt: { gte: last7Start, lte: now } }, // Filters loads between last7Start and now.
    }),
    db.load.findMany({ // Queries loads created in the prior 7-day window.
      where: { createdAt: { gte: prev7Start, lt: last7Start } }, // Filters loads between prev7Start and last7Start.
    }),
    db.expense.findMany({ // Queries expenses incurred in the current 30-day period.
      where: { incurredAt: { gte: periodStart, lte: now } }, // Filters expenses whose incurredAt is within the current window.
    }),
    db.expense.findMany({ // Queries expenses incurred in the previous 30-day period.
      where: { incurredAt: { gte: prevPeriodStart, lt: periodStart } }, // Filters expenses in the prior window.
    }),
    db.customer.findMany({ // Queries all customers along with their most recent call note for stale detection.
      include: {
        callNotes: { orderBy: { createdAt: "desc" }, take: 1 }, // Includes the latest call note (if any) for each customer.
      },
    }),
  ]);

  const totalRevenueCurrent = sum(loadsCurrent.map((l) => l.rate)); // Sums rate across current-period loads to get total revenue.
  const totalRevenuePrev = sum(loadsPrev.map((l) => l.rate)); // Sums rate across previous-period loads for revenue comparison.

  const totalMilesCurrent = sum(loadsCurrent.map((l) => l.miles)); // Sums miles across current-period loads.
  const totalMilesPrev = sum(loadsPrev.map((l) => l.miles)); // Sums miles across previous-period loads.

  const totalFuelCurrent = sum( // Sums direct load-level costs for current period.
    loadsCurrent.map((l) => (l.fuelCost ?? 0) + (l.lumper ?? 0) + (l.tolls ?? 0) + (l.otherCosts ?? 0)) // Adds fuel, lumper, tolls, and otherCosts per load.
  );
  const totalFuelPrev = sum( // Sums direct load-level costs for previous period.
    loadsPrev.map((l) => (l.fuelCost ?? 0) + (l.lumper ?? 0) + (l.tolls ?? 0) + (l.otherCosts ?? 0)) // Same cost aggregation for previous-period loads.
  );

  const totalExpensesCurrent = sum(expensesCurrent.map((e) => e.amount)); // Sums general expenses in the current period.
  const totalExpensesPrev = sum(expensesPrev.map((e) => e.amount)); // Sums general expenses in the previous period.

  const netProfitCurrent = totalRevenueCurrent - totalFuelCurrent - totalExpensesCurrent; // Calculates net profit for the current period.
  const netProfitPrev = totalRevenuePrev - totalFuelPrev - totalExpensesPrev; // Calculates net profit for the previous period.

  const rpmCurrent =
    totalMilesCurrent > 0 ? totalRevenueCurrent / totalMilesCurrent : 0; // Computes current RPM safely, avoiding divide-by-zero.
  const rpmPrev =
    totalMilesPrev > 0 ? totalRevenuePrev / totalMilesPrev : null; // Computes previous RPM or null if no miles.
  const rpmDelta = rpmPrev != null ? rpmCurrent - rpmPrev : null; // Computes change in RPM vs prior period, or null if no baseline.

  const fuelPercentCurrent =
    totalRevenueCurrent > 0 ? (totalFuelCurrent / totalRevenueCurrent) * 100 : 0; // Computes fuel % of revenue for the current period.
  const fuelPercentPrev =
    totalRevenuePrev > 0 ? (totalFuelPrev / totalRevenuePrev) * 100 : null; // Computes fuel % of revenue for the previous period or null.
  const fuelPercentDelta =
    fuelPercentPrev != null ? fuelPercentCurrent - fuelPercentPrev : null; // Computes change in fuel % vs prior period in points.

  const loadsThisPeriod = loadsCurrent.length; // Counts loads in the current 30-day period.
  const loadsPriorPeriod = loadsPrev.length; // Counts loads in the previous 30-day period.
  const loadsLast7Days = loadsLast7.length; // Counts loads in the last 7 days.
  const loadsPrev7Days = loadsPrev7.length; // Counts loads in the prior 7 days.

  const avgMilesPerDay =
    daysInPeriod > 0 ? totalMilesCurrent / daysInPeriod : null; // Computes average miles per day over the 30-day period.

  const utilizationPercent = approxUtilization(totalMilesCurrent, daysInPeriod); // Computes a rough utilization based on miles vs theoretical max.

  const revenueDeltaPercent = percentChange(totalRevenueCurrent, totalRevenuePrev); // Computes revenue percent change vs prior period.
  const expensesDeltaPercent = percentChange(totalExpensesCurrent + totalFuelCurrent, totalExpensesPrev + totalFuelPrev); // Computes total expense (fuel + general) change.
  const profitDeltaPercent = percentChange(netProfitCurrent, netProfitPrev); // Computes net profit percent change vs prior period.

  const cashflowCurrent = netProfitCurrent; // Simplifies net cashflow as net profit for now (can refine later).
  const cashflowPrev = netProfitPrev; // Uses previous net profit as the prior cashflow proxy.
  const cashflowDeltaPercent = percentChange(cashflowCurrent, cashflowPrev); // Computes cashflow percent change vs prior period.

  const staleCustomers = customersWithNotes.filter((customer) => { // Filters customers that are considered "stale".
    const lastNote = customer.callNotes[0]; // Gets the most recent call note if it exists.
    const lastContact = lastNote?.createdAt ?? customer.createdAt; // Uses last note date, or customer creation date as fallback.
    return lastContact < staleCutoff; // Marks customer as stale if last contact is older than the cutoff.
  });
  const staleCustomersCount = staleCustomers.length; // Counts how many customers are currently stale.

  const staleProspectsCount = 0; // Placeholder: Prospects CRM not wired yet, so we report 0 (widget will explain this is coming soon).

  const periodLabel = "Last 30 days"; // Defines a single label describing the main KPI period for the dashboard.

  const initialLayout: WidgetLayoutConfig[] = [ // Defines the initial grid layout for each widget tile.
    { id: "revenueKpi", x: 0, y: 0, w: 3, h: 2 }, // Places Revenue KPI in the top-left, 3 columns wide, 2 rows tall.
    { id: "expensesKpi", x: 3, y: 0, w: 3, h: 2 }, // Places Expenses KPI next to Revenue.
    { id: "netProfitKpi", x: 6, y: 0, w: 3, h: 2 }, // Places Net Profit KPI in the first row.
    { id: "cashflowKpi", x: 9, y: 0, w: 3, h: 2 }, // Places Cashflow KPI in the first row, right side.
    { id: "avgRpmCard", x: 0, y: 2, w: 3, h: 2 }, // Places RPM KPI in the second row, left.
    { id: "fuelOverviewCard", x: 3, y: 2, w: 3, h: 2 }, // Places Fuel % of Revenue KPI in the second row.
    { id: "loadsCompletedCard", x: 6, y: 2, w: 3, h: 2 }, // Places Loads Completed KPI in the second row.
    { id: "milesCard", x: 9, y: 2, w: 3, h: 2 }, // Places Total Miles KPI in the second row, right.
    { id: "staleCustomersCard", x: 0, y: 4, w: 4, h: 3 }, // Places Stale Customers widget in the third row, spanning 4 columns.
    { id: "staleProspectsCard", x: 4, y: 4, w: 4, h: 3 }, // Places Stale Prospects widget in the middle of the third row.
    { id: "recentLoadsCard", x: 8, y: 4, w: 4, h: 3 }, // Places Recent Loads (Last 7 Days) widget on the right side.
    { id: "utilizationCard", x: 0, y: 7, w: 4, h: 2 }, // Places Fleet Utilization KPI in the fourth row.
  ];

  return ( // Returns the full JSX tree for the dashboard page.
    <div className="space-y-6 p-4"> {/* Outer wrapper with padding and vertical spacing between sections. */}
      <header className="flex items-center justify-between"> {/* Header row with title on the left and period label on the right. */}
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Dashboard {/* Main heading for the FleetCore dashboard view. */}
          </h1>
          <p className="text-sm text-slate-500">
            High-level view of your revenue, costs, and customer health. {/* Short description of what this page shows. */}
          </p>
        </div>
        <div className="text-xs text-slate-500">
          {periodLabel} {/* Displays the current KPI period label ("Last 30 days"). */}
        </div>
      </header>

      <DashboardGridClient initialLayout={initialLayout}> {/* Renders the grid of widgets using the configured layout. */}
        <RevenueWidget
          totalRevenue={totalRevenueCurrent} // Passes current-period total revenue into the Revenue widget.
          periodLabel={periodLabel} // Passes the shared period label.
          deltaPercent={revenueDeltaPercent ?? undefined} // Passes revenue percent change or undefined if null.
          className="bg-slate-900 text-slate-50 border-slate-800" // Example styling: dark card for revenue.
        />
        <ExpensesWidget
          totalExpenses={totalExpensesCurrent + totalFuelCurrent} // Combines expenses + fuel as total operating expenses.
          periodLabel={periodLabel} // Passes the period label.
          deltaPercent={expensesDeltaPercent ?? undefined} // Passes expense percent change vs prior period.
          className="bg-slate-900 text-slate-50 border-slate-800" // Matches styling with revenue card.
        />
        <ProfitWidget
          netProfit={netProfitCurrent} // Passes net profit for the current period.
          periodLabel={periodLabel} // Passes the period label.
          deltaPercent={profitDeltaPercent ?? undefined} // Passes profit percent change vs prior period.
          className="bg-emerald-900/90 text-emerald-50 border-emerald-500" // Highlights profit card in green to stand out.
        />
        <CashflowWidget
          netCashflow={cashflowCurrent} // Passes net cashflow (simplified as net profit).
          periodLabel={periodLabel} // Passes period label.
          deltaPercent={cashflowDeltaPercent ?? undefined} // Passes cashflow percent change vs prior period.
          className="bg-slate-900 text-slate-50 border-slate-800" // Keeps styling consistent with other financial KPIs.
        />
        <RpmWidget
          rpm={rpmCurrent} // Passes current-period RPM.
          periodLabel={periodLabel} // Passes period label.
          deltaRpm={rpmDelta ?? undefined} // Passes RPM delta or undefined.
          className="bg-slate-900 text-slate-50 border-slate-800" // Styles RPM card in the same dark theme.
        />
        <FuelPercentWidget
          fuelPercentOfRevenue={fuelPercentCurrent} // Passes fuel % of revenue for the current period.
          periodLabel={periodLabel} // Period label.
          deltaPercent={fuelPercentDelta ?? undefined} // Passes change in fuel % vs prior period.
          className="bg-slate-900 text-slate-50 border-slate-800" // Styles the fuel KPI card.
        />
        <LoadsCompletedWidget
          loadsThisPeriod={loadsThisPeriod} // Passes load count for the current period.
          loadsPriorPeriod={loadsPriorPeriod} // Passes load count for prior period for trend.
          periodLabel={periodLabel} // Period label.
          className="bg-slate-900 text-slate-50 border-slate-800" // Styles the loads KPI card.
        />
        <MilesWidget
          totalMiles={totalMilesCurrent} // Passes total miles driven in the period.
          periodLabel={periodLabel} // Period label.
          avgMilesPerDay={avgMilesPerDay ?? undefined} // Passes average miles per day if available.
          className="bg-slate-900 text-slate-50 border-slate-800" // Styles the miles KPI card.
        />
        <StaleCustomersWidget
          staleCustomersCount={staleCustomersCount} // Passes count of customers that have gone stale.
          thresholdDays={staleThresholdDays} // Passes the day threshold for staleness.
          className="bg-amber-900/90 text-amber-50 border-amber-500" // Highlights this widget in amber as a warning.
        />
        <StaleProspectsWidget
          staleProspectsCount={staleProspectsCount} // Passes count of stale prospects (placeholder for now).
          thresholdDays={staleThresholdDays} // Passes threshold for future real logic.
          className="bg-amber-900/90 text-amber-50 border-amber-500" // Styles similarly to stale customers widget.
        />
        <RecentLoadsWidget
          loadsLast7Days={loadsLast7Days} // Passes loads completed in the last 7 days.
          loadsPrev7Days={loadsPrev7Days} // Passes loads completed in the prior 7 days for comparison.
          className="bg-slate-900 text-slate-50 border-slate-800" // Styles recent loads widget in dark theme.
        />
        <UtilizationWidget
          utilizationPercent={utilizationPercent} // Passes the approximate utilization percentage.
          periodLabel={periodLabel} // Period label.
          deltaPercent={null} // We are not yet computing utilization vs prior period, so pass null.
          className="bg-slate-900 text-slate-50 border-slate-800" // Styles the utilization widget.
        />
      </DashboardGridClient>
    </div>
  );
}
