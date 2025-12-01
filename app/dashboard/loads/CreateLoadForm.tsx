"use client"; // Marks this component as a client component so we can use hooks and axios.

import { FormEvent, useState } from "react"; // React types and hooks for form handling and local state.
import { useRouter } from "next/navigation"; // Next.js router for refreshing the page after a successful submit.
import axios from "axios"; // Axios HTTP client for calling our /api/loads endpoint.

export function CreateLoadForm() { // Exported form component used on the Loads page.
  const router = useRouter(); // Router instance used to refresh the server component after creating a load.

  const [broker, setBroker] = useState(""); // Broker name input state.
  const [rate, setRate] = useState(""); // Rate input state as a string.
  const [miles, setMiles] = useState(""); // Miles input state as a string.
  const [fuelCost, setFuelCost] = useState(""); // Fuel cost input state as a string.
  const [lumper, setLumper] = useState(""); // Optional lumper cost input state.
  const [tolls, setTolls] = useState(""); // Optional tolls cost input state.
  const [otherCosts, setOtherCosts] = useState(""); // Optional other costs input state.

  const [isSubmitting, setIsSubmitting] = useState(false); // Tracks whether the form is currently submitting.
  const [error, setError] = useState<string | null>(null); // Error message to display if the API call fails.

  async function handleSubmit(e: FormEvent<HTMLFormElement>) { // Handles the form submission event.
    e.preventDefault(); // Prevents the browser from doing a full page reload.
    setError(null); // Clears any previous error.
    setIsSubmitting(true); // Disables the button and shows loading state.

    try {
      await axios.post("/api/loads", { // Sends a POST request to our loads API route using axios.
        broker,
        rate,
        miles,
        fuelCost,
        lumper: lumper || null, // Send null when optional fields are empty so backend can handle properly.
        tolls: tolls || null,
        otherCosts: otherCosts || null,
      });

      // Reset fields on success.
      setBroker("");
      setRate("");
      setMiles("");
      setFuelCost("");
      setLumper("");
      setTolls("");
      setOtherCosts("");

      router.refresh(); // Asks Next.js to re-render the Loads page server component so the new load appears in the list.
    } catch (err: any) {
      console.error("[CREATE_LOAD_ERROR]", err); // Logs error details to browser console for debugging.
      const message =
        err?.response?.data?.error || "Failed to create load"; // Reads error message from API response if available.
      setError(message); // Stores error message in state so it can be displayed to the user.
    } finally {
      setIsSubmitting(false); // Re-enables the form regardless of success or failure.
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border bg-white p-4 shadow-sm"
    >
      <h2 className="text-base font-semibold text-slate-900">
        Add Load
      </h2>
      <p className="text-xs text-slate-500">
        Capture the basics: revenue, miles, and major costs.
      </p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-700">
            Broker / Customer
          </label>
          <input
            type="text"
            value={broker}
            onChange={(e) => setBroker(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm outline-none ring-0 focus:border-sky-500"
            placeholder="Acme Logistics"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-700">
            Rate ($)
          </label>
          <input
            type="number"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm outline-none ring-0 focus:border-sky-500"
            placeholder="2000"
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-700">
            Miles
          </label>
          <input
            type="number"
            value={miles}
            onChange={(e) => setMiles(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm outline-none ring-0 focus:border-sky-500"
            placeholder="800"
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-700">
            Fuel Cost ($)
          </label>
          <input
            type="number"
            value={fuelCost}
            onChange={(e) => setFuelCost(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm outline-none ring-0 focus:border-sky-500"
            placeholder="450"
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-700">
            Lumper ($)
          </label>
          <input
            type="number"
            value={lumper}
            onChange={(e) => setLumper(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm outline-none ring-0 focus:border-sky-500"
            placeholder="0"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-700">
            Tolls ($)
          </label>
          <input
            type="number"
            value={tolls}
            onChange={(e) => setTolls(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm outline-none ring-0 focus:border-sky-500"
            placeholder="0"
          />
        </div>

        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-xs font-medium text-slate-700">
            Other Costs ($)
          </label>
          <input
            type="number"
            value={otherCosts}
            onChange={(e) => setOtherCosts(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm outline-none ring-0 focus:border-sky-500"
            placeholder="0"
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-rose-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 disabled:opacity-60"
      >
        {isSubmitting ? "Saving..." : "Add Load"}
      </button>
    </form>
  );
}
