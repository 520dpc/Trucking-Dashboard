import { db } from "@/lib/db";
import {
  FleetSizeBand,
  FleetUtilizationMetrics,
  FleetUtilizationScore,
  TimeRange,
} from "./types";

/* ------------------ helpers ------------------ */

const DAY_MS = 86_400_000;

function mean(nums: number[]) {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function stdDev(nums: number[]) {
  const avg = mean(nums);
  const variance =
    nums.reduce((sum, n) => sum + Math.pow(n - avg, 2), 0) / nums.length || 0;
  return Math.sqrt(variance);
}

function resolvePeriod(range: TimeRange, now: Date) {
  if (range === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start,
      end,
      days: end.getDate(),
    };
  }

  const days = range === "90d" ? 90 : range === "180d" ? 180 : 365;
  const end = new Date(now);
  const start = new Date(end.getTime() - (days - 1) * DAY_MS);
  return { start, end, days };
}

function fleetBand(truckCount: number): FleetSizeBand {
  if (truckCount < 10) return "SMALL";
  if (truckCount <= 50) return "MID";
  return "LARGE";
}

function lowUtilThreshold(band: FleetSizeBand) {
  if (band === "SMALL") return 18;
  if (band === "MID") return 16;
  return 15;
}

/* ------------------ main calculator ------------------ */

export async function calculateFleetUtilization(
  companyId: string,
  range: TimeRange
): Promise<{ metrics: FleetUtilizationMetrics; score: FleetUtilizationScore }> {
  const now = new Date();
  const { start, end, days } = resolvePeriod(range, now);

  const trucks = await db.truck.findMany({
    where: { companyId, status: "ACTIVE" },
    select: { id: true },
  });

  const loads = await db.load.findMany({
    where: {
      companyId,
      isSoftDeleted: false,
      truckId: { not: null },
      pickupDate: { lte: end },
      OR: [{ deliveryDate: { gte: start } }, { deliveryDate: null }],
    },
    select: { truckId: true, pickupDate: true, deliveryDate: true },
  });

  const dayMap = new Map<string, Set<string>>();
  trucks.forEach((t) => dayMap.set(t.id, new Set()));

  for (const load of loads) {
    const startDay = new Date(
      Math.max(start.getTime(), load.pickupDate!.getTime())
    );
    const endDay = new Date(
      Math.min(end.getTime(), (load.deliveryDate ?? end).getTime())
    );

    for (
      let d = new Date(startDay);
      d <= endDay;
      d = new Date(d.getTime() + DAY_MS)
    ) {
      dayMap.get(load.truckId!)?.add(d.toISOString().slice(0, 10));
    }
  }

  const revenueDays = Array.from(dayMap.values()).map((s) => s.size);
  const avg = mean(revenueDays);
  const cv = avg === 0 ? 0 : stdDev(revenueDays) / avg;

  const band = fleetBand(trucks.length);
  const lowThreshold = lowUtilThreshold(band);
  const lowCount = revenueDays.filter((d) => d < lowThreshold).length;

  const metrics: FleetUtilizationMetrics = {
    periodStart: start,
    periodEnd: end,
    activeTruckCount: trucks.length,
    avgRevenueDaysPerTruck: avg,
    utilizationRate: avg / days,
    lowUtilThresholdDays: lowThreshold,
    lowUtilTruckCount: lowCount,
    lowUtilPct: trucks.length ? lowCount / trucks.length : 0,
    distribution: {
      ge20: revenueDays.filter((d) => d >= 20).length,
      between18And19: revenueDays.filter((d) => d >= 18 && d <= 19).length,
      between15And17: revenueDays.filter((d) => d >= 15 && d <= 17).length,
      lt15: revenueDays.filter((d) => d < 15).length,
    },
    cv,
    trendDelta: 0, // wired later
  };

  const score: FleetUtilizationScore = {
    totalPoints:
      avg >= 20 ? 25 : avg >= 18 ? 20 : avg >= 15 ? 12 : 5,
    tier:
      avg >= 20
        ? "STRONG"
        : avg >= 18
        ? "HEALTHY"
        : avg >= 15
        ? "CAUTION"
        : "NEEDS_WORK",
    flags: avg >= 23 ? ["VERY_HIGH_UTILIZATION"] : [],
  };

  return { metrics, score };
}
