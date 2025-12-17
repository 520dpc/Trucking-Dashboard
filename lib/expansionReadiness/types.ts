export type TimeRange = "month" | "90d" | "180d" | "365d";

export type FleetSizeBand = "SMALL" | "MID" | "LARGE";

export type TruckRevenueDays = {
  truckId: string;
  revenueDays: number;
};

export type DistributionBuckets = {
  ge20: number;
  between18And19: number;
  between15And17: number;
  lt15: number;
};

export type FleetUtilizationMetrics = {
  periodStart: Date;
  periodEnd: Date;
  activeTruckCount: number;

  avgRevenueDaysPerTruck: number;
  utilizationRate: number;

  lowUtilThresholdDays: number;
  lowUtilTruckCount: number;
  lowUtilPct: number;

  distribution: DistributionBuckets;
  cv: number;

  trendDelta: number;
};

export type FleetUtilizationScore = {
  totalPoints: number; // 0–25
  tier: "NEEDS_WORK" | "CAUTION" | "HEALTHY" | "STRONG";
  flags: string[];
};
