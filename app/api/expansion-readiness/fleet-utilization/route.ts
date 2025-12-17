import { NextRequest, NextResponse } from "next/server"; // Imports Next.js request/response helpers. \\ Needed to read query params and return JSON.
import { db } from "@/lib/db"; // Imports Prisma client. \\ Needed to query trucks/loads from Postgres.
import { getDemoTenant } from "@/lib/demoTenant"; // Gets demo company/user context. \\ Ensures we scope all calculations to the correct tenant.

type RangeKey = "month" | "90d" | "180d" | "1y"; // Allowed range options. \\ Keeps API inputs predictable.

function toYMD(d: Date) { // Converts Date -> YYYY-MM-DD. \\ Used to store unique “revenue days” in sets.
  const yyyy = d.getUTCFullYear(); // UTC year. \\ Avoids timezone drift across machines.
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0"); // UTC month 01-12. \\ Keeps formatting stable.
  const dd = String(d.getUTCDate()).padStart(2, "0"); // UTC day 01-31. \\ Keeps formatting stable.
  return `${yyyy}-${mm}-${dd}`; // Final YMD string. \\ Used as a day key inside a Set.
}

function startOfMonthUTC(d: Date) { // Computes first day of month in UTC. \\ Used for calendar month boundaries.
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)); // YYYY-MM-01 UTC. \\ Prevents timezone surprises.
}

function endOfMonthUTC(d: Date) { // Computes last day of month in UTC. \\ Used for calendar month boundaries.
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999)); // Last ms of month. \\ Includes entire day.
}

function daysInclusive(start: Date, end: Date) { // Counts days inclusive. \\ Needed for “available days” denominator.
  const ms = 24 * 60 * 60 * 1000; // Milliseconds per day. \\ Converts time diff into days.
  const a = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()); // Normalize to midnight UTC. \\ Prevents partial-day issues.
  const b = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()); // Normalize to midnight UTC. \\ Prevents partial-day issues.
  return Math.floor((b - a) / ms) + 1; // Inclusive day count. \\ Matches trucking definition of “days on load”.
}

function resolveRange(range: RangeKey) { // Converts range key into concrete dates. \\ Ensures all calculations share the same window.
  const now = new Date(); // Current time. \\ Base reference for range computation.
  if (range === "month") { // Calendar month option. \\ Best for “monthly usage” as you requested.
    const start = startOfMonthUTC(now); // First day of current month. \\ Month window start.
    const end = endOfMonthUTC(now); // Last day of current month. \\ Month window end.
    return { start, end }; // Return resolved range. \\ Used in DB filters and denominators.
  }
  const daysBack = range === "90d" ? 90 : range === "180d" ? 180 : 365; // Maps range key to day count. \\ Keeps logic simple.
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)); // End today UTC. \\ Stable cutoff.
  const start = new Date(end.getTime() - (daysBack - 1) * 24 * 60 * 60 * 1000); // Start inclusive. \\ Ensures exactly N days.
  return { start, end }; // Return resolved window. \\ Used for “rolling” ranges.
}

function thresholdByFleetSize(truckCount: number) { // Picks low-util threshold by fleet size. \\ Keeps scoring fair across different company sizes.
  if (truckCount < 10) return 18; // Small fleets need higher utilization to justify expansion. \\ Less slack capacity available.
  if (truckCount <= 50) return 16; // Mid fleets get moderate threshold. \\ Dispatch smoothing helps.
  return 15; // Large fleets can tolerate slightly lower days/truck. \\ More redundancy and lane diversity.
}

function mean(nums: number[]) { // Mean helper. \\ Used for avg revenue days/truck.
  if (nums.length === 0) return 0; // Guard. \\ Avoids NaN.
  return nums.reduce((a, b) => a + b, 0) / nums.length; // Average. \\ Core KPI.
}

