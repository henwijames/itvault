import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createRoleSchema } from "@/lib/validations/roles";
import { checkApiPermission } from "@/lib/rbac";
import { z } from "zod";

export async function GET(request: NextRequest) {
  try {
    let permission = await checkApiPermission(request, "roles", "view");
    if (!permission.authorized) {
      const userCreatePerm = await checkApiPermission(request, "users", "create");
      const userEditPerm = await checkApiPermission(request, "users", "edit");
      if (!userCreatePerm.authorized && !userEditPerm.authorized) {
        return permission.errorResponse!;
      }
    }

    const roles = await prisma.roles.findMany({
      include: {
        role_module_permissions: {
          include: {
            module: true,
            permission: true,
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
      roleModulePermissions: role.role_module_permissions.map((rmp) => ({
        moduleId: rmp.module_id,
        moduleName: rmp.module.name,
        moduleCode: rmp.module.code,
        permissionId: rmp.permission_id,
        permissionName: rmp.permission.name,
        permissionKey: rmp.permission.key,
      })),
      // Keep fallback properties to avoid breaking other client code if any
      permissions: role.role_module_permissions.map((rmp) => ({
        id: rmp.permission.id,
        name: rmp.permission.name,
        key: rmp.permission.key,
      })),
      modules: Array.from(
        new Map(
          role.role_module_permissions.map((rmp) => [
            rmp.module.id,
            {
              id: rmp.module.id,
              name: rmp.module.name,
              code: rmp.module.code,
            },
          ])
        ).values()
      ),
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
    const permission = await checkApiPermission(request, "roles", "create");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const body = await request.json();

    const result = createRoleSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: z.treeifyError(result.error) },
        { status: 400 }
      );
    }

    const { name, description, roleModulePermissions } = result.data;
    console.log("POST /api/roles - request payload:", { name, description, roleModulePermissions });

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

      console.log("Created role record ID:", role.id);

      if (Array.isArray(roleModulePermissions) && roleModulePermissions.length > 0) {
        console.log("Inserting role module permissions:", roleModulePermissions);
        // Create the role_module_permissions mapping
        await tx.role_module_permissions.createMany({
          data: roleModulePermissions.map((rmp) => ({
            role_id: role.id,
            module_id: rmp.moduleId,
            permission_id: rmp.permissionId,
          })),
        });
      }

      return tx.roles.findUnique({
        where: { id: role.id },
        include: {
          role_module_permissions: {
            include: {
              module: true,
              permission: true,
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
      roleModulePermissions: newRole.role_module_permissions.map((rmp) => ({
        moduleId: rmp.module_id,
        moduleName: rmp.module.name,
        moduleCode: rmp.module.code,
        permissionId: rmp.permission_id,
        permissionName: rmp.permission.name,
        permissionKey: rmp.permission.key,
      })),
      permissions: newRole.role_module_permissions.map((rmp) => ({
        id: rmp.permission.id,
        name: rmp.permission.name,
        key: rmp.permission.key,
      })),
      modules: Array.from(
        new Map(
          newRole.role_module_permissions.map((rmp) => [
            rmp.module.id,
            {
              id: rmp.module.id,
              name: rmp.module.name,
              code: rmp.module.code,
            },
          ])
        ).values()
      ),
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
