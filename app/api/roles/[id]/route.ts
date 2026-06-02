import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateRoleSchema } from "@/lib/validations/roles";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const role = await prisma.roles.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
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

    if (!role) {
      return NextResponse.json(
        { error: "Role not found" },
        { status: 404 }
      );
    }

    const formattedRole = {
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
    };

    return NextResponse.json(formattedRole);
  } catch (error: any) {
    console.error("Failed to fetch role:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = updateRoleSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, description, permissionIds } = result.data;

    // Check if role exists
    const roleExists = await prisma.roles.findUnique({
      where: { id },
    });

    if (!roleExists) {
      return NextResponse.json(
        { error: "Role not found" },
        { status: 404 }
      );
    }

    // Validate details if name is provided
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim() === "") {
        return NextResponse.json(
          { error: "Role name cannot be empty" },
          { status: 400 }
        );
      }

      // Check name uniqueness if changed
      if (name.trim() !== roleExists.name) {
        const nameConflict = await prisma.roles.findUnique({
          where: { name: name.trim() },
        });

        if (nameConflict) {
          return NextResponse.json(
            { error: "A role with this name already exists" },
            { status: 400 }
          );
        }
      }
    }

    // Update inside a transaction to synchronize permissions
    const updatedRole = await prisma.$transaction(async (tx) => {
      // Update role attributes
      const role = await tx.roles.update({
        where: { id },
        data: {
          name: name !== undefined ? name.trim() : undefined,
          description: description !== undefined ? (description ? description.trim() : null) : undefined,
        },
      });

      // Synchronize permissions if permissionIds is provided
      if (Array.isArray(permissionIds)) {
        // Delete all current permission mappings for this role
        await tx.role_permissions.deleteMany({
          where: { role_id: id },
        });

        // Insert new ones if any
        if (permissionIds.length > 0) {
          await tx.role_permissions.createMany({
            data: permissionIds.map((permId: string) => ({
              role_id: id,
              permission_id: permId,
            })),
          });
        }
      }

      return tx.roles.findUnique({
        where: { id },
        include: {
          permissions: {
            include: {
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

    if (!updatedRole) {
      throw new Error("Failed to retrieve updated role");
    }

    const formattedRole = {
      id: updatedRole.id,
      name: updatedRole.name,
      description: updatedRole.description,
      createdAt: updatedRole.created_at,
      updatedAt: updatedRole.updated_at,
      userCount: updatedRole._count.users,
      permissions: updatedRole.permissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        key: rp.permission.key,
        description: rp.permission.description,
      })),
    };

    return NextResponse.json(formattedRole);
  } catch (error: any) {
    console.error("Failed to update role:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if role exists
    const roleExists = await prisma.roles.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!roleExists) {
      return NextResponse.json(
        { error: "Role not found" },
        { status: 404 }
      );
    }

    // Check if role is currently assigned to users
    if (roleExists._count.users > 0) {
      return NextResponse.json(
        { error: "Cannot delete a role that is currently assigned to users" },
        { status: 400 }
      );
    }

    // Delete role (cascade deletes permissions due to relations onDelete: Cascade)
    await prisma.roles.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "Role successfully deleted" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Failed to delete role:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
