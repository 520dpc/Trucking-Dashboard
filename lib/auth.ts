import { db } from "@/lib/db"; // Reuses the shared Prisma client to query User/Company.

export async function requireDemoUser() { // Single place to resolve demo user (until real auth exists).
  const email = "demo@demo.com"; // Fixed demo email so all routes share the same identity.

  let user = await db.user.findFirst({ where: { email } }); // Try to find the demo user in the DB.
  if (!user) { // If the user doesn’t exist, we create it so APIs always work.
    // Ensure a company exists too (because your schema now requires companyId on User).
    const company = await db.company.create({
      data: { name: "Demo Company" }, // Minimal required fields for Company.
    });

    user = await db.user.create({
      data: {
        email, // Demo login identifier.
        passwordHash: "placeholder", // Placeholder until real auth.
        companyId: company.id, // REQUIRED: user must belong to a company in the new schema.
      },
    });
  }

  // If user exists but company was deleted or missing, this would throw later — guard it now.
  const company = await db.company.findUnique({ where: { id: user.companyId } }); // Load company for scoping.
  if (!company) {
    throw new Error("Demo company not found for demo user"); // Hard fail so we don’t create orphaned data.
  }

  return { user, company }; // Standard return shape to keep routes consistent.
}
