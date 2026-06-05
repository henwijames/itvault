import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { borrowAssetSchema } from "@/lib/validations/assets";
import { checkApiPermission } from "@/lib/rbac";
import { z } from "zod";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const permission = await checkApiPermission(request, "assets", "view");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const logs = await prisma.asset_borrow_logs.findMany({
      include: {
        asset: {
          include: {
            branch: true,
          },
        },
        staff: true,
        borrowing_branch: true,
      },
      orderBy: {
        borrowed_at: "desc",
      },
    });

    const formattedLogs = logs.map((log) => ({
      id: log.id,
      assetId: log.asset_id,
      staffId: log.staff_id,
      borrowingBranchId: log.borrowing_branch_id,
      quantity: log.quantity,
      borrowedAt: log.borrowed_at,
      returnedAt: log.returned_at,
      notes: log.notes,
      asset: {
        id: log.asset.id,
        name: log.asset.name,
        category: log.asset.category,
        assetTag: log.asset.asset_tag,
        branch: {
          id: log.asset.branch.id,
          name: log.asset.branch.name,
        },
      },
      borrowingBranch: log.borrowing_branch
        ? {
            id: log.borrowing_branch.id,
            name: log.borrowing_branch.name,
            code: log.borrowing_branch.code,
          }
        : null,
      staff: log.staff
        ? {
            id: log.staff.id,
            firstName: log.staff.first_name,
            lastName: log.staff.last_name,
            email: log.staff.email,
            position: log.staff.position,
          }
        : null,
    }));

    return NextResponse.json(formattedLogs, { status: 200 });
  } catch (error: any) {
    console.error("Failed to fetch borrow logs:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const permission = await checkApiPermission(request, "assets", "edit");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const body = await request.json();
    const result = borrowAssetSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: z.treeifyError(result.error) },
        { status: 400 }
      );
    }

    const { assetId, staffId, borrowingBranchId, quantity, notes } = result.data;

    // Check if asset exists
    const asset = await prisma.assets.findUnique({
      where: { id: assetId },
      include: {
        borrow_logs: {
          where: { returned_at: null },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 400 });
    }

    // Check if staff exists if provided
    if (staffId) {
      const staff = await prisma.staff.findUnique({
        where: { id: staffId },
      });
      if (!staff) {
        return NextResponse.json({ error: "Staff member not found" }, { status: 400 });
      }
    }

    // Check if borrowing branch exists if provided
    if (borrowingBranchId) {
      const branch = await prisma.branches.findFirst({
        where: {
          id: borrowingBranchId,
          status: { not: "DELETED" },
        },
      });
      if (!branch) {
        return NextResponse.json({ error: "Borrowing branch not found or has been deleted" }, { status: 400 });
      }
    }

    // Calculate available quantity
    const borrowedCount = asset.borrow_logs.reduce((sum: number, log: { quantity: number }) => sum + log.quantity, 0);
    const availableQuantity = asset.quantity - borrowedCount;

    if (quantity > availableQuantity) {
      return NextResponse.json(
        { error: `Insufficient quantity available. Total: ${asset.quantity}, Currently Borrowed: ${borrowedCount}, Available: ${availableQuantity}, Requested: ${quantity}` },
        { status: 400 }
      );
    }

    const newLog = await prisma.asset_borrow_logs.create({
      data: {
        asset_id: assetId,
        staff_id: staffId || undefined,
        borrowing_branch_id: borrowingBranchId || undefined,
        quantity: quantity,
        notes: notes ? notes.trim() : null,
      },
      include: {
        asset: {
          include: {
            branch: true,
          },
        },
        staff: true,
        borrowing_branch: true,
      },
    });

    return NextResponse.json(newLog, { status: 201 });
  } catch (error: any) {
    console.error("Failed to borrow asset:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
