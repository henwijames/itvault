import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createUserSchema } from "@/lib/validations/users";
import { hashPassword } from "@/lib/hash/password";
import { z } from "zod";

export async function GET() {
  try {
    const usersList = await prisma.users.findMany({
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        staff: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    // Clean and format user structure (hiding password)
    const formattedUsers = usersList.map((user) => ({
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
    }));

    return NextResponse.json(formattedUsers, { status: 200 });
  } catch (error: any) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = createUserSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: z.treeifyError(result.error) },
        { status: 400 }
      );
    }

    const { name, email, password, status, roleIds } = result.data;

    // Check if email already exists
    const existingUser = await prisma.users.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email address already exists" },
        { status: 400 }
      );
    }

    // Securely hash password
    const securePassword = hashPassword(password);

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.users.create({
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: securePassword,
          status: status,
        },
      });

      if (Array.isArray(roleIds) && roleIds.length > 0) {
        // Link roles to this user
        await tx.user_roles.createMany({
          data: roleIds.map((roleId: string) => ({
            user_id: user.id,
            role_id: roleId,
          })),
        });
      }

      return tx.users.findUnique({
        where: { id: user.id },
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

    if (!newUser) {
      throw new Error("Failed to retrieve created user");
    }

    const formattedUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      status: newUser.status,
      createdAt: newUser.created_at,
      updatedAt: newUser.updated_at,
      roles: newUser.roles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        description: ur.role.description,
      })),
      staff: newUser.staff ? {
        id: newUser.staff.id,
        firstName: newUser.staff.first_name,
        lastName: newUser.staff.last_name,
        position: newUser.staff.position,
      } : null,
    };

    return NextResponse.json(formattedUser, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create user:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