function stdDev(nums: number[]) { // Standard deviation helper. \\ Used for consistency calculation.
  if (nums.length === 0) return 0; // Guard. \\ Avoids NaN.
  const m = mean(nums); // Mean. \\ Needed for variance.
  const v = mean(nums.map((n) => (n - m) ** 2)); // Variance. \\ Average squared deviation.
  return Math.sqrt(v); // Std dev. \\ Converts variance to same unit (days).
}

function scoreConsistencyCV(cv: number | null) { // Converts CV to a penalty. \\ Implements our agreed “penalty only” design.
  if (cv === null) return { penalty: 0, band: "unknown" as const }; // If mean=0, CV invalid. \\ Don’t punish on missing data.
  if (cv <= 0.2) return { penalty: 0, band: "strong" as const }; // Tight distribution. \\ Healthy consistency.
  if (cv <= 0.35) return { penalty: -2, band: "caution" as const }; // Mild unevenness. \\ Some trucks lag.
  if (cv <= 0.5) return { penalty: -4, band: "poor" as const }; // Significant unevenness. \\ Risk when scaling.
  return { penalty: -5, band: "very_poor" as const }; // Severe unevenness. \\ Expansion likely creates idle assets.
}

function scoreTrend(slope: number) { // Converts slope to points and label. \\ Implements capped ±3 scoring.
  if (Math.abs(slope) < 0.5) return { points: 0, label: "FLAT" as const }; // Noise. \\ Don’t overreact.
  if (slope >= 1.0) return { points: 3, label: "IMPROVING_STRONG" as const }; // Strong positive. \\ Momentum supports scaling.
  if (slope >= 0.5) return { points: 1, label: "IMPROVING_MILD" as const }; // Mild positive. \\ Good sign but not decisive.
  if (slope <= -1.0) return { points: -3, label: "DECLINING_STRONG" as const }; // Strong negative. \\ Big expansion risk.
  return { points: -1, label: "DECLINING_MILD" as const }; // Mild negative. \\ Caution signal.
}

function clamp(n: number, min: number, max: number) { // Bounds a number. \\ Keeps scores in valid ranges.
  return Math.max(min, Math.min(max, n)); // Clamp. \\ Prevents score overflow.
}

async function avgRevenueDaysPerTruckForMonth(companyId: string, monthStart: Date) { // Computes avg revenue days/truck for a calendar month. \\ Needed for trend.
  const monthEnd = endOfMonthUTC(monthStart); // End of that month. \\ Month window.
  const trucks = await db.truck.findMany({ where: { companyId }, select: { id: true } }); // All trucks. \\ You required all trucks count.
  const truckIds = trucks.map((t) => t.id); // Extract IDs. \\ Used to build array output.
  const map = new Map<string, Set<string>>(); // truckId -> set of YYYY-MM-DD. \\ Prevents double-counting days.
  for (const id of truckIds) map.set(id, new Set()); // Initialize sets with zero baseline. \\ Ensures zeros are included.

  const loads = await db.load.findMany({ // Loads in the month window. \\ Source of revenue-day truth.
    where: {
      companyId, // Tenant scope. \\ Prevents cross-company contamination.
      isSoftDeleted: false, // Exclude deleted. \\ Keeps analytics accurate.
      truckId: { not: null }, // Only truck-linked loads. \\ Needed to attribute revenue days.
      OR: [
        { pickupDate: { gte: monthStart, lte: monthEnd } }, // Loads with pickup in month. \\ Partial overlap support.
        { deliveryDate: { gte: monthStart, lte: monthEnd } }, // Loads with delivery in month. \\ Partial overlap support.
        {
          AND: [
            { pickupDate: { lte: monthStart } }, // Pickup before month. \\ Load spans into month.
            { deliveryDate: { gte: monthEnd } }, // Delivery after month. \\ Load spans across entire month.
          ],
        },
      ],
    },
    select: { truckId: true, pickupDate: true, deliveryDate: true }, // Only fields needed. \\ Keeps query light.
  });

  for (const load of loads) { // Iterate each load. \\ Expand into daily keys.
    const truckId = load.truckId as string; // Non-null due to filter. \\ Needed as map key.
    const set = map.get(truckId); // Get day set. \\ Might be undefined if truck was deleted.
    if (!set) continue; // Skip unknown truck. \\ Defensive coding for data drift.

    const start = load.pickupDate ?? load.deliveryDate; // Start day. \\ Best effort if one date missing.
    const end = load.deliveryDate ?? load.pickupDate; // End day. \\ Best effort if one date missing.
    if (!start || !end) continue; // If both missing, can’t count days. \\ Avoids fake metrics.

    const s = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())); // Normalize to UTC day. \\ Day-level accuracy.
    const e = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())); // Normalize to UTC day. \\ Day-level accuracy.
    const dir = s <= e ? 1 : -1; // Handle reversed dates. \\ Prevents infinite loops if data is wrong.

    for (let d = new Date(s); dir === 1 ? d <= e : d >= e; d = new Date(d.getTime() + dir * 86400000)) { // Walk day-by-day inclusive. \\ Revenue day definition.
      const key = toYMD(d); // Convert to YYYY-MM-DD. \\ Stable set key.
      if (d >= monthStart && d <= monthEnd) set.add(key); // Only count days inside month. \\ Avoids bleeding into adjacent months.
    }
  }

  const revenueDaysPerTruck = truckIds.map((id) => map.get(id)?.size ?? 0); // Convert sets to counts, include zeros. \\ Matches your requirement.
  const avg = mean(revenueDaysPerTruck); // Average revenue days per truck. \\ Trend series value.
  return { avg, revenueDaysPerTruck }; // Return both for possible debugging. \\ Trend needs only avg now.
}

