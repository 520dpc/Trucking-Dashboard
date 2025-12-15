// app/layout.tsx

import "./globals.css";                                   // Global Tailwind + base styles
import type { ReactNode } from "react";
import Providers from "./providers";                      // Client-side providers (React Query, etc.)

export const metadata = {
  title: "Trucking Dashboard",
  description: "Operations, finance, and CRM for trucking companies",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body
        className="
          min-h-screen
          bg-slate-50
          text-slate-900
          antialiased
        "
      >
        {/* 
          Providers is a CLIENT component.
          This keeps layout.tsx a SERVER component (best practice),
          while still enabling hooks, caching, etc.
        */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
