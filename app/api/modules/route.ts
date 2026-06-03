import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createModuleSchema } from "@/lib/validations/modules";
import { z } from "zod";

export async function GET() {
  try {
    const modulesList = await prisma.modules.findMany({
      where: {
        status: {
          not: "DELETED",
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    const formattedModules = modulesList.map((mod) => ({
      id: mod.id,
      name: mod.name,
      code: mod.code,
      status: mod.status,
      description: mod.description,
      createdAt: mod.created_at,
      updatedAt: mod.updated_at,
    }));

    return NextResponse.json(formattedModules, { status: 200 });
  } catch (error: any) {
    console.error("Failed to fetch modules:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = createModuleSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: z.treeifyError(result.error) },
        { status: 400 }
      );
    }

    const { name, code, description } = result.data;

    // Check if module name already exists
    const existingName = await prisma.modules.findUnique({
      where: { name: name.trim() },
    });
    if (existingName) {
      return NextResponse.json(
        { error: "A module with this name already exists" },
        { status: 400 }
      );
    }

    // Check if module code already exists
    const existingCode = await prisma.modules.findUnique({
      where: { code: code.trim().toLowerCase() },
    });
    if (existingCode) {
      return NextResponse.json(
        { error: "A module with this code already exists" },
        { status: 400 }
      );
    }

    const newModule = await prisma.$transaction(async (tx) => {
      const mod = await tx.modules.create({
        data: {
          name: name.trim(),
          code: code.trim().toLowerCase(),
          description: description ? description.trim() : null,
        },
      });

      return tx.modules.findUnique({
        where: { id: mod.id },
      });
    });

    if (!newModule) {
      throw new Error("Failed to retrieve created module");
    }

    const formattedModule = {
      id: newModule.id,
      name: newModule.name,
      code: newModule.code,
      description: newModule.description,
      createdAt: newModule.created_at,
      updatedAt: newModule.updated_at,
    };

    return NextResponse.json(formattedModule, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create module:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
