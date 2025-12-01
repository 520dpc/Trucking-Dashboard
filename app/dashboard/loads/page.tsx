import Link from "next/link";
import { db } from "@/lib/db";

export default async function LoadsPage() {
  const loads = await db.load.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customer: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Loads</h1>
        <p className="text-sm text-slate-500">
          Track revenue, miles, and key costs for each load.
        </p>
      </div>

      {loads.length === 0 ? (
        <p className="text-sm text-slate-500">
          No loads yet. Click &quot;New Load&quot; to add your first one.
        </p>
      ) : (
        <div className="space-y-3">
          {/* Mobile card list */}
          <div className="space-y-3 sm:hidden">
            {loads.map((load) => {
              const totalOther =
                (load.lumper ?? 0) +
                (load.tolls ?? 0) +
                (load.otherCosts ?? 0);
              const estProfit = load.rate - (load.fuelCost + totalOther);

              return (
                <Link
                  key={load.id}
                  href={`/dashboard/loads/${load.id}`}
                  className="block rounded-lg border bg-white p-3 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm text-slate-900">
                      {load.customer?.name || load.broker || "Unknown"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(load.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    ${load.rate} · {load.miles} miles
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Fuel: ${load.fuelCost} · Other: ${totalOther}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Est. profit:{" "}
                    <span
                      className={
                        estProfit >= 0
                          ? "font-semibold text-emerald-600"
                          : "font-semibold text-rose-600"
                      }
                    >
                      ${estProfit}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Desktop / tablet table */}
          <div className="hidden sm:block overflow-x-auto rounded-lg border bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">
                    Customer / Broker
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">
                    Rate
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">
                    Miles
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">
                    Fuel
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">
                    Other Costs
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">
                    Est. Profit
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">
                    Date
                  </th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {loads.map((load) => {
                  const totalOther =
                    (load.lumper ?? 0) +
                    (load.tolls ?? 0) +
                    (load.otherCosts ?? 0);
                  const estProfit = load.rate - (load.fuelCost + totalOther);

                  return (
                    <tr key={load.id} className="border-t last:border-b">
                      <td className="px-4 py-2 whitespace-nowrap">
                        {load.customer?.name || load.broker || "Unknown"}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        ${load.rate}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {load.miles}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        ${load.fuelCost}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        ${totalOther}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span
                          className={
                            estProfit >= 0
                              ? "rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                              : "rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700"
                          }
                        >
                          ${estProfit}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {new Date(load.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Link
                          href={`/dashboard/loads/${load.id}`}
                          className="text-sky-700 hover:underline"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Load Button */}
      <div className="flex justify-end pt-6">
        <Link
          href="/dashboard/loads/new"
          className="inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 transition"
        >
          + New Load
        </Link>
      </div>
    </div>
  );
}
