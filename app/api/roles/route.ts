import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createRoleSchema } from "@/lib/validations/roles";
import { z } from "zod";

export async function GET(request: NextRequest) {
  try {
    const roles = await prisma.roles.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        modules: {
          include: {
            module: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Format roles to have cleaner structure for clients
    const formattedRoles = roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      createdAt: role.created_at,
      updatedAt: role.updated_at,
      userCount: role._count.users,
      permissions: role.permissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        key: rp.permission.key,
        description: rp.permission.description,
      })),
      modules: role.modules.map((rm) => ({
        id: rm.module.id,
        name: rm.module.name,
        code: rm.module.code,
        description: rm.module.description,
      })),
    }));

    return NextResponse.json(formattedRoles);
  } catch (error: any) {
    console.error("Failed to fetch roles:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = createRoleSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: z.treeifyError(result.error) },
        { status: 400 }
      );
    }

    const { name, description, permissionIds, moduleIds } = result.data;

    // Check if role name already exists
    const existingRole = await prisma.roles.findUnique({
      where: { name: name.trim() },
    });

    if (existingRole) {
      return NextResponse.json(
        { error: "A role with this name already exists" },
        { status: 400 }
      );
    }

    // Create the role and map permissions & modules if provided
    const newRole = await prisma.$transaction(async (tx) => {
      const role = await tx.roles.create({
        data: {
          name: name.trim(),
          description: description ? description.trim() : null,
        },
      });

      if (Array.isArray(permissionIds) && permissionIds.length > 0) {
        // Create the role_permissions mapping
        await tx.role_permissions.createMany({
          data: permissionIds.map((permId: string) => ({
            role_id: role.id,
            permission_id: permId,
          })),
        });
      }

      if (Array.isArray(moduleIds) && moduleIds.length > 0) {
        // Create the role_modules mapping
        await tx.role_modules.createMany({
          data: moduleIds.map((modId: string) => ({
            role_id: role.id,
            module_id: modId,
          })),
        });
      }

      return tx.roles.findUnique({
        where: { id: role.id },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
          modules: {
            include: {
              module: true,
            },
          },
          _count: {
            select: {
              users: true,
            },
          },
        },
      });
    });

    if (!newRole) {
      throw new Error("Failed to retrieve created role");
    }

    const formattedRole = {
      id: newRole.id,
      name: newRole.name,
      description: newRole.description,
      createdAt: newRole.created_at,
      updatedAt: newRole.updated_at,
      userCount: newRole._count.users,
      permissions: newRole.permissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        key: rp.permission.key,
        description: rp.permission.description,
      })),
      modules: newRole.modules.map((rm) => ({
        id: rm.module.id,
        name: rm.module.name,
        code: rm.module.code,
        description: rm.module.description,
      })),
    };

    return NextResponse.json(formattedRole, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create role:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