export async function GET(req: NextRequest) { // Handles GET /api/expansion-readiness/fleet-utilization. \\ Returns metrics + score breakdown.
  try {
    const { company } = await getDemoTenant(); // Resolve tenant. \\ Required for multi-tenant scoping.
    const url = new URL(req.url); // Parse URL. \\ Used for reading query params.
    const range = (url.searchParams.get("range") as RangeKey) ?? "month"; // Read range, default month. \\ Matches your “monthly default” rule.
    const { start, end } = resolveRange(range); // Resolve date window. \\ Standardizes downstream math.
    const daysInPeriod = daysInclusive(start, end); // Inclusive period length. \\ Used for availableDays.

    const trucks = await db.truck.findMany({ where: { companyId: company.id }, select: { id: true, unitNumber: true, status: true } }); // All trucks. \\ You required all trucks count.
    const fleetTruckCount = trucks.length; // Fleet size. \\ Used for denominators and thresholds.

    const lowUtilThresholdDays = thresholdByFleetSize(fleetTruckCount); // Fleet-size threshold. \\ Drives Pillar 3 low-util definition.

    const revenueDaySets = new Map<string, Set<string>>(); // truckId -> day set. \\ Prevents double counting.
    for (const t of trucks) revenueDaySets.set(t.id, new Set()); // Initialize sets for every truck. \\ Ensures 0-day trucks are included.

    const loads = await db.load.findMany({ // Loads that overlap the period and have truckId. \\ Used to compute revenue days.
      where: {
        companyId: company.id, // Tenant scope. \\ Safety.
        isSoftDeleted: false, // Exclude deleted. \\ Accuracy.
        truckId: { not: null }, // Only truck-linked. \\ Attribution.
        OR: [
          { pickupDate: { gte: start, lte: end } }, // Pickup inside window. \\ Overlap support.
          { deliveryDate: { gte: start, lte: end } }, // Delivery inside window. \\ Overlap support.
          {
            AND: [
              { pickupDate: { lte: start } }, // Pickup before start. \\ Spanning load.
              { deliveryDate: { gte: end } }, // Delivery after end. \\ Spanning load.
            ],
          },
        ],
      },
      select: { truckId: true, pickupDate: true, deliveryDate: true }, // Only what we need. \\ Keeps query light.
    });

    for (const load of loads) { // Expand each load into daily keys. \\ Implements “revenue day” definition.
      const truckId = load.truckId as string; // Non-null due to filter. \\ Map key.
      const set = revenueDaySets.get(truckId); // Get set for this truck. \\ Where we store unique days.
      if (!set) continue; // Defensive. \\ If truck got deleted, skip.

      const startDate = load.pickupDate ?? load.deliveryDate; // Start of load. \\ Best effort with partial data.
      const endDate = load.deliveryDate ?? load.pickupDate; // End of load. \\ Best effort with partial data.
      if (!startDate || !endDate) continue; // If missing both, skip. \\ Avoid fake counts.

      const s = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate())); // Normalize to day. \\ Accurate day expansion.
      const e = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate())); // Normalize to day. \\ Accurate day expansion.
      const dir = s <= e ? 1 : -1; // Handle reversed dates. \\ Prevent loops if data bad.

      for (let d = new Date(s); dir === 1 ? d <= e : d >= e; d = new Date(d.getTime() + dir * 86400000)) { // Walk inclusive days. \\ Revenue day definition.
        if (d < start || d > end) continue; // Only count inside window. \\ Avoid off-window days.
        set.add(toYMD(d)); // Add unique day key. \\ Prevent double counting.
      }
    }

    const revenueDaysPerTruck = trucks.map((t) => revenueDaySets.get(t.id)?.size ?? 0); // Convert sets to counts. \\ Includes zeros.
    const totalRevenueDays = revenueDaysPerTruck.reduce((a, b) => a + b, 0); // Sum across fleet. \\ Needed for overall utilization.
    const availableDays = fleetTruckCount * daysInPeriod; // Total capacity days. \\ Denominator for pillar 1.
    const overallUtilRate = availableDays > 0 ? totalRevenueDays / availableDays : 0; // Utilization ratio. \\ Pillar 1 output.

    const avgRevenueDaysPerTruck = mean(revenueDaysPerTruck); // Average days per truck. \\ Pillar 2 output.
    const lowUtilCount = revenueDaysPerTruck.filter((d) => d < lowUtilThresholdDays).length; // Count below threshold. \\ Pillar 3.
    const lowUtilPct = fleetTruckCount > 0 ? lowUtilCount / fleetTruckCount : 0; // Percentage low util. \\ Pillar 3 normalized.

    const std = stdDev(revenueDaysPerTruck); // Std dev of revenue days. \\ Used for CV.
    const cv = avgRevenueDaysPerTruck > 0 ? std / avgRevenueDaysPerTruck : null; // CV (std/mean). \\ Pillar 4 metric.
    const consistency = scoreConsistencyCV(cv); // Converts CV to penalty. \\ Pillar 4 scoring.

    const now = new Date(); // Current date. \\ Used to compute last 3 months for trend.
    const m3Start = startOfMonthUTC(now); // Current month start. \\ Month 3 in trend.
    const m2Start = startOfMonthUTC(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))); // Previous month start. \\ Month 2 in trend.
    const m1Start = startOfMonthUTC(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1))); // Two months ago start. \\ Month 1 in trend.

    const m1 = await avgRevenueDaysPerTruckForMonth(company.id, m1Start); // Month 1 avg days/truck. \\ Trend baseline.
    const m2 = await avgRevenueDaysPerTruckForMonth(company.id, m2Start); // Month 2 avg days/truck. \\ Trend midpoint.
    const m3 = await avgRevenueDaysPerTruckForMonth(company.id, m3Start); // Month 3 avg days/truck. \\ Trend latest.

    const slope = (m3.avg - m1.avg) / 2; // Days/month slope. \\ Our agreed “meaningful change” unit.
    const trend = scoreTrend(slope); // Trend points + label. \\ Pillar 5 scoring + momentum.

    // ---- Scoring placeholders for Pillars 1–3 (we can tighten these next) ---- \\ Keeps the route wired while we tune thresholds.
    const p1Points = 8; // Placeholder. \\ We will replace with real tier mapping (needs work/healthy/strong) next.
    const p2Points = 8; // Placeholder. \\ We will replace with real tier mapping (needs work/healthy/strong) next.
    const p3Points = 8; // Placeholder. \\ We will replace with real tier mapping based on lowUtilPct next.

    const rawScore = p1Points + p2Points + p3Points + consistency.penalty + trend.points; // Sum of pillar points. \\ Total Fleet Utilization score.
    const fleetUtilScore = clamp(rawScore, 0, 25); // Clamp to 0..25. \\ Category max is 25%.

    return NextResponse.json({ // Return structured JSON for UI. \\ Stable contract for frontend widgets.
      range, // Echo range used. \\ Makes debugging easier.
      window: { start, end, daysInPeriod }, // Window metadata. \\ Explains denominators.
      fleet: {
        truckCount: fleetTruckCount, // Fleet size. \\ Used in multiple pillar calcs.
        lowUtilThresholdDays, // Threshold used. \\ Explains “low utilization” logic.
      },
      pillars: {
        overallUtilization: {
          totalRevenueDays, // Sum of revenue days. \\ Numerator for pillar 1.
          availableDays, // Capacity days. \\ Denominator for pillar 1.
          utilizationRate: overallUtilRate, // Ratio output. \\ Primary utilization KPI.
        },
        revenueDaysPerTruck: {
          avgRevenueDaysPerTruck, // Fleet average days/truck. \\ Pillar 2 headline.
          byTruck: trucks.map((t, idx) => ({
            truckId: t.id, // Truck ID. \\ Used for drill-down linking.
            unitNumber: t.unitNumber, // Human readable unit. \\ UI display.
            status: t.status, // Status. \\ Helps explain low utilization.
            revenueDays: revenueDaysPerTruck[idx], // Computed days in window. \\ Drill-down value.
            isLowUtil: revenueDaysPerTruck[idx] < lowUtilThresholdDays, // Flag. \\ Pillar 3 classification.
          })),
        },
        lowUtilization: {
          lowUtilCount, // Count of low-util trucks. \\ Pillar 3 signal.
          lowUtilPct, // Percent low-util trucks. \\ Normalized risk indicator.
        },
        consistency: {
          stdDev: std, // Std dev days/truck. \\ Debug + transparency.
          cv, // Coefficient of variation. \\ Official pillar 4 metric.
          penalty: consistency.penalty, // Score impact. \\ Penalty-only as agreed.
          band: consistency.band, // Category label. \\ UI-friendly.
        },
        trend: {
          months: [
            { monthStart: m1Start, avgRevenueDaysPerTruck: m1.avg }, // Month 1. \\ Trend baseline.
            { monthStart: m2Start, avgRevenueDaysPerTruck: m2.avg }, // Month 2. \\ Trend midpoint.
            { monthStart: m3Start, avgRevenueDaysPerTruck: m3.avg }, // Month 3. \\ Trend latest.
          ],
          slopeDaysPerMonth: slope, // Slope in days/month. \\ Your requested unit.
          points: trend.points, // Score effect. \\ Capped ±3.
          momentum: trend.label, // UI indicator. \\ Separate from score if you want.
        },
      },
      score: {
        fleetUtilScore, // Final 0..25 score. \\ Category contribution.
        breakdown: {
          pillar1: p1Points, // Placeholder scoring. \\ We’ll replace next.
          pillar2: p2Points, // Placeholder scoring. \\ We’ll replace next.
          pillar3: p3Points, // Placeholder scoring. \\ We’ll replace next.
          pillar4: consistency.penalty, // Real scoring. \\ Already finalized.
          pillar5: trend.points, // Real scoring. \\ Already finalized.
        },
      },
      notes: {
        missingDatesBehavior:
          "Revenue days require pickupDate/deliveryDate. Loads missing both are ignored for utilization days.", // Transparency note. \\ Prevents confusion.
      },
    }); // End JSON response. \\ Returned to frontend.
  } catch (err) {
    console.error("[FLEET_UTILIZATION_ROUTE_ERROR]", err); // Log server error. \\ Debugging.
    return NextResponse.json({ error: "Failed to compute fleet utilization" }, { status: 500 }); // Return 500. \\ Safe failure behavior.
  }
}
