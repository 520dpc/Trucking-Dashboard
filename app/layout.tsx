import "./globals.css"; // Ensures Tailwind + global styles are loaded for every page.
import type { ReactNode } from "react"; // Imports ReactNode type to type the children prop safely.

type RootLayoutProps = { // Declares the shape of the props for the RootLayout component.
  children: ReactNode; // Every Next.js layout receives its nested routes as children.
}; // Ends RootLayoutProps type.

export default function RootLayout({ children }: RootLayoutProps) { // Exports the root layout component used by Next.js for the entire app.
  return (
    <html lang="en"> {/* Sets the document language; helps accessibility + SEO. */}
      <body
        className="
          min-h-screen          /* Makes sure the body always fills at least the viewport height. */
          bg-slate-50           /* Light neutral background similar to Brevo’s canvas. */
          text-slate-900        /* Dark text for good contrast on the light background. */
          antialiased           /* Smooths font rendering for a cleaner look. */
        "
      >
        {children} {/* Renders the entire app tree (dashboard, auth, marketing pages, etc.). */}
      </body>
    </html>
  );
}
