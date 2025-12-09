import { db } from "@/lib/db";                                             // Uses the shared Prisma client so we can hit the DB in one place.

/**
 * TEMP helper for the demo environment.
 * Ensures a demo Company + User exist and returns their IDs.
 * All demo-only API routes share this instead of hardcoding IDs.
 */
export async function ensureDemoCompanyAndUser() {                         // Exports a function returning { companyId, userId }.
  // 1) Ensure demo company exists
  let company = await db.company.findFirst({                               // Tries to find an existing demo company row.
    where: { name: "Demo Company" },                                       // Uses name as a simple identifier for now.
  });

  if (!company) {                                                          // If we didn't find it...
    company = await db.company.create({                                    // ...create a new Company row.
      data: {
        name: "Demo Company",                                              // Display name for this demo tenant.
        dotNumber: null,                                                   // Optional fields left null for the demo.
        mcNumber: null,
        defaultDaysToPay: 30,                                              // Reasonable default net terms.
        expandThreshold: 70,                                               // Placeholder threshold for “ready to expand” feature.
        defaultCurrency: "USD",                                            // Default billing currency.
        defaultFuelMpg: 6.0,                                               // Rough default MPG.
        defaultTruckFixedCostPerDay: 300,                                  // Rough daily fixed cost per truck.
        timezone: "America/Chicago",                                       // Common trucking timezone.
      },
    });
  }

  // 2) Ensure demo user exists for that company
  let user = await db.user.findFirst({                                     // Tries to find an existing demo user row.
    where: {
      email: "demo@demo.com",                                              // Fixed demo login email for now.
      companyId: company.id,                                               // Must belong to the demo company.
    },
  });

  if (!user) {                                                             // If no user found...
    user = await db.user.create({                                          // ...create the demo user row.
      data: {
        email: "demo@demo.com",                                            // Demo email.
        passwordHash: "placeholder-hash",                                  // Placeholder hash until real auth.
        companyId: company.id,                                             // Links user to the demo company.
        fullName: "Demo Dispatcher",                                       // Display name in the UI.
        role: "DISPATCHER",                                                // Sensible default role.
        isActive: true,                                                    // Make sure queries don't filter this user out.
      },
    });
  }

  // 3) Return IDs for use in API routes
  return {                                                                 // Returns what our routes actually care about.
    companyId: company.id,                                                 // Demo Company ID.
    userId: user.id,                                                       // Demo User ID.
  };
}

