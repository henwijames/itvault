import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAssetSchema } from "@/lib/validations/assets";
import { checkApiPermission } from "@/lib/rbac";
import { z } from "zod";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const permission = await checkApiPermission(request, "assets", "view");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const assets = await prisma.assets.findMany({
      include: {
        branch: true,
        borrow_logs: {
          where: {
            returned_at: null,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    const formattedAssets = assets.map((asset) => {
      const borrowedCount = asset.borrow_logs.reduce((sum: number, log: { quantity: number }) => sum + log.quantity, 0);
      return {
        id: asset.id,
        branchId: asset.branch_id,
        assetTag: asset.asset_tag,
        name: asset.name,
        category: asset.category,
        brand: asset.brand,
        model: asset.model,
        serialNumber: asset.serial_number,
        purchaseDate: asset.purchase_date ? asset.purchase_date.toISOString().split("T")[0] : null,
        warrantyExpiry: asset.warranty_expiry ? asset.warranty_expiry.toISOString().split("T")[0] : null,
        status: asset.status,
        quantity: asset.quantity,
        borrowedQuantity: borrowedCount,
        availableQuantity: Math.max(0, asset.quantity - borrowedCount),
        notes: asset.notes,
        createdAt: asset.created_at,
        updatedAt: asset.updated_at,
        branch: {
          id: asset.branch.id,
          name: asset.branch.name,
          code: asset.branch.code,
        },
      };
    });

    return NextResponse.json(formattedAssets, { status: 200 });
  } catch (error: any) {
    console.error("Failed to fetch assets:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const permission = await checkApiPermission(request, "assets", "create");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const body = await request.json();
    const result = createAssetSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: z.treeifyError(result.error) },
        { status: 400 }
      );
    }

    const {
      branchId,
      assetTag,
      name,
      category,
      brand,
      model,
      serialNumber,
      purchaseDate,
      warrantyExpiry,
      status,
      quantity,
      notes,
    } = result.data;

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

    if (assetTag) {
      const existingAsset = await prisma.assets.findUnique({
        where: { asset_tag: assetTag },
      });
      if (existingAsset) {
        return NextResponse.json(
          { error: "Asset Tag already exists" },
          { status: 400 }
        );
      }
    }

    const newAsset = await prisma.assets.create({
      data: {
        branch_id: branchId,
        asset_tag: assetTag ? assetTag.trim() : null,
        name: name.trim(),
        category: category.trim(),
        brand: brand ? brand.trim() : null,
        model: model ? model.trim() : null,
        serial_number: serialNumber ? serialNumber.trim() : null,
        purchase_date: purchaseDate ? new Date(purchaseDate) : null,
        warranty_expiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
        status: status || undefined,
        quantity: quantity,
        notes: notes ? notes.trim() : null,
      },
      include: {
        branch: true,
      },
    });

    return NextResponse.json(newAsset, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create asset:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
