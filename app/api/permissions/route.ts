import { prisma } from "@/lib/prisma";
import { createPermissionSchema } from "@/lib/validations/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function GET() {
  try {
    const permissions = await prisma.permissions.findMany();
    return NextResponse.json( permissions , { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch permissions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
    try {
        let body;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: "Invalid JSON body" },
                { status: 400 }
            );
        }
        const res = createPermissionSchema.safeParse(body);
        if (!res.success){
            return NextResponse.json(
                { error: "Failed to create permission", details: z.treeifyError(res.error) },
                { status: 400 }
            );
        }
        const { name, key, description } = res.data;

        const existingPermission = await prisma.permissions.findUnique({
            where: {name: name}
        })
        if (existingPermission){
            return NextResponse.json(
                { error: "Permission already exists" },
                { status: 400 }
            );
        }
        const permission = await prisma.permissions.create({
            data: {
                name,
                key,
                description,
            },
        });
        return NextResponse.json({ permission }, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Failed to create permission" },
            { status: 500 }
        );
    }
}