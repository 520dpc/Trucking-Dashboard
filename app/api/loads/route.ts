import { NextRequest, NextResponse } from "next/server"; // Imports Next.js server utilities: NextRequest handles incoming HTTP requests and NextResponse sends structured JSON responses.
import { db } from "@/lib/db";                            // Imports the Prisma database client we created, allowing this route to read and write data to your Neon Postgres database.

// -----------------------------
// GET /api/loads
// -----------------------------
export async function GET() {   // Defines the GET handler for this endpoint; Next.js will run this when a client fetches /api/loads.
  try {     // Wraps DB access in try/catch so the API returns controlled errors instead of crashing the server.
    const loads = await db.load.findMany({ // Queries the "load" table in the database and fetches all loads.
      orderBy: { createdAt: "desc" }, // Sorts loads by newest first; important for dashboard display order.
    });                                                   

    return NextResponse.json(loads);  // Returns the list of loads as JSON so the frontend can render them.
  } catch (err) {                                         
    console.error("[LOADS_GET_ERROR]", err);  // Logs the error to the server console with a clear tag for debugging.
    return NextResponse.json(   // Sends a structured error response back to the client.
      { error: "Failed to fetch loads" },  // Error message shown to the frontend for debugging.
      { status: 500 }   // HTTP 500 = internal server error.
    );
  }
}

// -----------------------------
// POST /api/loads
// -----------------------------
export async function POST(req: NextRequest) { // Defines the POST handler; Next.js runs this when a client submits a new load.
  try {  // Wrap POST logic in try/catch to handle failures gracefully.
    const data = await req.json();  // Parses the JSON body from the incoming request; contains the load form data.

    let user = await db.user.findFirst({  // Looks for an existing demo user (temporary until real auth is added).
      where: { email: "demo@demo.com" },  // Matches by email, acting as a simple placeholder identity.
    });

    if (!user) { // If the demo user does not exist yet...
      user = await db.user.create({      // ...create it so loads can attach to a valid userId.
        data: { email: "demo@demo.com", passwordHash: "placeholder" }, // passwordHash is placeholder until real auth.
      });
    }

    const load = await db.load.create({  // Creates a new load entry in the database.
      data: {    // Provides the actual fields to be stored.
        userId: user.id,       // Associates the load with the placeholder user (later replaced with real auth).
        broker: data.broker ?? null,    // Broker name or null; ?? ensures undefined becomes null for clean DB records.
        rate: Number(data.rate),    // Converts rate to a number; important because JSON body values come in as strings.
        miles: Number(data.miles),     // Same conversion for miles.
        fuelCost: Number(data.fuelCost),    // Required numeric field for fuel cost.
        lumper: data.lumper ? Number(data.lumper) : null, // Optional numeric fields converted to numbers or null if not provided.
        tolls: data.tolls ? Number(data.tolls) : null,    // Converts tolls to a number if provided.
        otherCosts: data.otherCosts ? Number(data.otherCosts) : null, // Handles any extra expenses cleanly.
      },
    });                                                   // Finishes the Prisma create operation.

    return NextResponse.json(load, { status: 201 });      // Returns the newly created load with HTTP status 201 (Created).
  } catch (err) {                                        
    console.error("[LOADS_POST_ERROR]", err);             
    return NextResponse.json(                             
      { error: "Failed to create load" },              
      { status: 500 }                                    
    );
  }
}
