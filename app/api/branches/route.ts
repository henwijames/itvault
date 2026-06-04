import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createBranchSchema } from "@/lib/validations/branches";
import { checkApiPermission } from "@/lib/rbac";
import { z } from "zod";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const permission = await checkApiPermission(request, "branches", "view");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const branchesList = await prisma.branches.findMany({
      where: {
        status: {
          not: "DELETED",
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    const formattedBranches = branchesList.map((branch) => ({
      id: branch.id,
      name: branch.name,
      code: branch.code,
      address: branch.address,
      status: branch.status,
      createdAt: branch.created_at,
      updatedAt: branch.updated_at,
    }));

    return NextResponse.json(formattedBranches, { status: 200 });
  } catch (error: any) {
    console.error("Failed to fetch branches:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const permission = await checkApiPermission(request, "branches", "create");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const body = await request.json();
    const result = createBranchSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: z.treeifyError(result.error) },
        { status: 400 }
      );
    }

    const { name, code, address } = result.data;

    // Check if branch name already exists (excluding deleted ones)
    const existingName = await prisma.branches.findFirst({
      where: {
        name: name.trim(),
        status: { not: "DELETED" },
      },
    });
    if (existingName) {
      return NextResponse.json(
        { error: "A branch with this name already exists" },
        { status: 400 }
      );
    }

    if (code && code.trim()) {
      // Check if branch code already exists (excluding deleted ones)
      const existingCode = await prisma.branches.findFirst({
        where: {
          code: code.trim().toLowerCase(),
          status: { not: "DELETED" },
        },
      });
      if (existingCode) {
        return NextResponse.json(
          { error: "A branch with this code already exists" },
          { status: 400 }
        );
      }
    }

    const newBranch = await prisma.$transaction(async (tx) => {
      const branch = await tx.branches.create({
        data: {
          name: name.trim(),
          code: code ? code.trim().toLowerCase() : null,
          address: address ? address.trim() : null,
          status: "ACTIVE",
        },
      });

      return tx.branches.findUnique({
        where: { id: branch.id },
      });
    });

    if (!newBranch) {
      throw new Error("Failed to retrieve created branch");
    }

    const formattedBranch = {
      id: newBranch.id,
      name: newBranch.name,
      code: newBranch.code,
      address: newBranch.address,
      status: newBranch.status,
      createdAt: newBranch.created_at,
      updatedAt: newBranch.updated_at,
    };

    return NextResponse.json(formattedBranch, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create branch:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
