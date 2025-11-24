import { NextResponse } from "next/server";                         // Used to send JSON responses from this route.
import { db } from "@/lib/db";                                      // Prisma client for DB access.

export async function GET() {                                       // Handles GET /api/customers
  try {
    const customers = await db.load.findMany({                      // Fetches all loads from DB.
      where: { broker: { not: null } },                             // Only loads with a broker name.
      select: { broker: true },                                     // Only return broker field.
      distinct: ["broker"],                                         // DISTINCT broker names.
    });

    return NextResponse.json(customers);                            // Returns list of unique customers.
  } catch (err) {
    console.error("[CUSTOMER_LIST_ERROR]", err);                    // Logs error for debugging.
    return NextResponse.json(                                      // Sends 500 on error.
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}
