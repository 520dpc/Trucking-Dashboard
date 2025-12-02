// app/api/dashboard/layout/route.ts

import { NextRequest, NextResponse } from "next/server";            // Imports Next.js helpers for building API routes.
import { db } from "@/lib/db";                                      // Imports Prisma client to read/write dashboard layout in the DB.
import {
  DEFAULT_DASHBOARD_LAYOUT,
  WidgetLayoutConfig,
  DashboardWidgetId,
} from "@/lib/dashboardWidgets";                                    // Imports shared widget layout types and default config.

// Helper type describing the payload we’ll return to the client.    //
type LayoutResponseItem = {                                         // Each layout entry sent to the frontend.
  id: DashboardWidgetId;                                            // Widget ID (matches the client widget registry).
  x: number;                                                        // X position in grid units.
  y: number;                                                        // Y position in grid units.
  w: number;                                                        // Width in grid units.
  h: number;                                                        // Height in grid units.
};

// GET /api/dashboard/layout  → return current user’s layout (or defaults).
export async function GET() {                                       // Handles GET requests for this endpoint.
  try {
    // TEMP AUTH: use demo user until real auth is wired in.         //
    let user = await db.user.findFirst({                            // Looks up the demo user by email.
      where: { email: "demo@demo.com" },                            // Filters on the fixed demo email.
    });

    if (!user) {                                                    // If the demo user doesn’t exist yet...
      user = await db.user.create({                                 // ...create it so related data has an owner.
        data: {
          email: "demo@demo.com",                                   // Demo email used across the app.
          passwordHash: "placeholder",                              // Placeholder password until proper auth.
        },
      });
    }

    const rows = await db.dashboardWidgetLayout.findMany({          // Fetches any saved layout rows for this user.
      where: { userId: user.id },                                   // Filters by userId so each user has independent layout.
      orderBy: [{ y: "asc" }, { x: "asc" }],                        // Orders by row then column for stable rendering.
    });

    let layout: LayoutResponseItem[];                               // Will hold the layout we return to the client.

    if (rows.length === 0) {                                        // If user has no custom layout yet...
      layout = DEFAULT_DASHBOARD_LAYOUT.map((item) => ({            // ...fall back to the default layout.
        id: item.id,                                                // Copy widget ID.
        x: item.x,                                                  // Copy default X position.
        y: item.y,                                                  // Copy default Y position.
        w: item.w,                                                  // Copy default width.
        h: item.h,                                                  // Copy default height.
      }));
    } else {
      layout = rows.map((row) => ({                                 // Convert DB rows into the response shape.
        id: row.widgetId as DashboardWidgetId,                      // Cast widgetId string to typed DashboardWidgetId.
        x: row.x,                                                   // Persisted X coordinate.
        y: row.y,                                                   // Persisted Y coordinate.
        w: row.w,                                                   // Persisted width.
        h: row.h,                                                   // Persisted height.
      }));
    }

    return NextResponse.json(layout);                               // Return the layout array as JSON to the client.
  } catch (err) {
    console.error("[DASHBOARD_LAYOUT_GET_ERROR]", err);             // Log any error for server-side debugging.
    return NextResponse.json(                                      // Return a 500 error response to caller.
      { error: "Failed to load dashboard layout" },                 // Short error message for the frontend.
      { status: 500 }                                               // HTTP 500 = internal server error.
    );
  }
}

// POST /api/dashboard/layout  → replace current user’s layout.
export async function POST(req: NextRequest) {                      // Handles POST requests that save a new layout.
  try {
    const body = await req.json();                                  // Parses JSON request body from the client.

    const layout = body.layout as WidgetLayoutConfig[] | undefined; // Extracts layout array from body and types it.
    if (!layout || !Array.isArray(layout)) {                        // Validates that we received a proper array.
      return NextResponse.json(                                    // If not, send a 400 Bad Request.
        { error: "Invalid layout payload" },                        // Error message describing the issue.
        { status: 400 }                                             // HTTP 400 = client input error.
      );
    }

    // TEMP AUTH: same demo user as above.                           //
    let user = await db.user.findFirst({                            // Looks up the demo user row.
      where: { email: "demo@demo.com" },                            // Fixed demo email.
    });

    if (!user) {                                                    // If demo user is missing...
      user = await db.user.create({                                 // ...create it.
        data: {
          email: "demo@demo.com",                                   // Demo email.
          passwordHash: "placeholder",                              // Placeholder hash.
        },
      });
    }

    await db.$transaction(async (tx) => {                           // Use a transaction so layout updates are atomic.
      await tx.dashboardWidgetLayout.deleteMany({                   // First, remove any existing layout rows for this user.
        where: { userId: user!.id },                                // Filter by current userId.
      });

      if (layout.length === 0) {                                    // If client sent empty layout, nothing more to store.
        return;                                                     // Exit transaction early.
      }

      await tx.dashboardWidgetLayout.createMany({                   // Inserts new layout rows for each widget.
        data: layout.map((item) => ({                               // Maps frontend layout entries into DB rows.
          userId: user!.id,                                         // Associates row with current user.
          widgetId: item.id,                                        // Stores widget ID string.
          x: item.x,                                                // Stores X position.
          y: item.y,                                                // Stores Y position.
          w: item.w,                                                // Stores width.
          h: item.h,                                                // Stores height.
        })),
      });
    });

    return NextResponse.json({ success: true });                    // Return a simple success flag on save.
  } catch (err) {
    console.error("[DASHBOARD_LAYOUT_POST_ERROR]", err);            // Log any error that occurs during save.
    return NextResponse.json(                                      // Respond with a 500 error if saving fails.
      { error: "Failed to save dashboard layout" },                 // Error message for frontend.
      { status: 500 }                                               // HTTP 500 = internal server error.
    );
  }
}
