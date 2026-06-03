import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateUserSchema } from "@/lib/validations/users";
import { hashPassword } from "@/lib/hash/password";
import { checkApiPermission } from "@/lib/rbac";
import { z } from "zod";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const permission = await checkApiPermission(request, "users", "view");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const { id } = await params;
    const user = await prisma.users.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        staff: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const formattedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      roles: user.roles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        description: ur.role.description,
      })),
      staff: user.staff ? {
        id: user.staff.id,
        firstName: user.staff.first_name,
        lastName: user.staff.last_name,
        position: user.staff.position,
        mobileNumber: user.staff.mobile_number,
      } : null,
    };

    return NextResponse.json(formattedUser, { status: 200 });
  } catch (error: any) {
    console.error("Failed to fetch user details:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const permission = await checkApiPermission(request, "users", "edit");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const { id } = await params;
    const body = await request.json();
    const result = updateUserSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: z.treeifyError(result.error) },
        { status: 400 }
      );
    }

    const { name, email, password, status, roleIds } = result.data;

    // Check if user exists
    const existingUser = await prisma.users.findUnique({
      where: { id },
    });
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Email uniqueness check if changing
    if (email && email.trim().toLowerCase() !== existingUser.email) {
      const emailConflict = await prisma.users.findUnique({
        where: { email: email.trim().toLowerCase() },
      });
      if (emailConflict) {
        return NextResponse.json(
          { error: "A user with this email address already exists" },
          { status: 400 }
        );
      }
    }

    const securePassword = password ? hashPassword(password) : undefined;

    const updatedUser = await prisma.$transaction(async (tx) => {
      const updated = await tx.users.update({
        where: { id },
        data: {
          name: name ? name.trim() : undefined,
          email: email ? email.trim().toLowerCase() : undefined,
          password: securePassword,
          status: status,
        },
      });

      if (Array.isArray(roleIds)) {
        // Disassociate existing roles
        await tx.user_roles.deleteMany({
          where: { user_id: id },
        });

        // Link new roles
        if (roleIds.length > 0) {
          await tx.user_roles.createMany({
            data: roleIds.map((roleId: string) => ({
              user_id: id,
              role_id: roleId,
            })),
          });
        }
      }

      return tx.users.findUnique({
        where: { id },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
          staff: true,
        },
      });
    });

    if (!updatedUser) {
      throw new Error("Failed to retrieve updated user");
    }

    const formattedUser = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      status: updatedUser.status,
      createdAt: updatedUser.created_at,
      updatedAt: updatedUser.updated_at,
      roles: updatedUser.roles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        description: ur.role.description,
      })),
      staff: updatedUser.staff ? {
        id: updatedUser.staff.id,
        firstName: updatedUser.staff.first_name,
        lastName: updatedUser.staff.last_name,
        position: updatedUser.staff.position,
      } : null,
    };

    return NextResponse.json(formattedUser, { status: 200 });
  } catch (error: any) {
    console.error("Failed to update user:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const permission = await checkApiPermission(request, "users", "delete");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const { id } = await params;

    const existingUser = await prisma.users.findUnique({
      where: { id },
    });
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.users.delete({
      where: { id },
    });

    return NextResponse.json({ message: "User deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Failed to delete user:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
