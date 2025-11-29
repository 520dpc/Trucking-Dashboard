import Link from "next/link"; // Allows navigation to customer detail pages.
import { db } from "@/lib/db"; // Prisma client so this page can fetch customers from the database.

export default async function CustomersPage() { // Server component for /dashboard/customers.
  const customers = await db.customer.findMany({ // Fetches all customers from the Customer table.
    orderBy: { name: "asc" }, // Sorts customers alphabetically for easier scanning.
  });

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
            {customers.map((customer) => (
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
              </Link>
            ))}
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
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
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
                  </tr>
                ))}
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