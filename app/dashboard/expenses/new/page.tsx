"use client"; // Marks this file as a Client Component so we can use hooks, local state, and handle form events in the browser.

import { FormEvent, useState } from "react"; // Imports React types and hooks; useState manages form state, FormEvent types the submit handler.
import { useRouter } from "next/navigation"; // Imports the Next.js router hook so we can navigate and refresh after creating an expense.
import axios from "axios"; // Axios is used to send HTTP requests from the client to our API routes.
import Link from "next/link"; // Next.js Link enables client-side navigation between routes.
import {
  EXPENSE_CATEGORY_GROUPS, // Map of category groups to lists of category labels (e.g., FUEL -> ["Diesel", "DEF"]).
  ExpenseCategoryGroup, // Type that constrains categoryGroup to the allowed group keys.
  toCategoryKey, // Helper that turns a human label into a normalized key (e.g. "Truck Insurance" -> "TRUCK_INSURANCE").
} from "@/lib/expenseCategories"; // Imports expense category helpers used across the app.

export default function NewExpensePage() { // Default export: React component for the `/dashboard/expenses/new` page.
  const router = useRouter(); // Gets router instance to redirect back to the expenses list after saving.

  const [categoryGroup, setCategoryGroup] = useState<ExpenseCategoryGroup>("FUEL"); // Tracks which group of expenses is selected; defaults to FUEL.
  const [categoryLabel, setCategoryLabel] = useState( // Tracks the specific expense label within the selected group.
    EXPENSE_CATEGORY_GROUPS.FUEL[0] // Uses the first label from the FUEL group as the initial type.
  );
  const [label, setLabel] = useState(""); // Optional custom label typed by the user; overrides categoryLabel if provided.
  const [amount, setAmount] = useState(""); // Tracks the amount input as a string; converted to number on submit.
  const [description, setDescription] = useState(""); // Optional description field for extra context about the expense.
  const [incurredAt, setIncurredAt] = useState( // Tracks the date the expense was incurred.
    new Date().toISOString().slice(0, 10) // Initializes to today's date in YYYY-MM-DD format, which <input type="date" /> expects.
  );
  const [isRecurring, setIsRecurring] = useState(false); // Boolean flag indicating whether this expense recurs (rent, insurance, etc.).
  const [recurrenceFreq, setRecurrenceFreq] = useState<string | null>("MONTHLY"); // Tracks recurrence frequency and defaults to MONTHLY so state matches the UI.
  const [isSubmitting, setIsSubmitting] = useState(false); // Tracks whether the form is currently submitting to disable the button and show loading state.
  const [error, setError] = useState<string | null>(null); // Holds any error message to display under the form when something goes wrong.

  function handleGroupChange(nextGroup: ExpenseCategoryGroup) { // Handles when the user changes the category group dropdown.
    setCategoryGroup(nextGroup); // Updates the selected group in state so the type options update.
    const first = EXPENSE_CATEGORY_GROUPS[nextGroup][0]; // Picks the first label in the new group's list as a sensible default.
    setCategoryLabel(first); // Updates the selected category label to that first option.
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) { // Handles form submission when the user clicks "Save Expense".
    e.preventDefault(); // Prevents the browser's default form submit behavior (page reload).
    setError(null); // Clears any previous error message so we only show fresh errors.
    setIsSubmitting(true); // Enables submitting state so the button can be disabled and text changed to "Saving...".

    try {
      const parsedAmount = Number(amount); // Converts the string amount from the input into a number for validation and backend.
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) { // Validates that the amount is a positive, finite number.
        setError("Amount must be a positive number."); // Shows a user-friendly error if the amount is invalid.
        setIsSubmitting(false); // Turns off loading state since we are aborting the submit.
        return; // Stops execution so we don't call the API with bad data.
      }

      const incurredDate = incurredAt ? new Date(incurredAt) : new Date(); // Converts the incurredAt string into a Date object (or now if missing).
      if (Number.isNaN(incurredDate.getTime())) { // Checks if the date is invalid (e.g., malformed string).
        setError("Please provide a valid date for Date incurred."); // Shows an error message for invalid date.
        setIsSubmitting(false); // Turns off loading state since we can't submit.
        return; // Stops the submit handler.
      }

      const recurrenceToSend = isRecurring // Determines what value to send for recurrenceFreq based on the toggle.
        ? (recurrenceFreq ?? "MONTHLY") // If recurring, ensure we always send a real string; default to "MONTHLY" if somehow null.
        : null; // If not recurring, we send null so the backend knows this is a one-time expense.

      await axios.post("/api/expenses", { // Sends a POST request to the /api/expenses route to create a new expense.
        categoryGroup, // Includes the currently selected category group (e.g., "FUEL", "MAINTENANCE").
        categoryKey: toCategoryKey(categoryLabel), // Sends a normalized key derived from the category label for stable analytics.
        label: label || categoryLabel, // Uses the custom label if provided, otherwise falls back to the category label.
        amount: parsedAmount, // Sends the validated numeric amount so it fits the Int field in Prisma.
        description: description || null, // Sends description text or null if the field is empty.
        incurredAt: incurredDate.toISOString(), // Serializes the Date into ISO string so the backend can parse it consistently.
        isRecurring, // Sends whether this expense is recurring (true/false).
        recurrenceFreq: recurrenceToSend, // ✅ Sends a non-null recurrence frequency when recurring, otherwise null.
      });

      router.push("/dashboard/expenses"); // Navigates back to the expenses list page after a successful creation.
      router.refresh(); // Asks Next.js to refresh the data on the expenses list so the new record appears.
    } catch (err: any) {
      console.error("[CREATE_EXPENSE_ERROR]", err); // Logs the error to the browser console for debugging during development.
      const message =
        err?.response?.data?.error || "Failed to create expense"; // Extracts the backend error message if available, otherwise uses a generic one.
      setError(message); // Stores the error message so it appears under the form.
    } finally {
      setIsSubmitting(false); // Always turns off loading state after the request completes, success or failure.
    }
  }

  const typeOptions = EXPENSE_CATEGORY_GROUPS[categoryGroup]; // Computes the list of type options based on the currently selected category group.

  return (
    <div className="space-y-6"> {/* Outer wrapper for the New Expense page with vertical spacing between header and form. */}
      <div className="flex items-center justify-between"> {/* Header row: title on the left, Cancel link on the right. */}
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            New Expense {/* Main heading for the page. */}
          </h1>
          <p className="text-sm text-slate-500">
            Log a cost so you can see true profit. {/* Subtitle explaining why this matters. */}
          </p>
        </div>
        <Link
          href="/dashboard/expenses" // Clicking Cancel navigates back to the expenses list without saving.
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          Cancel {/* Text label for the Cancel action. */}
        </Link>
      </div>

      <form
        onSubmit={handleSubmit} // Hooks the form submit event to our handleSubmit function.
        className="space-y-4 rounded-xl border bg-white p-4 shadow-sm" // Styles the form container with border, padding, and shadow.
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2"> {/* Grid layout for form fields; becomes two columns on medium screens. */}
          {/* Group */}
          <div className="flex flex-col gap-1"> {/* Column for the category group dropdown. */}
            <label className="text-xs font-medium text-slate-700">
              Category group {/* Label for the category group field. */}
            </label>
            <select
              value={categoryGroup} // Binds the select value to the current categoryGroup state.
              onChange={(e) =>
                handleGroupChange(e.target.value as ExpenseCategoryGroup) // Updates group and resets category label when user changes group.
              }
              className="rounded-md border px-2 py-1.5 text-sm text-slate-700"
            >
              {Object.keys(EXPENSE_CATEGORY_GROUPS).map((group) => ( // Iterates over each group key to render an option.
                <option key={group} value={group}>
                  {group.replace(/_/g, " ")} {/* Displays group key with spaces instead of underscores for readability. */}
                </option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div className="flex flex-col gap-1"> {/* Column for the category type dropdown. */}
            <label className="text-xs font-medium text-slate-700">
              Type {/* Label for the expense type field. */}
            </label>
            <select
              value={categoryLabel} // Binds the select to the selected category label.
              onChange={(e) => setCategoryLabel(e.target.value)} // Updates categoryLabel when user selects a different type.
              className="rounded-md border px-2 py-1.5 text-sm text-slate-700"
            >
              {typeOptions.map((opt) => ( // Renders option for each type within the current group.
                <option key={opt} value={opt}>
                  {opt} {/* Displays the human-readable type label. */}
                </option>
              ))}
            </select>
          </div>

          {/* Label */}
          <div className="flex flex-col gap-1 md:col-span-2"> {/* Full-width row for optional custom label. */}
            <label className="text-xs font-medium text-slate-700">
              Label (optional) {/* Label for custom label field. */}
            </label>
            <input
              type="text"
              value={label} // Binds input to label state.
              onChange={(e) => setLabel(e.target.value)} // Updates label state as user types.
              className="rounded-md border px-2 py-1.5 text-sm outline-none ring-0 focus:border-sky-500"
              placeholder="Pilot diesel, steer tires, insurance payment..." // Example placeholder to guide the user.
            />
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-1"> {/* Column for amount input. */}
            <label className="text-xs font-medium text-slate-700">
              Amount ($) {/* Label for amount field. */}
            </label>
            <input
              type="number"
              value={amount} // Binds the input value to amount state.
              onChange={(e) => setAmount(e.target.value)} // Updates amount string on each keystroke.
              className="rounded-md border px-2 py-1.5 text-sm outline-none ring-0 focus:border-sky-500"
              placeholder="500" // Example amount placeholder.
              required // Makes this field required so we don't submit without an amount.
            />
          </div>

          {/* Date */}
          <div className="flex flex-col gap-1"> {/* Column for date input. */}
            <label className="text-xs font-medium text-slate-700">
              Date incurred {/* Label for incurredAt field. */}
            </label>
            <input
              type="date"
              value={incurredAt} // Binds the date input to incurredAt state.
              onChange={(e) => setIncurredAt(e.target.value)} // Updates incurredAt when the user picks a date.
              className="rounded-md border px-2 py-1.5 text-sm outline-none ring-0 focus:border-sky-500"
              required // Makes date required so the record always has an incurred date.
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1 md:col-span-2"> {/* Full-width row for optional description text. */}
            <label className="text-xs font-medium text-slate-700">
              Description (optional) {/* Label for description textarea. */}
            </label>
            <textarea
              value={description} // Binds textarea to description state.
              onChange={(e) => setDescription(e.target.value)} // Updates description as user types.
              className="min-h-[60px] rounded-md border px-2 py-1.5 text-sm outline-none ring-0 focus:border-sky-500"
              placeholder="Any extra details you want to remember about this expense..." // Example of what to put here.
            />
          </div>

          {/* Recurring toggle */}
          <div className="flex items-center gap-2 md:col-span-2"> {/* Row containing the recurring checkbox, optional select, and label. */}
            <input
              id="isRecurring"
              type="checkbox"
              checked={isRecurring} // Binds checkbox checked state to isRecurring.
              onChange={(e) => {
                const checked = e.target.checked; // Reads the new checked state from the event.
                setIsRecurring(checked); // Updates isRecurring flag accordingly.
                if (checked && !recurrenceFreq) { // If turning recurring ON and no frequency set yet...
                  setRecurrenceFreq("MONTHLY"); // ...set a sensible default to MONTHLY so we don't send null.
                }
                if (!checked) { // If turning recurring OFF...
                  setRecurrenceFreq(null); // ...clear the recurrenceFreq since it's no longer used.
                }
              }}
              className="h-4 w-4 rounded border-slate-400"
            />
            {isRecurring && ( // Only show the recurrence frequency select when recurring is enabled.
              <div className="flex flex-col gap-1 md:col-span-2"> {/* Container for the recurrence frequency dropdown. */}
                <label className="text-xs font-medium text-slate-700">
                  Recurring frequency {/* Label for recurrence frequency field. */}
                </label>
                <select
                  value={recurrenceFreq ?? "MONTHLY"} // Binds select value to recurrenceFreq, defaulting to MONTHLY if null.
                  onChange={(e) => setRecurrenceFreq(e.target.value)} // Updates recurrenceFreq whenever the user picks a new frequency.
                  className="rounded-md border px-2 py-1.5 text-sm text-slate-700"
                >
                  <option value="WEEKLY">Weekly</option> {/* Weekly recurrence option. */}
                  <option value="BIWEEKLY">Biweekly</option> {/* Biweekly recurrence option. */}
                  <option value="MONTHLY">Monthly</option> {/* Monthly recurrence option. */}
                  <option value="ANNUAL">Annual</option> {/* Annual recurrence option. */}
                </select>
              </div>
            )}

            <label
              htmlFor="isRecurring"
              className="text-xs text-slate-700"
            >
              This is a recurring expense (lease, subscription, insurance, etc.) {/* Helper text explaining when to use recurring. */}
            </label>
          </div>
        </div>

        {error && ( // Conditionally render an error message block if error state is not null.
          <p className="text-xs text-rose-600">
            {error} {/* Shows the current error message to the user. */}
          </p>
        )}

        <div className="flex justify-end gap-3"> {/* Footer row with Cancel and Save buttons aligned to the right. */}
          <Link
            href="/dashboard/expenses" // Clicking Cancel navigates back to the expenses list without saving.
            className="rounded-md border px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Cancel {/* Cancel button label. */}
          </Link>
          <button
            type="submit"
            disabled={isSubmitting} // Disables the button while the form is submitting to prevent duplicate requests.
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 disabled:opacity-60"
          >
            {isSubmitting ? "Saving..." : "Save Expense"} {/* Shows "Saving..." while submitting, otherwise "Save Expense". */}
          </button>
        </div>
      </form>
    </div>
  );
}
