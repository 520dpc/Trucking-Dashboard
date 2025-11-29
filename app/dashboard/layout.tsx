import Link from "next/link"; // For internal navigation between dashboard sections.
import { ReactNode } from "react"; // Type for the layout children.
import { Truck, CreditCard, Users, BarChart3, Home } from "lucide-react"; // Icon set to give the nav a modern SaaS feel.

type DashboardLayoutProps = {
  children: ReactNode; // Any nested dashboard page content (loads, customers, expenses, etc.).
};

const brandBlue = "#0f2544"; // Primary brand color: dark, trustworthy blue for header/accents.

const navItems = [
  {
    href: "/dashboard",
    label: "Home",
    icon: Home,
    description: "Overview", 
  },
  {
    href: "/dashboard/loads",
    label: "Loads",
    icon: Truck,
    description: "Revenue by load",
  },
  {
    href: "/dashboard/customers",
    label: "Customers",
    icon: Users,
    description: "Brokers & shippers",
  },
  {
    href: "/dashboard/expenses",
    label: "Expenses",
    icon: CreditCard,
    description: "Fuel & fixed costs",
  },
  {
    href: "/dashboard/reports",
    label: "Reports",
    icon: BarChart3,
    description: "Profit & KPIs",
  },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* Top header: brand, trust, CTA */}
      <header
        className="border-b"
        style={{ backgroundColor: brandBlue }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
              <span className="text-lg font-bold text-white">FC</span>
            </div>
            <div>
              <div className="text-sm font-semibold tracking-wide text-white">
                FleetCore
              </div>
              <div className="text-xs text-slate-200">
                Turn your trucking data into decisions.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-slate-100">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              <span>Demo account · Data is not permanent</span>
            </div>
            <button className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-600">
              Get paid faster
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-1 flex-col md:flex-row">
        {/* Desktop / tablet sidebar */}
        <aside className="hidden w-64 shrink-0 border-r bg-white md:flex md:flex-col">
          <div className="px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Dashboard
            </p>
          </div>
          <nav className="flex-1 space-y-1 px-2 pb-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100">
                    <Icon className="h-4 w-4 text-slate-600" />
                  </span>
                  <span className="flex flex-col">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-[11px] text-slate-500">
                      {item.description}
                    </span>
                  </span>
                </Link>
              );
            })}
          </nav>
          <div className="border-t px-4 py-3 text-xs text-slate-500">
            <p className="font-medium text-slate-600">Today&apos;s focus</p>
            <p>Keep your trucks moving and cash flowing.</p>
          </div>
        </aside>

        {/* Mobile horizontal nav */}
        <nav className="flex gap-2 overflow-x-auto border-b bg-white px-3 py-2 text-xs md:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700"
              >
                <Icon className="h-3 w-3" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Main content area */}
        <main className="flex-1 bg-slate-100 px-4 py-4 md:px-6 md:py-6">
          <div className="rounded-2xl bg-white p-3 shadow-sm md:p-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
