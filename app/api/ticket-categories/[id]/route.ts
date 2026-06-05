import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateCategorySchema } from "@/lib/validations/categories";
import { checkApiPermission } from "@/lib/rbac";
import { z } from "zod";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const permission = await checkApiPermission(request, "tickets", "edit");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const body = await request.json();
    const result = updateCategorySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: z.treeifyError(result.error) },
        { status: 400 }
      );
    }

    const { name, description } = result.data;

    const existing = await prisma.ticket_categories.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    if (name && name.trim() !== existing.name) {
      // Check duplicate name
      const duplicate = await prisma.ticket_categories.findUnique({
        where: { name: name.trim() },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "Another category with this name already exists" },
          { status: 400 }
        );
      }
    }

    const updatedCategory = await prisma.ticket_categories.update({
      where: { id },
      data: {
        name: name ? name.trim() : undefined,
        description: description !== undefined ? (description ? description.trim() : null) : undefined,
      },
    });

    return NextResponse.json(updatedCategory, { status: 200 });
  } catch (error: any) {
    console.error("Failed to update ticket category:", error);
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
    const { id } = await params;
    const permission = await checkApiPermission(request, "tickets", "delete");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const existing = await prisma.ticket_categories.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Disconnect category relation on tickets
      await tx.tickets.updateMany({
        where: { category_id: id },
        data: { category_id: null },
      });

      await tx.ticket_categories.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Failed to delete ticket category:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
