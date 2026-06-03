import { prisma } from "@/lib/prisma";
import { createPermissionSchema } from "@/lib/validations/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function GET() {
  try {
    const permissions = await prisma.permissions.findMany({
      where: {
        status: {
          not: "DELETED",
        },
      },
      orderBy: {
        name: "asc",
      },
    });
    return NextResponse.json(permissions, { status: 200 });
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
    if (!res.success) {
      return NextResponse.json(
        { error: "Failed to create permission", details: z.treeifyError(res.error) },
        { status: 400 }
      );
    }
    const { name, key, description } = res.data;
    const finalKey = (key && key.trim() !== "") ? key.trim() : name.trim().toLowerCase().replace(/\s+/g, "_");

    const nameConflict = await prisma.permissions.findFirst({
      where: { name: name.trim(), status: { not: "DELETED" } },
    });
    if (nameConflict) {
      return NextResponse.json(
        { error: "Permission name already exists" },
        { status: 400 }
      );
    }

    const keyConflict = await prisma.permissions.findFirst({
      where: { key: finalKey, status: { not: "DELETED" } },
    });
    if (keyConflict) {
      return NextResponse.json(
        { error: "Permission key already exists" },
        { status: 400 }
      );
    }

    const permission = await prisma.permissions.create({
      data: {
        name: name.trim(),
        key: finalKey,
        description: description ? description.trim() : null,
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