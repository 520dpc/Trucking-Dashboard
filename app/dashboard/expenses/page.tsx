import Link from "next/link";
import { db } from "@/lib/db";
import { ExpenseFilters } from "./ExpenseFilters";

type ExpensesPageProps = {
  searchParams?: {
    range?: string | string[];
  };
};

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  // Normalize range from searchParams (can be string or string[])
  const rawRange = Array.isArray(searchParams?.range)
    ? searchParams?.range[0]
    : searchParams?.range;

  const range = rawRange ?? "30";

  let fromDate: Date | null = null;

  if (range !== "all") {
    const days = parseInt(range, 10);
    if (!Number.isNaN(days)) {
      fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
    }
  }

  const where: any = {};

  if (fromDate) {
    where.incurredAt = { gte: fromDate };
  }

  const expenses = await db.expense.findMany({
    where,
    orderBy: { incurredAt: "desc" },
  });

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Expenses
          </h1>
          <p className="text-sm text-slate-500">
            Track your costs over time by category.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExpenseFilters />
          <Link
            href="/dashboard/expenses/new"
            className="inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 transition"
          >
            + New Expense
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-xl border bg-slate-50 p-4 text-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Total in this period
        </p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">
          ${totalAmount}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Based on expenses incurred in the selected time window.
        </p>
      </div>

      {/* List or empty */}
      {expenses.length === 0 ? (
        <p className="text-sm text-slate-500">
          No expenses in this period. Add a new expense to get started.
        </p>
      ) : (
        <div className="space-y-3">
          {/* Mobile cards */}
          <div className="space-y-3 sm:hidden">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className="rounded-lg border bg-white p-3 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-slate-900">
                    {expense.label || expense.categoryKey}
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(expense.incurredAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {expense.categoryGroup} · {expense.categoryKey}
                </div>
                <div className="mt-1 text-sm font-semibold text-rose-600">
                  -${expense.amount}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto rounded-lg border bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">
                    Label
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">
                    Group
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">
                    Type
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">
                    Date
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id} className="border-t last:border-b">
                    <td className="px-4 py-2 max-w-xs truncate">
                      {expense.label || "-"}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {expense.categoryGroup}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {expense.categoryKey}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {new Date(expense.incurredAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-right text-rose-600">
                      -${expense.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
