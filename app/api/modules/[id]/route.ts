import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateModuleSchema } from "@/lib/validations/modules";
import { z } from "zod";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const mod = await prisma.modules.findUnique({
      where: { id },
      include: {
        permissions: true,
        _count: {
          select: {
            roles: true,
          },
        },
      },
    });

    if (!mod) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    const formattedModule = {
      id: mod.id,
      name: mod.name,
      code: mod.code,
      description: mod.description,
      createdAt: mod.created_at,
      updatedAt: mod.updated_at,
      rolesCount: mod._count.roles,
      permissions: mod.permissions.map((perm) => ({
        id: perm.id,
        name: perm.name,
        key: perm.key,
        description: perm.description,
      })),
    };

    return NextResponse.json(formattedModule, { status: 200 });
  } catch (error: any) {
    console.error("Failed to fetch module details:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = updateModuleSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: z.treeifyError(result.error) },
        { status: 400 }
      );
    }

    const { name, code, description, permissionIds } = result.data;

    // Check if module exists
    const existingMod = await prisma.modules.findUnique({
      where: { id },
    });
    if (!existingMod) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    // Name uniqueness check if changing
    if (name && name.trim() !== existingMod.name) {
      const nameConflict = await prisma.modules.findUnique({
        where: { name: name.trim() },
      });
      if (nameConflict) {
        return NextResponse.json(
          { error: "A module with this name already exists" },
          { status: 400 }
        );
      }
    }

    // Code uniqueness check if changing
    if (code && code.trim().toLowerCase() !== existingMod.code) {
      const codeConflict = await prisma.modules.findUnique({
        where: { code: code.trim().toLowerCase() },
      });
      if (codeConflict) {
        return NextResponse.json(
          { error: "A module with this code already exists" },
          { status: 400 }
        );
      }
    }

    const updatedModule = await prisma.$transaction(async (tx) => {
      const updated = await tx.modules.update({
        where: { id },
        data: {
          name: name ? name.trim() : undefined,
          code: code ? code.trim().toLowerCase() : undefined,
          description: description !== undefined ? (description ? description.trim() : null) : undefined,
        },
      });

      if (Array.isArray(permissionIds)) {
        // Disassociate permissions no longer linked to this module
        await tx.permissions.updateMany({
          where: {
            module_id: id,
            id: { notIn: permissionIds },
          },
          data: {
            module_id: null,
          },
        });

        // Associate new permissions with this module
        if (permissionIds.length > 0) {
          await tx.permissions.updateMany({
            where: {
              id: { in: permissionIds },
            },
            data: {
              module_id: id,
            },
          });
        }
      }

      return tx.modules.findUnique({
        where: { id },
        include: {
          permissions: true,
        },
      });
    });

    if (!updatedModule) {
      throw new Error("Failed to retrieve updated module");
    }

    const formattedModule = {
      id: updatedModule.id,
      name: updatedModule.name,
      code: updatedModule.code,
      description: updatedModule.description,
      createdAt: updatedModule.created_at,
      updatedAt: updatedModule.updated_at,
      permissions: updatedModule.permissions.map((perm) => ({
        id: perm.id,
        name: perm.name,
        key: perm.key,
        description: perm.description,
      })),
    };

    return NextResponse.json(formattedModule, { status: 200 });
  } catch (error: any) {
    console.error("Failed to update module:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const existingMod = await prisma.modules.findUnique({
      where: { id },
    });
    if (!existingMod) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    await prisma.modules.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Module deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Failed to delete module:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
