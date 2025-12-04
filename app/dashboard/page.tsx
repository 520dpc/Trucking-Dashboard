import { db } from "@/lib/db"; // Imports Prisma client so this server component can query the database.
import DashboardGridClient from "./DashboardGridClient"; // Imports the client-side grid that handles drag + resize.
import { DEFAULT_DASHBOARD_LAYOUT } from "@/lib/dashboardWidgets"; // Imports the central default widget layout configuration.

import { RevenueWidget } from "./components/RevenueWidget"; // Revenue KPI widget component.
import { ExpensesWidget } from "./components/ExpensesWidget"; // Expenses KPI widget component.
import { ProfitWidget } from "./components/ProfitWidget"; // Net Profit KPI widget component.
import { CashflowWidget } from "./components/CashflowWidget"; // Net Cashflow KPI widget component.
import { RpmWidget } from "./components/RpmWidget"; // Rate Per Mile KPI widget component.
import { FuelPercentWidget } from "./components/FuelPercentWidget"; // Fuel % of Revenue KPI widget component.
import { LoadsCompletedWidget } from "./components/LoadsCompletedWidget"; // Loads Completed KPI widget component.
import { MilesWidget } from "./components/MilesWidget"; // Total Miles KPI widget component.
import { RecentLoadsWidget } from "./components/RecentLoadsWidget"; // Loads (Last 7 Days) KPI widget component.
import { UtilizationWidget } from "./components/UtilizationWidget"; // Fleet Utilization KPI widget component.
import { StaleCustomersWidget } from "./components/StaleCustomersWidget"; // Stale Customers widget component.
import { StaleProspectsWidget } from "./components/StaleProspectsWidget"; // Stale Prospects widget component.

export const dynamic = "force-dynamic"; // Tells Next.js to always render this page dynamically (no static caching) so KPIs stay fresh.

// Helper to sum an array of numbers (treating null/undefined as 0).
function sum(values: (number | null | undefined)[]): number { // Declares a small utility function to sum numeric values.
  return values.reduce((acc, v) => acc + (v ?? 0), 0); // Reduces the array while replacing null/undefined with 0.
}

// Helper to compute percent change vs prior value.
function percentChange(current: number, previous: number): number | null { // Declares helper for percentage change calculation.
  if (previous <= 0) return null; // Avoids divide-by-zero or nonsense when previous is zero or negative.
  return ((current - previous) / previous) * 100; // Returns percentage change between current and previous.
}

// Helper to approximate utilization based on miles vs a theoretical maximum.
function approxUtilization(totalMiles: number, days: number): number { // Declares helper for rough fleet utilization approximation.
  const maxMilesPerDay = 600; // Assumes ~600 miles per day per truck as an upper bound.
  const theoreticalMax = maxMilesPerDay * days; // Computes maximum possible miles for the given period.
  if (theoreticalMax <= 0) return 0; // If period is invalid, returns 0 utilization.
  const ratio = (totalMiles / theoreticalMax) * 100; // Converts actual miles into a percentage of theoretical max.
  return Math.max(0, Math.min(100, ratio)); // Clamps the result between 0 and 100.
}

