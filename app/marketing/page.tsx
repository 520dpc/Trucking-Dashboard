export default function MarketingPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="max-w-xl text-center space-y-4">
        <h1 className="text-3xl font-bold">
          Trucking Cashflow & Load Profit Dashboard
        </h1>
        <p className="text-slate-300">
          See your real profit per load and monthly cashflow after factoring,
          fuel, repairs, and all other expenses.
        </p>
        <div className="flex justify-center gap-3 mt-4">
          <a
            href="/login"
            className="px-4 py-2 rounded-md bg-white text-slate-950 text-sm font-medium"
          >
            Log in
          </a>
          <a
            href="/register"
            className="px-4 py-2 rounded-md border border-slate-500 text-sm font-medium"
          >
            Start Free
          </a>
        </div>
      </div>
    </main>
  );
}
