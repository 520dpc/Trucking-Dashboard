import { NextRequest, NextResponse } from "next/server";              // Imports Next.js request/response types and helpers for building API routes.
import { getDemoTenant } from "@/lib/demoTenant";                      // Imports the helper that returns (or creates) the demo Company + User pair.

/**
 * GET /api/me
 * Returns the "current" user and their company context.
 * For now this is the demo tenant (demo company + demo user) until real auth is wired in.
 */
export async function GET(_req: NextRequest) {                         // Defines the GET handler for /api/me; Next.js calls this on GET requests.
  try {                                                                // Wraps the logic in a try/catch so any error is handled gracefully.
    const { company, user } = await getDemoTenant();                   // Uses the shared demoTenant helper to resolve a Company + User pair.

    if (!user || !company) {                                           // Extra guard: if for some reason either is missing...
      return NextResponse.json(                                       // ...respond with a 500-level error indicating a server-side problem.
        { error: "Failed to resolve demo tenant" },                    // JSON error message describing what went wrong.
        { status: 500 }                                                // HTTP 500 = internal server error.
      );
    }

    return NextResponse.json({                                         // Builds a successful JSON response describing the current user + company.
      user: {                                                          // Nests user-related fields under `user` for clarity.
        id: user.id,                                                   // Exposes the user ID so the frontend can tag requests with it if needed.
        email: user.email,                                             // Exposes the login/email address for display and debugging.
        fullName: user.fullName,                                       // Exposes the optional full name for UI personalization.
        role: user.role,                                               // Exposes the user's role (OWNER, DISPATCHER, etc.) for permission logic.
        companyId: user.companyId,                                     // Links the user explicitly to their company in the response.
        createdAt: user.createdAt,                                     // Shows when the user account was created (auditing / UX).
        isActive: user.isActive,                                       // Indicates whether the user is currently active in the system.
      },
      company: {                                                       // Nests company-related fields under `company`.
        id: company.id,                                                // Exposes the company ID for scoping queries on the frontend.
        name: company.name,                                            // Company name for display in the UI header / settings.
        dotNumber: company.dotNumber,                                  // DOT number if present; useful for forms and integrations.
        mcNumber: company.mcNumber,                                    // MC number if present; also used in onboarding and compliance.
        defaultDaysToPay: company.defaultDaysToPay,                    // Default payment terms; used in AR and risk widgets.
        expandThreshold: company.expandThreshold,                      // "Ready to expand" threshold score (for your future expansion feature).
        defaultCurrency: company.defaultCurrency,                      // Currency code (e.g., USD); future-proof for non-US users.
        defaultFuelMpg: company.defaultFuelMpg,                        // Default fuel MPG for cost estimations.
        defaultTruckFixedCostPerDay: company.defaultTruckFixedCostPerDay, // Default fixed cost per truck per day (for profitability modeling).
        timezone: company.timezone,                                    // Timezone for date grouping (reports, dashboards).
        createdAt: company.createdAt,                                  // When the company record was created.
        updatedAt: company.updatedAt,                                  // When the company record was last updated.
      },
    });                                                                // Ends the JSON response with default 200 OK status.
  } catch (err) {                                                      // If any error occurs inside the try block...
    console.error("[ME_GET_ERROR]", err);                              // Log the error with a clear tag so it's easy to spot in server logs.
    return NextResponse.json(                                         // Return a standardized error response to the client.
      { error: "Failed to load current user" },                        // Generic error message to avoid leaking internal details.
      { status: 500 }                                                  // HTTP 500 = internal server error.
    );
  }
}
