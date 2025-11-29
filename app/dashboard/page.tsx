import { db } from "@/lib/db"; // Prisma client to fetch loads, expenses, and customers from the database.

export default async function DashboardHomePage() { // Server component for /dashboard (the main overview page).
  const [loads, expenses, customers] = await Promise.all([ // Fetch loads, expenses, and customers in parallel for performance.
    db.load.findMany(), // Get all loads for the demo user (later: filter by real user).
    db.expense.findMany(), // Get all expenses.
    db.customer.findMany(), // Get all customers.
  ]);

  const totalRevenue = loads.reduce((sum, load) => sum + load.rate, 0); // Sum of all load rates to represent total revenue.
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0); // Sum of all expense amounts to represent total expenses.
  const netProfit = totalRevenue - totalExpenses; // Basic profit metric: revenue minus expenses.
  const loadCount = loads.length; // Number of loads completed.
  const customerCount = customers.length; // Number of customers/brokers stored.
  const avgRatePerMile =
    loads.length > 0
      ? (
          totalRevenue /
          loads.reduce((miles, load) => miles + load.miles, 0)
        ).toFixed(2) // Average rate per mile across all loads, formatted to 2 decimals.
      : null; // If there are no loads or miles, we keep it null to avoid divide-by-zero.

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Overview
        </h1>
        <p className="text-sm text-slate-500">
          Snapshot of your trucking business performance.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Total revenue
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            ${totalRevenue}
          </p>
          <p className="mt-1 text-xs text-emerald-600">
            Money coming in from loads
          </p>
        </div>

        <div className="rounded-xl border bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Total expenses
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            ${totalExpenses}
          </p>
          <p className="mt-1 text-xs text-rose-600">
            Fuel, maintenance, insurance, and more
          </p>
        </div>

        <div className="rounded-xl border bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Net profit
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            ${netProfit}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Before driver pay and taxes
          </p>
        </div>

        <div className="rounded-xl border bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Active customers
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {customerCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Brokers and shippers you&apos;ve worked with
          </p>
        </div>
      </div>

      {/* Secondary metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Loads completed
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {loadCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Number of loads tracked in FleetCore
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Average rate per mile
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {avgRatePerMile ? `$${avgRatePerMile}` : "--"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Based on all loads with miles recorded
          </p>
        </div>
      </div>
    </div>
  );
}
