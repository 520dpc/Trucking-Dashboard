"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Link from "next/link";

type Customer = {
  id: string;
  name: string;
  type: string | null;
};

export default function NewLoadPage() {
  const router = useRouter();

  const [broker, setBroker] = useState("");
  const [rate, setRate] = useState("");
  const [miles, setMiles] = useState("");
  const [fuelCost, setFuelCost] = useState("");
  const [lumper, setLumper] = useState("");
  const [tolls, setTolls] = useState("");
  const [otherCosts, setOtherCosts] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // customer autocomplete state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  useEffect(() => {
    async function loadCustomers() {
      try {
        const res = await axios.get<Customer[]>("/api/customers");
        setCustomers(res.data);
      } catch (err) {
        console.error("[LOAD_CUSTOMERS_ERROR]", err);
      }
    }
    loadCustomers();
  }, []);

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(broker.toLowerCase())
  );

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await axios.post("/api/loads", {
        broker,
        customerId: selectedCustomerId ?? null,
        rate,
        miles,
        fuelCost,
        lumper: lumper || null,
        tolls: tolls || null,
        otherCosts: otherCosts || null,
      });

      router.push("/dashboard/loads");
      router.refresh();
    } catch (err: any) {
      console.error("[CREATE_LOAD_ERROR]", err);
      const message =
        err?.response?.data?.error || "Failed to create load";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSelectCustomer(customer: Customer) {
    setBroker(customer.name);
    setSelectedCustomerId(customer.id);
    setShowCustomerDropdown(false);
  }

  return (
    <div className="space-y-6">
      {/* Header / breadcrumbs */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            New Load
          </h1>
          <p className="text-sm text-slate-500">
            Enter the key details for this load.
          </p>
        </div>
        <Link
          href="/dashboard/loads"
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
          {/* Broker / Customer autocomplete */}
          <div className="flex flex-col gap-1 relative">
            <label className="text-xs font-medium text-slate-700">
              Company (Customer / Broker)
            </label>
            <input
              type="text"
              value={broker}
              onChange={(e) => {
                setBroker(e.target.value);
                setSelectedCustomerId(null);
                setShowCustomerDropdown(true);
              }}
              onFocus={() => setShowCustomerDropdown(true)}
              className="rounded-md border px-2 py-1.5 text-sm outline-none ring-0 focus:border-sky-500"
              placeholder="Start typing to search your customers…"
              autoComplete="off"
            />

            {showCustomerDropdown && filteredCustomers.length > 0 && (
                <div className="absolute top-full left-0 z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-md border bg-white text-sm shadow-lg">
                    {filteredCustomers.map((customer) => (
                        <button
                            key={customer.id}
                            type="button"
                            onClick={() => handleSelectCustomer(customer)}
                            className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-slate-100"
                        >
                            <span>{customer.name}</span>
                            {customer.type && (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-600">
                                    {customer.type}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}
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

        <div className="flex justify-end gap-3">
          <Link
            href="/dashboard/loads"
            className="rounded-md border px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 disabled:opacity-60"
          >
            {isSubmitting ? "Saving..." : "Save Load"}
          </button>
        </div>
      </form>
    </div>
  );
}