export default async function DashboardPage() { // Default export: async React Server Component for the dashboard.
  const now = new Date(); // Captures the current timestamp.
  const daysInPeriod = 30; // Defines the main KPI window as the last 30 days.

  const periodStart = new Date(now); // Clones the current date for the current period start.
  periodStart.setDate(periodStart.getDate() - daysInPeriod); // Moves the date back by 30 days.

  const prevPeriodStart = new Date(periodStart); // Clones periodStart to compute the previous period start.
  prevPeriodStart.setDate(prevPeriodStart.getDate() - daysInPeriod); // Moves back another 30 days for prior window.

  const last7Start = new Date(now); // Clones current date for the last 7-day window start.
  last7Start.setDate(last7Start.getDate() - 7); // Moves back 7 days.

  const prev7Start = new Date(last7Start); // Clones last7Start for the prior 7-day window.
  prev7Start.setDate(prev7Start.getDate() - 7); // Moves back another 7 days.

  const staleThresholdDays = 30; // Defines how many days without contact marks a customer as stale.
  const staleCutoff = new Date(now); // Clones current date for stale cutoff.
  staleCutoff.setDate(staleCutoff.getDate() - staleThresholdDays); // Moves the cutoff back by the threshold.

  const [ // Runs all DB queries in parallel for performance.
    loadsCurrent, // Loads created in the current 30-day window.
    loadsPrev, // Loads created in the previous 30-day window.
    loadsLast7, // Loads created in the last 7 days.
    loadsPrev7, // Loads created in the 7 days before the last 7.
    expensesCurrent, // Expenses incurred in the current 30-day window.
    expensesPrev, // Expenses incurred in the prior 30-day window.
    customersWithNotes, // Customers with their most recent call note.
  ] = await Promise.all([
    db.load.findMany({
      where: { createdAt: { gte: periodStart, lte: now } }, // Filters loads whose createdAt is in the current period.
    }),
    db.load.findMany({
      where: { createdAt: { gte: prevPeriodStart, lt: periodStart } }, // Filters loads in the previous period.
    }),
    db.load.findMany({
      where: { createdAt: { gte: last7Start, lte: now } }, // Filters loads in the last 7 days.
    }),
    db.load.findMany({
      where: { createdAt: { gte: prev7Start, lt: last7Start } }, // Filters loads in the previous 7-day window.
    }),
    db.expense.findMany({
      where: { incurredAt: { gte: periodStart, lte: now } }, // Filters expenses in the current period.
    }),
    db.expense.findMany({
      where: { incurredAt: { gte: prevPeriodStart, lt: periodStart } }, // Filters expenses in the previous period.
    }),
    db.customer.findMany({
      include: {
        callNotes: { orderBy: { createdAt: "desc" }, take: 1 }, // Loads the most recent call note (if any) per customer.
      },
    }),
  ]);

  const totalRevenueCurrent = sum(loadsCurrent.map((l) => l.rate)); // Sums revenue from loads in the current period.
  const totalRevenuePrev = sum(loadsPrev.map((l) => l.rate)); // Sums revenue from loads in the previous period.

  const totalMilesCurrent = sum(loadsCurrent.map((l) => l.miles)); // Sums miles from loads in the current period.
  const totalMilesPrev = sum(loadsPrev.map((l) => l.miles)); // Sums miles from loads in the previous period.

  const totalFuelCurrent = sum(
    loadsCurrent.map(
      (l) => (l.fuelCost ?? 0) + (l.lumper ?? 0) + (l.tolls ?? 0) + (l.otherCosts ?? 0) // Adds all load-level costs for current-period loads.
    )
  );
  const totalFuelPrev = sum(
    loadsPrev.map(
      (l) => (l.fuelCost ?? 0) + (l.lumper ?? 0) + (l.tolls ?? 0) + (l.otherCosts ?? 0) // Adds all load-level costs for previous-period loads.
    )
  );

  const totalExpensesCurrent = sum(expensesCurrent.map((e) => e.amount)); // Sums general expenses for the current period.
  const totalExpensesPrev = sum(expensesPrev.map((e) => e.amount)); // Sums general expenses for the prior period.

  const netProfitCurrent = totalRevenueCurrent - totalFuelCurrent - totalExpensesCurrent; // Computes net profit for the current period.
  const netProfitPrev = totalRevenuePrev - totalFuelPrev - totalExpensesPrev; // Computes net profit for the previous period.

  const rpmCurrent =
    totalMilesCurrent > 0 ? totalRevenueCurrent / totalMilesCurrent : 0; // Computes current RPM safely (avoids divide-by-zero).
  const rpmPrev =
    totalMilesPrev > 0 ? totalRevenuePrev / totalMilesPrev : null; // Computes prior RPM or null if no miles.
  const rpmDelta = rpmPrev != null ? rpmCurrent - rpmPrev : null; // Computes RPM difference vs prior period.

  const fuelPercentCurrent =
    totalRevenueCurrent > 0 ? (totalFuelCurrent / totalRevenueCurrent) * 100 : 0; // Computes fuel % of revenue for current period.
  const fuelPercentPrev =
    totalRevenuePrev > 0 ? (totalFuelPrev / totalRevenuePrev) * 100 : null; // Computes fuel % of revenue for previous period.
  const fuelPercentDelta =
    fuelPercentPrev != null ? fuelPercentCurrent - fuelPercentPrev : null; // Computes change in fuel percentage vs prior period.

  const loadsThisPeriod = loadsCurrent.length; // Counts loads in the current 30 days.
  const loadsPriorPeriod = loadsPrev.length; // Counts loads in the previous 30 days.
  const loadsLast7Days = loadsLast7.length; // Counts loads in the last 7 days.
  const loadsPrev7Days = loadsPrev7.length; // Counts loads in the previous 7-day window.

  const avgMilesPerDay =
    daysInPeriod > 0 ? totalMilesCurrent / daysInPeriod : null; // Computes average miles per day for the current period.

  const utilizationPercent = approxUtilization(totalMilesCurrent, daysInPeriod); // Approximates fleet utilization.

  const revenueDeltaPercent = percentChange(totalRevenueCurrent, totalRevenuePrev); // Revenue % change vs prior period.
  const expensesDeltaPercent = percentChange(
    totalExpensesCurrent + totalFuelCurrent,
    totalExpensesPrev + totalFuelPrev
  ); // Total spending % change vs prior period.
  const profitDeltaPercent = percentChange(netProfitCurrent, netProfitPrev); // Net profit % change vs prior period.

  const cashflowCurrent = netProfitCurrent; // For now, treats net profit as net cashflow.
  const cashflowPrev = netProfitPrev; // Uses prior net profit as prior cashflow.
  const cashflowDeltaPercent = percentChange(cashflowCurrent, cashflowPrev); // Cashflow % change vs prior period.

  const staleCustomers = customersWithNotes.filter((customer) => { // Filters customers that have gone "stale".
    const lastNote = customer.callNotes[0]; // Gets the most recent call note if it exists.
    const lastContact = lastNote?.createdAt ?? customer.createdAt; // Uses last note date or customer creation date as last contact.
    return lastContact < staleCutoff; // Marks as stale if last contact is older than the cutoff.
  });
  const staleCustomersCount = staleCustomers.length; // Counts how many customers are stale.

  const staleProspectsCount = 0; // Placeholder until a Prospect model exists and is wired in.

  const periodLabel = "Last 30 days"; // Human-readable label describing the current KPI window.

  return ( // Returns the full dashboard markup.
    <div className="space-y-6 p-4"> {/* Outer container with padding and vertical spacing. */}
      <header className="flex items-center justify-between"> {/* Header row for title and period label. */}
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Dashboard {/* Main dashboard title. */}
          </h1>
          <p className="text-sm text-slate-500">
            High-level view of your revenue, costs, and customer health. {/* Short description of this page. */}
          </p>
        </div>
        <div className="text-xs text-slate-500">
          {periodLabel} {/* Shows the current period label at the top-right. */}
        </div>
      </header>

      <DashboardGridClient initialLayout={DEFAULT_DASHBOARD_LAYOUT}> {/* Renders all widgets using the shared default layout. */}
        {/* IMPORTANT: The order of children must match DEFAULT_DASHBOARD_LAYOUT order exactly. */}

        {/* 1. cashflowKpi */}
        <CashflowWidget
          netCashflow={cashflowCurrent} // Passes current net cashflow.
          periodLabel={periodLabel} // Passes period label.
          deltaPercent={cashflowDeltaPercent ?? undefined} // Passes cashflow % change if available.
          className="bg-white" // Uses default white card (styling can be customized here).
        />

        {/* 2. revenueKpi */}
        <RevenueWidget
          totalRevenue={totalRevenueCurrent} // Total revenue for the current period.
          periodLabel={periodLabel} // Period label.
          deltaPercent={revenueDeltaPercent ?? undefined} // Revenue % change vs prior period.
          className="bg-white" // Card styling override if desired.
        />

        {/* 3. expensesKpi */}
        <ExpensesWidget
          totalExpenses={totalExpensesCurrent + totalFuelCurrent} // Combines general expenses and load-level fuel/costs.
          periodLabel={periodLabel} // Period label.
          deltaPercent={expensesDeltaPercent ?? undefined} // Expense % change vs prior period.
          className="bg-white" // Card styling override.
        />

        {/* 4. netProfitKpi */}
        <ProfitWidget
          netProfit={netProfitCurrent} // Net profit for the current period.
          periodLabel={periodLabel} // Period label.
          deltaPercent={profitDeltaPercent ?? undefined} // Profit % change vs prior period.
          className="bg-white" // Card styling override.
        />

        {/* 5. avgRpmCard */}
        <RpmWidget
          rpm={rpmCurrent} // Current RPM.
          periodLabel={periodLabel} // Period label.
          deltaRpm={rpmDelta ?? undefined} // RPM change vs prior period.
          className="bg-white" // Card styling override.
        />

        {/* 6. fuelOverviewCard */}
        <FuelPercentWidget
          fuelPercentOfRevenue={fuelPercentCurrent} // Fuel % of revenue.
          periodLabel={periodLabel} // Period label.
          deltaPercent={fuelPercentDelta ?? undefined} // Fuel % change vs prior period.
          className="bg-white" // Card styling override.
        />

        {/* 7. loadsCompletedCard */}
        <LoadsCompletedWidget
          loadsThisPeriod={loadsThisPeriod} // Load count in current period.
          loadsPriorPeriod={loadsPriorPeriod} // Load count in prior period.
          periodLabel={periodLabel} // Period label.
          className="bg-white" // Card styling override (typo here would be fine to correct to bg-white).
        />

        {/* 8. milesCard */}
        <MilesWidget
          totalMiles={totalMilesCurrent} // Total miles in the period.
          periodLabel={periodLabel} // Period label.
          avgMilesPerDay={avgMilesPerDay ?? undefined} // Average miles per day if available.
          className="bg-white" // Card styling override.
        />

        {/* 9. staleCustomersCard */}
        <StaleCustomersWidget
          staleCustomersCount={staleCustomersCount} // Number of stale customers.
          thresholdDays={staleThresholdDays} // Threshold used to define staleness.
          className="bg-white" // Card styling override (amber border is managed in widget or via className).
        />

        {/* 10. staleProspectsCard */}
        <StaleProspectsWidget
          staleProspectsCount={staleProspectsCount} // Number of stale prospects (placeholder).
          thresholdDays={staleThresholdDays} // Same threshold for prospects once wired.
          className="bg-white" // Card styling override.
        />

        {/* 11. recentLoadsCard */}
        <RecentLoadsWidget
          loadsLast7Days={loadsLast7Days} // Loads in the last 7 days.
          loadsPrev7Days={loadsPrev7Days} // Loads in the previous 7 days.
          className="bg-white" // Card styling override.
        />

        {/* 12. fleetUtilization */}
        <UtilizationWidget
          utilizationPercent={utilizationPercent} // Approximate utilization percentage.
          periodLabel={periodLabel} // Period label.
          deltaPercent={null} // Not yet computing utilization vs prior period, so passing null.
          className="bg-white" // Card styling override.
        />
      </DashboardGridClient>
    </div>
  );
}
