import type { ReactNode } from "react";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div
        className="
          mx-auto          /* Center the shell on ultra-wide screens. */
          flex             /* Sidebar + main content in a row. */
          min-h-screen     /* Always at least full viewport height. */
          w-full           /* Stretch to full width of viewport. */
          max-w-[1920px]   /* Hard cap so it doesn't get too wide on very large monitors. */
        "
      >
        {/* LEFT SIDEBAR */}
        <aside
          className="
            hidden            /* Hide sidebar on small screens. */
            md:flex           /* Show from md breakpoint and up. */
            md:w-64           /* Fixed width sidebar. */
            md:flex-col       /* Vertical stack inside sidebar. */
            border-r          /* Divider between sidebar and content. */
            bg-white          /* Solid white, no transparency, no blur. */
            p-4               /* Inner padding. */
          "
        >
          <div className="mb-6 text-lg font-semibold text-slate-900">
            FleetCore
          </div>

          <nav className="flex flex-1 flex-col gap-1 text-sm">
            <a
              href="/dashboard"
              className="rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100"
            >
              Dashboard
            </a>
            <a
              href="/dashboard/loads"
              className="rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100"
            >
              Loads
            </a>
            <a
              href="/dashboard/expenses"
              className="rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100"
            >
              Expenses
            </a>
            <a
              href="/dashboard/customers"
              className="rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100"
            >
              Customers
            </a>
                        <a
              href="/dashboard/documents"
              className="rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100"
            >
              Documents
            </a>
          </nav>

          <div className="mt-4 text-xs text-slate-400">
            © {new Date().getFullYear()} FleetCore
          </div>
        </aside>

        {/* MAIN AREA */}
        <div className="flex flex-1 flex-col">
          {/* TOP BAR */}
          <header
            className="
              flex
              h-14
              items-center
              justify-between
              border-b
              bg-white       /* Solid white top bar, no blur. */
              px-4
            "
          >
            <div className="text-sm font-medium text-slate-700">
              Dashboard Overview
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">
                Beta workspace
              </span>
            </div>
          </header>

          {/* MAIN CONTENT */}
          <main
            className="
              flex-1
              overflow-y-auto
              p-4
              lg:p-6
            "
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
