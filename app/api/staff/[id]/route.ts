import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateStaffSchema } from "@/lib/validations/staff";
import { checkApiPermission } from "@/lib/rbac";
import { z } from "zod";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const permission = await checkApiPermission(request, "staff", "view");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const { id } = await params;

    const staffMember = await prisma.staff.findUnique({
      where: { id },
      include: {
        branch: true,
        user: true,
      },
    });

    if (!staffMember) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    const formattedStaff = {
      id: staffMember.id,
      firstName: staffMember.first_name,
      lastName: staffMember.last_name,
      email: staffMember.email,
      mobileNumber: staffMember.mobile_number,
      contactNumber: staffMember.contact_number,
      dateOfBirth: staffMember.date_of_birth ? staffMember.date_of_birth.toISOString().split("T")[0] : null,
      emiratesIdNumber: staffMember.emirates_id_number,
      emiratesIdExpiry: staffMember.emirates_id_expiry ? staffMember.emirates_id_expiry.toISOString().split("T")[0] : null,
      position: staffMember.position,
      isActive: staffMember.is_active,
      userId: staffMember.user_id,
      branchId: staffMember.branch_id,
      createdAt: staffMember.created_at,
      updatedAt: staffMember.updated_at,
      branch: {
        id: staffMember.branch.id,
        name: staffMember.branch.name,
        code: staffMember.branch.code,
      },
      user: staffMember.user
        ? {
            id: staffMember.user.id,
            name: staffMember.user.name,
            email: staffMember.user.email,
          }
        : null,
    };

    return NextResponse.json(formattedStaff, { status: 200 });
  } catch (error: any) {
    console.error("Failed to fetch staff member details:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const permission = await checkApiPermission(request, "staff", "edit");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const { id } = await params;

    const body = await request.json();
    const result = updateStaffSchema.safeParse(body);

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

    // Check if staff member exists
    const existingStaff = await prisma.staff.findUnique({
      where: { id },
    });
    if (!existingStaff) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    // Validate branch exists if it's changing
    if (branchId && branchId !== existingStaff.branch_id) {
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
    }

    // Validate user_id uniqueness if it's changing
    if (userId !== undefined && userId !== existingStaff.user_id) {
      if (userId) {
        const userConflict = await prisma.staff.findUnique({
          where: { user_id: userId },
        });
        if (userConflict) {
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
    }

    const updatedStaff = await prisma.$transaction(async (tx) => {
      const updated = await tx.staff.update({
        where: { id },
        data: {
          first_name: firstName !== undefined ? firstName.trim() : undefined,
          last_name: lastName !== undefined ? lastName.trim() : undefined,
          branch_id: branchId || undefined,
          user_id: userId !== undefined ? (userId || null) : undefined,
          email: email !== undefined ? (email ? email.trim().toLowerCase() : null) : undefined,
          mobile_number: mobileNumber !== undefined ? (mobileNumber ? mobileNumber.trim() : null) : undefined,
          contact_number: contactNumber !== undefined ? (contactNumber ? contactNumber.trim() : null) : undefined,
          date_of_birth: dateOfBirth !== undefined ? (dateOfBirth ? new Date(dateOfBirth) : null) : undefined,
          emirates_id_number: emiratesIdNumber !== undefined ? (emiratesIdNumber ? emiratesIdNumber.trim() : null) : undefined,
          emirates_id_expiry: emiratesIdExpiry !== undefined ? (emiratesIdExpiry ? new Date(emiratesIdExpiry) : null) : undefined,
          position: position !== undefined ? (position ? position.trim() : null) : undefined,
          is_active: isActive !== undefined ? isActive : undefined,
        },
      });

      return tx.staff.findUnique({
        where: { id: updated.id },
        include: {
          branch: true,
          user: true,
        },
      });
    });

    if (!updatedStaff) {
      throw new Error("Failed to retrieve updated staff record");
    }

    const formattedStaff = {
      id: updatedStaff.id,
      firstName: updatedStaff.first_name,
      lastName: updatedStaff.last_name,
      email: updatedStaff.email,
      mobileNumber: updatedStaff.mobile_number,
      contactNumber: updatedStaff.contact_number,
      dateOfBirth: updatedStaff.date_of_birth ? updatedStaff.date_of_birth.toISOString().split("T")[0] : null,
      emiratesIdNumber: updatedStaff.emirates_id_number,
      emiratesIdExpiry: updatedStaff.emirates_id_expiry ? updatedStaff.emirates_id_expiry.toISOString().split("T")[0] : null,
      position: updatedStaff.position,
      isActive: updatedStaff.is_active,
      userId: updatedStaff.user_id,
      branchId: updatedStaff.branch_id,
      createdAt: updatedStaff.created_at,
      updatedAt: updatedStaff.updated_at,
      branch: {
        id: updatedStaff.branch.id,
        name: updatedStaff.branch.name,
        code: updatedStaff.branch.code,
      },
      user: updatedStaff.user
        ? {
            id: updatedStaff.user.id,
            name: updatedStaff.user.name,
            email: updatedStaff.user.email,
          }
        : null,
    };

    return NextResponse.json(formattedStaff, { status: 200 });
  } catch (error: any) {
    console.error("Failed to update staff member:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const permission = await checkApiPermission(request, "staff", "delete");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const { id } = await params;

    const existingStaff = await prisma.staff.findUnique({
      where: { id },
    });
    if (!existingStaff) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    // Check if staff has assigned tickets
    const ticketCount = await prisma.tickets.count({
      where: { staff_id: id },
    });

    if (ticketCount > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete staff member. They are assigned to tickets. Try deactivating them instead.",
        },
        { status: 400 }
      );
    }

    await prisma.staff.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Staff member deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Failed to delete staff member:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
