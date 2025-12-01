"use client";

import { useRouter, useSearchParams } from "next/navigation";

const OPTIONS = [
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 90 days", value: "90" },
  { label: "Last 180 days", value: "180" },
  { label: "Last 365 days", value: "365" },
  { label: "All time", value: "all" },
];

export function ExpenseFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const current = searchParams.get("range") || "30";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "30") {
      params.delete("range");
    } else {
      params.set("range", value);
    }

    const query = params.toString();
    const href = query ? `/dashboard/expenses?${query}` : "/dashboard/expenses";
    router.push(href);
  }

  return (
    <select
      value={current}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-md border px-2 py-1 text-xs text-slate-700"
    >
      {OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
