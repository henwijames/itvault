import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createStaffSchema } from "@/lib/validations/staff";
import { checkApiPermission } from "@/lib/rbac";
import { z } from "zod";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const permission = await checkApiPermission(request, "staff", "view");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const staffList = await prisma.staff.findMany({
      include: {
        branch: true,
        user: true,
      },
      orderBy: [
        { first_name: "asc" },
        { last_name: "asc" },
      ],
    });

    const formattedStaff = staffList.map((item) => ({
      id: item.id,
      firstName: item.first_name,
      lastName: item.last_name,
      email: item.email,
      mobileNumber: item.mobile_number,
      contactNumber: item.contact_number,
      dateOfBirth: item.date_of_birth ? item.date_of_birth.toISOString().split("T")[0] : null,
      emiratesIdNumber: item.emirates_id_number,
      emiratesIdExpiry: item.emirates_id_expiry ? item.emirates_id_expiry.toISOString().split("T")[0] : null,
      position: item.position,
      isActive: item.is_active,
      userId: item.user_id,
      branchId: item.branch_id,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      branch: {
        id: item.branch.id,
        name: item.branch.name,
        code: item.branch.code,
      },
      user: item.user
        ? {
            id: item.user.id,
            name: item.user.name,
            email: item.user.email,
          }
        : null,
    }));

    return NextResponse.json(formattedStaff, { status: 200 });
  } catch (error: any) {
    console.error("Failed to fetch staff list:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const permission = await checkApiPermission(request, "staff", "create");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const body = await request.json();
    const result = createStaffSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: z.treeifyError(result.error) },
        { status: 400 }
      );
    }

    const {
      firstName,
      lastName,
      branchId,
      userId,
      email,
      mobileNumber,
      contactNumber,
      dateOfBirth,
      emiratesIdNumber,
      emiratesIdExpiry,
      position,
      isActive,
    } = result.data;

    // Verify branch exists and is not DELETED
    const branch = await prisma.branches.findFirst({
      where: {
        id: branchId,
        status: { not: "DELETED" },
      },
    });

    if (!branch) {
      return NextResponse.json(
        { error: "Selected branch does not exist or has been deleted" },
        { status: 400 }
      );
    }

    // Verify userId uniqueness if provided
    if (userId) {
      const existingUserLink = await prisma.staff.findUnique({
        where: { user_id: userId },
      });
      if (existingUserLink) {
        return NextResponse.json(
          { error: "The selected user is already associated with another staff member" },
          { status: 400 }
        );
      }

      // Check if user exists
      const userExists = await prisma.users.findUnique({
        where: { id: userId },
      });
      if (!userExists) {
        return NextResponse.json(
          { error: "The selected user does not exist" },
          { status: 400 }
        );
      }
    }

    const newStaff = await prisma.$transaction(async (tx) => {
      const staff = await tx.staff.create({
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          branch_id: branchId,
          user_id: userId || null,
          email: email ? email.trim().toLowerCase() : null,
          mobile_number: mobileNumber ? mobileNumber.trim() : null,
          contact_number: contactNumber ? contactNumber.trim() : null,
          date_of_birth: dateOfBirth ? new Date(dateOfBirth) : null,
          emirates_id_number: emiratesIdNumber ? emiratesIdNumber.trim() : null,
          emirates_id_expiry: emiratesIdExpiry ? new Date(emiratesIdExpiry) : null,
          position: position ? position.trim() : null,
          is_active: isActive ?? true,
        },
      });

      return tx.staff.findUnique({
        where: { id: staff.id },
        include: {
          branch: true,
          user: true,
        },
      });
    });

    if (!newStaff) {
      throw new Error("Failed to retrieve created staff record");
    }

    const formattedStaff = {
      id: newStaff.id,
      firstName: newStaff.first_name,
      lastName: newStaff.last_name,
      email: newStaff.email,
      mobileNumber: newStaff.mobile_number,
      contactNumber: newStaff.contact_number,
      dateOfBirth: newStaff.date_of_birth ? newStaff.date_of_birth.toISOString().split("T")[0] : null,
      emiratesIdNumber: newStaff.emirates_id_number,
      emiratesIdExpiry: newStaff.emirates_id_expiry ? newStaff.emirates_id_expiry.toISOString().split("T")[0] : null,
      position: newStaff.position,
      isActive: newStaff.is_active,
      userId: newStaff.user_id,
      branchId: newStaff.branch_id,
      createdAt: newStaff.created_at,
      updatedAt: newStaff.updated_at,
      branch: {
        id: newStaff.branch.id,
        name: newStaff.branch.name,
        code: newStaff.branch.code,
      },
      user: newStaff.user
        ? {
            id: newStaff.user.id,
            name: newStaff.user.name,
            email: newStaff.user.email,
          }
        : null,
    };

    return NextResponse.json(formattedStaff, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create staff:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
