import Link from "next/link";                                         // Imports Next.js Link for in-app navigation without full reloads.
import { db } from "@/lib/db";                                        // Imports Prisma client to run database queries on the server.
import {
  DEFAULT_DASHBOARD_LAYOUT,
  type DashboardWidgetId,
  type WidgetLayoutConfig,
} from "@/lib/dashboardWidgets";  
import DashboardGridClient from "./DashboardGridClient";          // Client-side grid wrapper that enables drag-and-drop for widgets.
                                    // Imports widget layout config and types used to drive the dashboard grid.

// Props for the KPI cards at the top of the dashboard.                         //
type KpiCardProps = {
  label: string;                                                      // Label text for the KPI card (e.g., "Revenue").
  value: string;                                                      // Primary value string (e.g., "$24,000").
  sublabel?: string;                                                  // Optional secondary text under the value.
  href?: string;                                                      // Optional link; if provided the card becomes clickable.
};

// Simple KPI card component reused for revenue, expenses, etc.                 //
function KpiCard({ label, value, sublabel, href }: KpiCardProps) {
  const content = (                                                   // Prebuilds the inner content so we can optionally wrap in a Link.
    <div className="flex flex-col gap-1 rounded-xl border bg-white px-4 py-3 shadow-sm">
      {/* Card container with padding, border, and subtle shadow. */}
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
        {/* Small, uppercase label at the top of the card. */}
        {label}
      </span>
      <span className="text-2xl font-semibold text-slate-900">
        {/* Main KPI value in a larger font. */}
        {value}
      </span>
      {sublabel && (
        <span className="text-xs text-slate-500">
          {/* Optional sublabel shown only if provided. */}
          {sublabel}
        </span>
      )}
    </div>
  );

  if (href) {
    // If href is provided, make the whole card clickable as a link.
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;                                                     // If no href, just render the plain card.
}

// Props for a simple inline sparkline chart.                                     //
type SparklineProps = {
  values: number[];                                                   // Array of numeric values to visualize over time.
};

// Small SVG sparkline to show trends without pulling in another chart library.   //
function Sparkline({ values }: SparklineProps) {
  if (!values || values.length < 2) {
    // If we have fewer than 2 points, skip rendering the chart.
    return null;
  }

  const max = Math.max(...values);                                    // Finds the maximum value to normalize the Y-axis.
  const min = Math.min(...values);                                    // Finds the minimum value for normalization.
  const range = max - min || 1;                                       // Avoids divide-by-zero by defaulting range to 1.

  const points = values
    .map((v, index) => {
      const x = (index / (values.length - 1)) * 100;                  // Maps the index into a 0–100 range for the X coordinate.
      const y = 100 - ((v - min) / range) * 100;                      // Maps value into 0–100 Y space, flipped so higher values are visually higher.
      return `${x},${y}`;                                             // Returns a "x,y" string for the SVG polyline.
    })
    .join(" ");                                                       // Joins all points into the full polyline points string.

  return (
    <svg viewBox="0 0 100 100" className="mt-3 h-10 w-full">
      {/* SVG canvas with a fixed viewBox; Tailwind controls rendered size. */}
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        points={points}
        className="text-sky-500"
      />
      {/* Polyline renders the sparkline; color inherited via text-sky-500. */}
    </svg>
  );
}

// Shape used for "customers to follow up" rows.                                   //
type FollowUpCustomer = {
  id: string;                                                          // Customer ID used for linking to the detail page.
  name: string;                                                        // Customer name.
  phone: string | null;                                                // Optional phone number.
  lastContactAt: Date | null;                                          // Timestamp of the most recent call note.
};

// Shape of the EIA fuel API result we care about.                                   //
type FuelInfo = {
  price: number | null;                                                // National diesel price in USD per gallon, or null if unavailable.
  asOf: string | null;                                                 // Date string from EIA (e.g., "2025-02-24"), or null if unknown.
};

// Helper to fetch national diesel price from EIA on the server.                     //
// Uses EIA_API_KEY from environment; returns nulls gracefully if anything fails.    //
async function fetchNationalDieselPrice(): Promise<FuelInfo> {
  const apiKey = process.env.EIA_API_KEY;                              // Reads EIA API key from server-side environment variables.

  if (!apiKey) {
    // If there is no API key configured, return null gracefully.
    return { price: null, asOf: null };
  }

  try {
    const url =
      "https://api.eia.gov/series/?" +
      new URLSearchParams({
        api_key: apiKey,                                              // Injects the API key into the request query.
        series_id: "PET.EMD_EPD2D_PTE_NUS_DPG.W",                     // EIA series ID for weekly U.S. on-highway diesel fuel price.
      }).toString();

    const res = await fetch(url, {
      // Uses server-side fetch to call the EIA API.
      next: { revalidate: 60 * 60 * 24 },                             // Asks Next.js to cache the response for 24 hours.
    });

    if (!res.ok) {
      // If the HTTP status is not 2xx, treat as failure.
      console.error("[EIA_FUEL_FETCH_ERROR]", res.statusText);        // Logs an error for debugging.
      return { price: null, asOf: null };
    }

    const json = (await res.json()) as any;                           // Parses the JSON response; typed as any due to EIA schema.
    const series = json?.series?.[0];                                 // Grabs the first series from the result set.
    const firstPoint = series?.data?.[0];                             // Grabs the most recent data point [date, value].

    if (!firstPoint || !Array.isArray(firstPoint)) {
      // If data shape is unexpected, bail out gracefully.
      return { price: null, asOf: null };
    }

    const [date, value] = firstPoint;                                 // Destructures [dateString, priceNumber].
    const numeric = typeof value === "number" ? value : Number(value); // Coerces value into a number if possible.

    if (!Number.isFinite(numeric)) {
      // If price cannot be parsed as a finite number, fall back to null.
      return { price: null, asOf: String(date ?? "") || null };
    }

    return {
      price: numeric,                                                 // Returns the numeric national diesel price.
      asOf: typeof date === "string" ? date : String(date ?? ""),     // Returns the raw date label from EIA.
    };
  } catch (err) {
    console.error("[EIA_FUEL_FETCH_EXCEPTION]", err);                 // Logs network or parsing errors.
    return { price: null, asOf: null };                               // Returns nulls so the UI can show a safe placeholder.
  }
}

// Main dashboard home page for /dashboard.                                           //
export default async function DashboardPage() {
  // TEMP AUTH: use demo user until we plug in real authentication.                  //
  let user = await db.user.findFirst({
    where: { email: "demo@demo.com" },                               // Looks for a user row with the demo email address.
  });

  if (!user) {
    // If demo user does not exist yet, create it so all demo data has an owner.
    user = await db.user.create({
      data: {
        email: "demo@demo.com",                                      // Demo user email.
        passwordHash: "placeholder",                                 // Placeholder hash until a real auth system is added.
      },
    });
  }

  // Fetch core metrics and external fuel info in parallel to minimize wait time.    //
  const [loads, expenses, customers, fuelInfo, layoutRows] = await Promise.all([
    db.load.findMany({
      where: { userId: user.id },                                    // Loads owned by this user (multi-tenant friendly).
    }),
    db.expense.findMany({
      where: { userId: user.id },                                    // Expenses owned by this user.
    }),
    db.customer.findMany({
      where: { userId: user.id },                                    // Customers owned by this user.
      include: {
        callNotes: {                                                 // Also load latest call note per customer for follow-up logic.
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    fetchNationalDieselPrice(),                                      // Fetch national diesel price from EIA (or null on failure).
    db.dashboardWidgetLayout.findMany({
      where: { userId: user.id },                                    // Any saved custom layouts for this user.
      orderBy: [{ y: "asc" }, { x: "asc" }],                         // Sort by row then column for stability.
    }),
  ]);

  // hydrate layout from DB if present, otherwise fallback to defaults.              //
  const layout: WidgetLayoutConfig[] =
    layoutRows.length === 0
      ? DEFAULT_DASHBOARD_LAYOUT                                      // If user has not customized layout, use our default grid positions.
      : layoutRows.map((row) => ({
          id: row.widgetId as DashboardWidgetId,                      // Convert DB widgetId string to our typed DashboardWidgetId.
          x: row.x,                                                   // Persisted X column.
          y: row.y,                                                   // Persisted Y row.
          w: row.w,                                                   // Persisted width.
          h: row.h,                                                   // Persisted height.
        }));

  // === KPI + metrics calculations ===                                            //

  const totalRevenue = loads.reduce((sum, load) => sum + load.rate, 0); // Sum of load rates for total revenue.
  const totalExpenses = expenses.reduce(
    (sum, exp) => sum + exp.amount,
    0,
  );                                                                    // Sum of all expense amounts.
  const netProfit = totalRevenue - totalExpenses;                       // Net profit = revenue - expenses.
  const activeCustomers = customers.length;                             // Count of active customers.

  const now = new Date();                                               // Current timestamp for relative window calculations.
  const thirtyDaysAgo = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  );                                                                    // Timestamp 30 days prior.

  const recentLoads = loads.filter((load) => load.createdAt >= thirtyDaysAgo); // Loads created in the last 30 days.
  const loadsLast30 = recentLoads.length;                               // Number of loads completed in the last 30 days.

  const totalMiles = loads.reduce((sum, load) => sum + load.miles, 0);  // Sum of miles across all loads.
  const avgRpm =
    totalMiles > 0 ? totalRevenue / totalMiles : null;                  // Average rate per mile if miles > 0, else null.

  // Revenue sparkline data: last 10 loads by createdAt, ordered oldest to newest.   //
  const revenueSparkValues = loads
    .slice()
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())      // Sort loads ascending by creation time.
    .slice(-10)                                                         // Take the last 10 loads (or fewer if not enough).
    .map((load) => load.rate);                                          // Map to rate values for the sparkline.

  // Customers needing follow-up: no contact or last contact older than 30 days.     //
  const followUpCutoff = thirtyDaysAgo;                                 // Use same 30-day cutoff for CRM follow-up.

  const followUpCandidates: FollowUpCustomer[] = customers
    .map((c) => {
      const lastNote = c.callNotes[0] ?? null;                          // Most recent call note if any.
      return {
        id: c.id,                                                       // Customer ID.
        name: c.name,                                                   // Customer name.
        phone: c.phone ?? null,                                         // Contact phone or null.
        lastContactAt: lastNote ? lastNote.createdAt : null,            // Last contact timestamp or null.
      } satisfies FollowUpCustomer;
    })
    .filter((c) => {
      if (!c.lastContactAt) return true;                                // If never contacted, always needs follow-up.
      return c.lastContactAt < followUpCutoff;                          // If last contact is older than cutoff, needs follow-up.
    })
    .sort((a, b) => {
      const aTime = a.lastContactAt ? a.lastContactAt.getTime() : 0;    // Converts last contact to ms (null = oldest).
      const bTime = b.lastContactAt ? b.lastContactAt.getTime() : 0;
      return aTime - bTime;                                             // Sort oldest first.
    })
    .slice(0, 5);                                                       // Show top 5 follow-up customers.

  // Helper to format currency consistently in USD.                                  //
  const formatCurrency = (value: number) =>
    value.toLocaleString("en-US", {
      style: "currency",                                                // Format as currency.
      currency: "USD",                                                  // Use US dollars.
      maximumFractionDigits: 0,                                         // Whole dollars for KPIs.
    });

  // Helper to format a Date as a short human-readable string.                      //
  const formatDate = (value: Date | null) => {
    if (!value) return "-";                                             // Nulls render as a dash.
    return value.toLocaleDateString();                                  // Example: "12/2/2025" depending on locale.
  };

  // Helper to map widget width (w) to Tailwind grid column span classes.           //
  const colSpanClassForWidth = (w: number): string => {
    switch (w) {
      case 3:
        return "xl:col-span-3";                                         // Quarter width on xl screens.
      case 4:
        return "xl:col-span-4";                                         // Third width (unused currently but available).
      case 6:
        return "xl:col-span-6";                                         // Half-width on xl screens.
      case 12:
        return "xl:col-span-12";                                        // Full-width row.
      default:
        return "xl:col-span-4";                                         // Sensible fallback.
    }
  };

  // Render function for each widget by its ID, using precomputed metrics.          //
  const renderWidget = (id: DashboardWidgetId) => {
    switch (id) {
      case "revenueKpi":
        return (
          <KpiCard
            label="Revenue"
            value={formatCurrency(totalRevenue)}
            sublabel="All time"
            href="/dashboard/reports"
          />
        );
      case "expensesKpi":
        return (
          <KpiCard
            label="Expenses"
            value={formatCurrency(totalExpenses)}
            sublabel="All time"
            href="/dashboard/expenses"
          />
        );
      case "netProfitKpi":
        return (
          <KpiCard
            label="Net profit"
            value={formatCurrency(netProfit)}
            sublabel="Revenue minus expenses"
            href="/dashboard/reports"
          />
        );
      case "activeCustomersKpi":
        return (
          <KpiCard
            label="Active customers"
            value={activeCustomers.toString()}
            sublabel="Customers with records in your account"
            href="/dashboard/customers"
          />
        );
      case "loadsCompletedCard":
        return (
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            {/* Loads completed summary card with a sparkline of revenue for recent loads. */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Loads completed
                </h2>
                <p className="text-xs text-slate-500">In the last 30 days</p>
              </div>
              <Link
                href="/dashboard/loads"
                className="text-xs text-sky-600 hover:underline"
              >
                View loads
              </Link>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-slate-900">
                {loadsLast30}
              </span>
              <span className="text-xs text-slate-500">
                loads in last 30 days
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Recent revenue trend (last {revenueSparkValues.length} loads)
            </p>
            <Sparkline values={revenueSparkValues} />
          </div>
        );
      case "avgRpmCard":
        return (
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            {/* Average rate-per-mile summary. */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Average rate per mile
                </h2>
                <p className="text-xs text-slate-500">
                  Across all recorded loads
                </p>
              </div>
              <Link
                href="/dashboard/reports"
                className="text-xs text-sky-600 hover:underline"
              >
                View reports
              </Link>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-slate-900">
                {avgRpm !== null ? `$${avgRpm.toFixed(2)}` : "-"}
              </span>
              <span className="text-xs text-slate-500">per mile</span>
            </div>
          </div>
        );
      case "staleCustomersCard":
        return (
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            {/* Customers needing follow-up based on recent call notes. */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Customers to follow up
                </h2>
                <p className="text-xs text-slate-500">
                  No recent call notes in the last 30 days
                </p>
              </div>
              <Link
                href="/dashboard/customers"
                className="text-xs text-sky-600 hover:underline"
              >
                View all customers
              </Link>
            </div>
            {followUpCandidates.length === 0 ? (
              <p className="mt-4 text-xs text-slate-500">
                You&apos;re up to date on customer outreach.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="px-2 py-1 text-left font-medium text-slate-600">
                        Customer
                      </th>
                      <th className="px-2 py-1 text-left font-medium text-slate-600">
                        Phone
                      </th>
                      <th className="px-2 py-1 text-left font-medium text-slate-600">
                        Last contact
                      </th>
                      <th className="px-2 py-1 text-left font-medium text-slate-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {followUpCandidates.map((c) => (
                      <tr key={c.id} className="border-b last:border-b-0">
                        <td className="px-2 py-1">
                          <Link
                            href={`/dashboard/customers/${c.id}`}
                            className="text-sky-600 hover:underline"
                          >
                            {c.name}
                          </Link>
                        </td>
                        <td className="px-2 py-1">{c.phone ?? "-"}</td>
                        <td className="px-2 py-1">
                          {formatDate(c.lastContactAt)}
                        </td>
                        <td className="px-2 py-1">
                          <Link
                            href={`/dashboard/customers/${c.id}`}
                            className="text-sky-600 hover:underline"
                          >
                            View notes
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      case "staleProspectsCard":
        return (
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            {/* Placeholder for future prospects CRM follow-up list. */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Prospects to follow up
                </h2>
                <p className="text-xs text-slate-500">
                  This will show prospects without recent outreach.
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Prospect tracking is planned as a next-phase CRM feature.
            </p>
          </div>
        );
      case "fuelOverviewCard":
        return (
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            {/* Fuel overview card powered by EIA national diesel price. */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Fuel overview
                </h2>
                <p className="text-xs text-slate-500">
                  U.S. on-highway diesel price (EIA)
                </p>
              </div>
              <span className="text-[10px] uppercase text-slate-400">
                EIA.gov
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-slate-900">
                {fuelInfo.price !== null
                  ? `$${fuelInfo.price.toFixed(2)}`
                  : "N/A"}
              </span>
              <span className="text-xs text-slate-500">per gallon</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {fuelInfo.asOf
                ? `Last updated: ${fuelInfo.asOf}`
                : "Configure EIA_API_KEY to enable live fuel data."}
            </p>
          </div>
        );
      default:
        return null;                                                  // Unknown widget IDs are rendered as nothing (safety fallback).
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Snapshot of your fleet&apos;s revenue, costs, and customers.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Demo view for demo@demo.com</span>
        </div>
      </div>

      {/* Widget grid driven by layout (DB or default), now draggable via react-grid-layout. */}
      <section>
        <DashboardGridClient initialLayout={layout}>
          {/* We render one child per widget ID, in the same order as layout. */}
          {layout.map((item) => (
            <div key={item.id}>
              {/* Each child wrapper gets a stable key that matches the widget ID. */}
              {renderWidget(item.id)}                             {/* Uses our existing renderWidget helper to render the correct card. */}
            </div>
          ))}
        </DashboardGridClient>
      </section>

    </div>
  );
}
