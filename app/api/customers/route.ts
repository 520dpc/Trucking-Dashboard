import { NextRequest, NextResponse } from "next/server";        // Imports helpers from Next.js to receive requests and send JSON responses.
import { db } from "@/lib/db";                                  // Imports the Prisma client so we can interact with the database.

// GET /api/customers → return all customers
export async function GET() {                                   // Defines the GET handler for listing all customers.
  try {                                                         // Wrap in try/catch so errors don’t crash the server.
    const customers = await db.customer.findMany({              // Prisma query to fetch all customers from the Customer table.
      orderBy: { name: "asc" },                                 // Sorts alphabetically by name to make UI nicer.
    });                                                         // Ends the Prisma query.

    return NextResponse.json(customers);                        // Sends the fetched customers back as JSON.
  } catch (err) {                                               // If anything throws an error...
    console.error("[CUSTOMERS_GET_ERROR]", err);                // Log error to server console for debugging.
    return NextResponse.json(                                  // Send a JSON error response to the client.
      { error: "Failed to fetch customers" },                   // Error message payload.
      { status: 500 }                                           // HTTP 500 = server error.
    );
  }
}

// POST /api/customers → create a new customer
export async function POST(req: NextRequest) {                  // Defines POST handler for customer creation.
  try {
    const data = await req.json();                              // Parses JSON body from incoming request.

    // TEMP AUTH: ensure demo user exists (until real login system is added)
    let user = await db.user.findFirst({                        // Looks for a user with demo email.
      where: { email: "demo@demo.com" },                        // Matches the demo user's email.
    });

    if (!user) {                                                // If demo user doesn't exist yet...
      user = await db.user.create({                             // Create it so customers can be associated with a valid userId.
        data: {
          email: "demo@demo.com",                               // Hardcoded demo email.
          passwordHash: "placeholder",                          // Placeholder password until real auth is added.
        },
      });
    }

    const customer = await db.customer.create({                 // Writes a new customer record into the Customer table.
      data: {
        userId: user.id,                                        // Associates customer with the demo user (multi-tenant support).
        name: data.name,                                        // Required: customer name.
        type: data.type ?? null,                                // Optional: BROKER/SHIPPER/etc. stored as enum or null.
        mcNumber: data.mcNumber ?? null,                        // Optional: Broker's MC number or null.
        email: data.email ?? null,                              // Optional: contact email or null.
        phone: data.phone ?? null,                              // Optional: contact phone or null.
        notes: data.notes ?? null,                              // Optional: general notes or null.
      },
    });

    return NextResponse.json(customer, { status: 201 });        // Returns the created customer with HTTP 201 status.
  } catch (err) {                                               // If creating throws an error...
    console.error("[CUSTOMERS_POST_ERROR]", err);               // Logs the actual error for debugging.
    return NextResponse.json(                                  // Sends an error response.
      { error: "Failed to create customer" },                   // Error message payload.
      { status: 500 }                                           // HTTP status code indicating server failure.
    );
  }
}
