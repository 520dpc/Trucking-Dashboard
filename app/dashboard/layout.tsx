import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-50">
      <aside className="w-64 border-r border-slate-800 p-4 space-y-4">
        <h2 className="text-lg font-semibold">Fleet Dashboard</h2>

        <nav className="space-y-2 text-sm">
          <a href="/dashboard" className="block hover:text-white">Overview</a>
          <a href="/dashboard/loads" className="block hover:text-white">Loads</a>
          <a href="/dashboard/expenses" className="block hover:text-white">Expenses</a>
          <a href="/dashboard/imports" className="block hover:text-white">Imports</a>
          <a href="/dashboard/reports" className="block hover:text-white">Reports</a>
        </nav>
      </aside>

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
