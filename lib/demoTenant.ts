import { db } from "@/lib/db";                                                   // Prisma client so we can read/write the DB.

/**
 * TEMP: ensure we always have a demo Company + User
 * until real authentication is added.
 */
export async function getDemoTenant() {                                          // Named export used by API routes.
  let company = await db.company.findFirst({                                     // Try to find an existing company.
    where: { name: "Demo Fleet" },                                              // Use a fixed name as our demo tenant.
  });

  if (!company) {                                                                // If there is no demo company yet...
    company = await db.company.create({                                          // ...create one.
      data: {
        name: "Demo Fleet",                                                      // Demo company name.
        defaultDaysToPay: 30,                                                    // Reasonable defaults for a fleet.
        defaultFuelMpg: 6.5,
        defaultTruckFixedCostPerDay: 250,
        timezone: "America/Chicago",
      },
    });
  }

  let user = await db.user.findFirst({                                           // Try to find the demo user.
    where: { email: "demo@demo.com", companyId: company.id },                    // Ensure user is tied to this company.
  });

  if (!user) {                                                                   // If no demo user exists...
    user = await db.user.create({                                               // ...create one.
      data: {
        email: "demo@demo.com",                                                  // Demo login email.
        passwordHash: "placeholder-hash",                                        // Placeholder hash until auth is real.
        companyId: company.id,                                                   // Link user to the demo company.
        fullName: "Demo Dispatcher",                                             // Demo display name.
        role: "OWNER",                                                           // Give full permissions for now.
      },
    });
  }

  return { company, user };                                                      // Return both so routes can use companyId + userId.
}
