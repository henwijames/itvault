import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateAssetSchema } from "@/lib/validations/assets";
import { checkApiPermission } from "@/lib/rbac";
import { z } from "zod";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const permission = await checkApiPermission(request, "assets", "edit");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const { id } = await params;
    const body = await request.json();
    const result = updateAssetSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: z.treeifyError(result.error) },
        { status: 400 }
      );
    }

    const existing = await prisma.assets.findUnique({
      where: { id },
      include: {
        borrow_logs: {
          where: { returned_at: null }
        }
      }
    });

    if (!existing) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const data = result.data;

    if (data.branchId) {
      const branch = await prisma.branches.findFirst({
        where: {
          id: data.branchId,
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

    if (data.assetTag && data.assetTag !== existing.asset_tag) {
      const tagExists = await prisma.assets.findUnique({
        where: { asset_tag: data.assetTag },
      });
      if (tagExists) {
        return NextResponse.json(
          { error: "Asset Tag already exists" },
          { status: 400 }
        );
      }
    }

    if (data.quantity !== undefined) {
      const currentlyBorrowed = existing.borrow_logs.reduce((sum: number, log: { quantity: number }) => sum + log.quantity, 0);
      if (data.quantity < currentlyBorrowed) {
        return NextResponse.json(
          { error: `Cannot set quantity to ${data.quantity}. There are currently ${currentlyBorrowed} units borrowed by staff.` },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.assets.update({
      where: { id },
      data: {
        branch_id: data.branchId,
        asset_tag: data.assetTag !== undefined ? (data.assetTag ? data.assetTag.trim() : null) : undefined,
        name: data.name !== undefined ? data.name.trim() : undefined,
        category: data.category !== undefined ? data.category.trim() : undefined,
        brand: data.brand !== undefined ? (data.brand ? data.brand.trim() : null) : undefined,
        model: data.model !== undefined ? (data.model ? data.model.trim() : null) : undefined,
        serial_number: data.serialNumber !== undefined ? (data.serialNumber ? data.serialNumber.trim() : null) : undefined,
        purchase_date: data.purchaseDate !== undefined ? (data.purchaseDate ? new Date(data.purchaseDate) : null) : undefined,
        warranty_expiry: data.warrantyExpiry !== undefined ? (data.warrantyExpiry ? new Date(data.warrantyExpiry) : null) : undefined,
        status: data.status,
        quantity: data.quantity,
        notes: data.notes !== undefined ? (data.notes ? data.notes.trim() : null) : undefined,
      },
      include: {
        branch: true,
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    console.error("Failed to update asset:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const permission = await checkApiPermission(request, "assets", "delete");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const { id } = await params;

    const existing = await prisma.assets.findUnique({
      where: { id },
      include: {
        borrow_logs: {
          where: { returned_at: null }
        }
      }
    });

    if (!existing) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const currentlyBorrowed = existing.borrow_logs.reduce((sum: number, log: { quantity: number }) => sum + log.quantity, 0);
    if (currentlyBorrowed > 0) {
      return NextResponse.json(
        { error: "Cannot delete asset. There are active borrowing logs associated with this asset that have not been returned." },
        { status: 400 }
      );
    }

    await prisma.assets.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Asset deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Failed to delete asset:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
