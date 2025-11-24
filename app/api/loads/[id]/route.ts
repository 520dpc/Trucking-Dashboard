import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db"

export async function GET(req: NextRequest, context: {params: {id: string}}) {
    try {
        const load = await db.load.findUnique({
            where: { id:context.params.id}
        })

        if (!load){
            return NextResponse.json(
                {error: "Load not found"},
                {status: 404}
            )
        }

        return NextResponse.json(load)
    }

    catch(err){
        console.error("[LOAD_GET_ERROR]", err)
        return NextResponse.json(
            {error: "Failed to fetch load"},
            {status: 500}
        )
    }
}

export async function PUT(req:NextRequest, context: {params: {id: string}}) {
    try{
        const data = await req.json();

        const updated = await db.load.update({
            where: {id: context.params.id },
            data: {
                        broker: data.broker ?? null,                                      // Optional broker string or null.
                        rate: Number(data.rate),                                          // Convert rate to number.
                        miles: Number(data.miles),                                        // Convert miles to number.
                        fuelCost: Number(data.fuelCost),                                  // Convert fuel cost to number.
                        lumper: data.lumper ? Number(data.lumper) : null,                 // Convert optional lumper to number or null.
                        tolls: data.tolls ? Number(data.tolls) : null,                    // Convert optional tolls to number or null.
                        otherCosts: data.otherCosts ? Number(data.otherCosts) : null,     // Convert optional otherCosts to number or null.

            }
        })

        return NextResponse.json(updated)
    }

    catch(err){
        console.error("[LOAD_UPDATE_ERROR", err);
        return NextResponse.json(
            { error: "Failed to update load"},
            { status: 500}
        )
    }
}

export async function DELETE(req:NextRequest, context: {params: {id:string}}){
    try {
        await db.load.delete({
            where: { id: context.params.id}
        })
        
        return NextResponse.json({success: true})
    }

    catch(err){
        console.error("LOAD_DELETE_ERROR", err)
        return NextResponse.json(
            {error: "Failed to delete laod"},
            {status: 500}
        )
    }
}