"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import {
  EXPENSE_CATEGORY_GROUPS,
  ExpenseCategoryGroup,
  toCategoryKey,
} from "@/lib/expenseCategories";

export default function NewExpensePage() {
  const router = useRouter();

  const [categoryGroup, setCategoryGroup] = useState<ExpenseCategoryGroup>("FUEL");
  const [categoryLabel, setCategoryLabel] = useState(
    EXPENSE_CATEGORY_GROUPS.FUEL[0]
  );
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [incurredAt, setIncurredAt] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFreq, setRecurrenceFreq] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  


  function handleGroupChange(nextGroup: ExpenseCategoryGroup) {
    setCategoryGroup(nextGroup);
    const first = EXPENSE_CATEGORY_GROUPS[nextGroup][0];
    setCategoryLabel(first);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await axios.post("/api/expenses", {
        categoryGroup,
        categoryKey: toCategoryKey(categoryLabel),
        label: label || categoryLabel,
        amount,
        description: description || null,
        incurredAt,
        isRecurring,
      });

      router.push("/dashboard/expenses");
      router.refresh();
    } catch (err: any) {
      console.error("[CREATE_EXPENSE_ERROR]", err);
      const message =
        err?.response?.data?.error || "Failed to create expense";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const typeOptions = EXPENSE_CATEGORY_GROUPS[categoryGroup];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            New Expense
          </h1>
          <p className="text-sm text-slate-500">
            Log a cost so you can see true profit.
          </p>
        </div>
        <Link
          href="/dashboard/expenses"
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          Cancel
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border bg-white p-4 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Group */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-700">
              Category group
            </label>
            <select
              value={categoryGroup}
              onChange={(e) =>
                handleGroupChange(e.target.value as ExpenseCategoryGroup)
              }
              className="rounded-md border px-2 py-1.5 text-sm text-slate-700"
            >
              {Object.keys(EXPENSE_CATEGORY_GROUPS).map((group) => (
                <option key={group} value={group}>
                  {group.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-700">
              Type
            </label>
            <select
              value={categoryLabel}
              onChange={(e) => setCategoryLabel(e.target.value)}
              className="rounded-md border px-2 py-1.5 text-sm text-slate-700"
            >
              {typeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Label */}
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-xs font-medium text-slate-700">
              Label (optional)
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="rounded-md border px-2 py-1.5 text-sm outline-none ring-0 focus:border-sky-500"
              placeholder="Pilot diesel, steer tires, insurance payment..."
            />
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-700">
              Amount ($)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-md border px-2 py-1.5 text-sm outline-none ring-0 focus:border-sky-500"
              placeholder="500"
              required
            />
          </div>

          {/* Date */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-700">
              Date incurred
            </label>
            <input
              type="date"
              value={incurredAt}
              onChange={(e) => setIncurredAt(e.target.value)}
              className="rounded-md border px-2 py-1.5 text-sm outline-none ring-0 focus:border-sky-500"
              required
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-xs font-medium text-slate-700">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[60px] rounded-md border px-2 py-1.5 text-sm outline-none ring-0 focus:border-sky-500"
              placeholder="Any extra details you want to remember about this expense..."
            />
          </div>

          {/* Recurring toggle */}
          <div className="flex items-center gap-2 md:col-span-2">
            <input
                id="isRecurring"
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => {
                    const checked = e.target.checked;
                    setIsRecurring(checked);
                    if (checked && !recurrenceFreq) {
                    setRecurrenceFreq("MONTHLY"); // sensible default
                    }
                    if (!checked) {
                    setRecurrenceFreq(null);
                    }
                }}
                className="h-4 w-4 rounded border-slate-400"
            />
            {isRecurring && (
                <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="text-xs font-medium text-slate-700">
                        Recurring frequency
                    </label>
                    <select
                    value={recurrenceFreq ?? "MONTHLY"}
                    onChange={(e) => setRecurrenceFreq(e.target.value)}
                    className="rounded-md border px-2 py-1.5 text-sm text-slate-700"
                    >
                    <option value="WEEKLY">Weekly</option>
                    <option value="BIWEEKLY">Biweekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="ANNUAL">Annual</option>
                    </select>
                </div>
            )}

            <label
              htmlFor="isRecurring"
              className="text-xs text-slate-700"
            >
              This is a recurring expense (lease, subscription, insurance, etc.)
            </label>
          </div>
        </div>

        {error && (
          <p className="text-xs text-rose-600">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Link
            href="/dashboard/expenses"
            className="rounded-md border px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 disabled:opacity-60"
          >
            {isSubmitting ? "Saving..." : "Save Expense"}
          </button>
        </div>
      </form>
    </div>
  );
}
