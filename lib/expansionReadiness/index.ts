import { calculateFleetUtilization } from "./fleetUtilization";
import { TimeRange } from "./types";

export async function calculateExpansionReadiness(
  companyId: string,
  range: TimeRange
) {
  const fleetUtilization = await calculateFleetUtilization(companyId, range);

  return {
    fleetUtilization,
    overallScore: fleetUtilization.score.totalPoints,
    readyToExpand: fleetUtilization.score.tier === "STRONG",
  };
}
