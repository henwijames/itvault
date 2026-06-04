import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateBranchSchema } from "@/lib/validations/branches";
import { checkApiPermission } from "@/lib/rbac";
import { z } from "zod";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const permission = await checkApiPermission(request, "branches", "view");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const { id } = await params;

    const branch = await prisma.branches.findFirst({
      where: { id, status: { not: "DELETED" } },
    });

    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    const formattedBranch = {
      id: branch.id,
      name: branch.name,
      code: branch.code,
      address: branch.address,
      status: branch.status,
      createdAt: branch.created_at,
      updatedAt: branch.updated_at,
    };

    return NextResponse.json(formattedBranch, { status: 200 });
  } catch (error: any) {
    console.error("Failed to fetch branch details:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const permission = await checkApiPermission(request, "branches", "edit");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const { id } = await params;

    const body = await request.json();
    const result = updateBranchSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: z.treeifyError(result.error) },
        { status: 400 }
      );
    }

    const { name, code, address, status } = result.data;

    // Check if branch exists
    const existingBranch = await prisma.branches.findFirst({
      where: { id, status: { not: "DELETED" } },
    });
    if (!existingBranch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    // Name uniqueness check if changing
    if (name && name.trim() !== existingBranch.name) {
      const nameConflict = await prisma.branches.findFirst({
        where: { name: name.trim(), status: { not: "DELETED" } },
      });
      if (nameConflict) {
        return NextResponse.json(
          { error: "A branch with this name already exists" },
          { status: 400 }
        );
      }
    }

    // Code uniqueness check if changing
    if (code && code.trim() && code.trim().toLowerCase() !== existingBranch.code) {
      const codeConflict = await prisma.branches.findFirst({
        where: { code: code.trim().toLowerCase(), status: { not: "DELETED" } },
      });
      if (codeConflict) {
        return NextResponse.json(
          { error: "A branch with this code already exists" },
          { status: 400 }
        );
      }
    }

    const updatedBranch = await prisma.$transaction(async (tx) => {
      const updated = await tx.branches.update({
        where: { id },
        data: {
          name: name ? name.trim() : undefined,
          code: code !== undefined ? (code ? code.trim().toLowerCase() : null) : undefined,
          address: address !== undefined ? (address ? address.trim() : null) : undefined,
          status: status || undefined,
        },
      });

      return tx.branches.findUnique({
        where: { id },
      });
    });

    if (!updatedBranch) {
      throw new Error("Failed to retrieve updated branch");
    }

    const formattedBranch = {
      id: updatedBranch.id,
      name: updatedBranch.name,
      code: updatedBranch.code,
      address: updatedBranch.address,
      status: updatedBranch.status,
      createdAt: updatedBranch.created_at,
      updatedAt: updatedBranch.updated_at,
    };

    return NextResponse.json(formattedBranch, { status: 200 });
  } catch (error: any) {
    console.error("Failed to update branch:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const permission = await checkApiPermission(request, "branches", "delete");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const { id } = await params;

    const existingBranch = await prisma.branches.findFirst({
      where: { id, status: { not: "DELETED" } },
    });
    if (!existingBranch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Soft-delete the branch by updating status to DELETED
      await tx.branches.update({
        where: { id },
        data: {
          status: "DELETED",
        },
      });
    });

    return NextResponse.json({ message: "Branch deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Failed to delete branch:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
