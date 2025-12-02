import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "30"; // default: last 30 days

    let fromDate: Date | null = null;

    if (range !== "all") {
      const days = parseInt(range, 10);
      if (!Number.isNaN(days)) {
        fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - days);
      }
    }

    const where: any = {};

    if (fromDate) {
      where.incurredAt = { gte: fromDate };
    }

    const expenses = await db.expense.findMany({
      where,
      orderBy: { incurredAt: "desc" },
    });

    return NextResponse.json(expenses);
  } catch (err) {
    console.error("[EXPENSES_GET_ERROR]", err);
    return NextResponse.json(
      { error: "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    const isRecurring = Boolean(data.isRecurring);
    const recurrenceFreq: string | null = data.recurrenceFreq ?? null;

    // App-level validation: if it's recurring, frequency is required.
    if (isRecurring && !recurrenceFreq) {
      return NextResponse.json(
        { error: "recurrenceFreq is required when isRecurring is true" },
        { status: 400 }
      );
    }

    // TEMP: demo user
    let user = await db.user.findFirst({
      where: { email: "demo@demo.com" },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          email: "demo@demo.com",
          passwordHash: "placeholder",
        },
      });
    }

    const expense = await db.expense.create({
      data: {
        userId: user.id,
        categoryGroup: data.categoryGroup,
        categoryKey: data.categoryKey,
        label: data.label ?? null,
        amount: Number(data.amount),
        description: data.description ?? null,
        incurredAt: data.incurredAt
          ? new Date(data.incurredAt)
          : new Date(),
        isRecurring,
        recurrenceFreq, // can be null, but never null when isRecurring === true
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (err) {
    console.error("[EXPENSES_POST_ERROR]", err);
    return NextResponse.json(
      { error: "Failed to create expense" },
      { status: 500 }
    );
  }
}