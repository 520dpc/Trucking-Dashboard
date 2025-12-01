import Link from "next/link";
import { db } from "@/lib/db";

export default async function CustomersPage() {
  // Fetch customers + their latest call note (if any)
  const customers = await db.customer.findMany({
    orderBy: { name: "asc" },
    include: {
      callNotes: {
        orderBy: { createdAt: "desc" },
        take: 1, // only need the most recent note
      },
    },
  });

  // Helper to compute days since last contact + color + label
  const now = new Date();

  function getContactStatus(lastContact: Date | null) {
    if (!lastContact) {
      return {
        days: null,
        label: "Never contacted",
        className: "bg-slate-100 text-slate-600",
      };
    }

    const diffMs = now.getTime() - lastContact.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (days <= 10) {
      return {
        days,
        label: `${days}d ago`,
        className: "bg-emerald-100 text-emerald-700",
      };
    }

    if (days <= 20) {
      return {
        days,
        label: `${days}d ago`,
        className: "bg-amber-100 text-amber-700",
      };
    }

    return {
      days,
      label: `${days}d ago`,
      className: "bg-rose-100 text-rose-700",
    };
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Customers</h1>
        <p className="text-sm text-slate-500">
          Brokers and shippers you&apos;ve worked with.
        </p>
      </div>

      {/* List or empty state */}
      {customers.length === 0 ? (
        <p className="text-sm text-slate-500">
          No customers yet. Customers will appear here after you start adding
          them.
        </p>
      ) : (
        <div className="space-y-3">
          {/* Mobile card list */}
          <div className="space-y-3 sm:hidden">
            {customers.map((customer) => {
              const lastNote = customer.callNotes[0] ?? null;
              const status = getContactStatus(
                lastNote ? new Date(lastNote.createdAt) : null
              );

              return (
                <Link
                  key={customer.id}
                  href={`/dashboard/customers/${customer.id}`}
                  className="block rounded-lg border bg-white p-3 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm text-slate-900">
                      {customer.name}
                    </div>
                    {customer.type && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-600">
                        {customer.type}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    {customer.email || customer.phone
                      ? [customer.email, customer.phone]
                          .filter(Boolean)
                          .join(" · ")
                      : "No contact info yet"}
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Last contact</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Desktop/tablet table */}
          <div className="hidden sm:block overflow-x-auto rounded-lg border bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">
                    Name
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">
                    Type
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">
                    Contact
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">
                    Notes
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">
                    Last Contact
                  </th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => {
                  const lastNote = customer.callNotes[0] ?? null;
                  const status = getContactStatus(
                    lastNote ? new Date(lastNote.createdAt) : null
                  );

                  return (
                    <tr key={customer.id} className="border-t last:border-b">
                      <td className="px-4 py-2 whitespace-nowrap">
                        <Link
                          href={`/dashboard/customers/${customer.id}`}
                          className="text-sky-700 hover:underline"
                        >
                          {customer.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {customer.type || "-"}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {[customer.email, customer.phone]
                          .filter(Boolean)
                          .join(" · ") || "-"}
                      </td>
                      <td className="px-4 py-2 max-w-xs truncate">
                        {customer.notes || "-"}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Customer Button */}
      <div className="flex justify-end pt-6">
        <Link
          href="/dashboard/customers/new"
          className="inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 transition"
        >
          + Add Customer
        </Link>
      </div>
    </div>
  );
}
