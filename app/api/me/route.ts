import { NextRequest, NextResponse } from "next/server"; // Imports Next.js types/helpers so we can handle requests and return JSON responses.
import { db } from "@/lib/db";                            // Imports the shared Prisma client instance to talk to the database.

// GET /api/me → return the current user (for now, the hard-coded demo user).
export async function GET(req: NextRequest) {            // Defines the GET handler for the /api/me endpoint; Next.js will call this for GET requests.
  try {                                                  // Wrap logic in try/catch so any error is handled gracefully instead of crashing the route.
    const user = await db.user.findFirst({               // Queries the User table to find the demo user record.
      where: { email: "demo@demo.com" },                 // Filters by the hard-coded demo email; later this will be replaced by real auth logic.
    });                                                  // Ends the Prisma query configuration.

    if (!user) {                                         // If no user with that email exists in the database...
      return NextResponse.json(                          // Return a JSON response indicating that the current user could not be resolved.
        { error: "Demo user not found" },                // Body explaining that there is no demo user yet.
        { status: 404 }                                  // HTTP 404 = not found, because the "current user" concept failed.
      );                                                 // End of 404 response.
    }

    return NextResponse.json({                           // If the demo user exists, return a JSON response with basic user info.
      id: user.id,                                       // Exposes the user’s ID so the frontend can associate data with this user.
      email: user.email,                                 // Exposes the email for display or debugging.
      createdAt: user.createdAt,                         // Exposes when the user was created; useful for auditing later.
    });                                                  // Ends the successful JSON response with default 200 status.
  } catch (err) {                                        // If an error happens anywhere in the try block...
    console.error("[ME_GET_ERROR]", err);                // Log the error to the server console with a clear tag for debugging.
    return NextResponse.json(                            // Return a generic 500 error response to the client.
      { error: "Failed to load current user" },          // Body explaining that we could not resolve the current user due to an internal error.
      { status: 500 }                                    // HTTP 500 = internal server error.
    );                                                   // End of 500 response.
  }
}
