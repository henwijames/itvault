import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/rbac";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const permission = await checkApiPermission(request, "tickets", "view");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    let categories = await prisma.ticket_categories.findMany({
      orderBy: {
        name: "asc",
      },
    });

    if (categories.length === 0) {
      const defaults = [
        { name: "Hardware", description: "Hardware-related issues (PCs, laptops, printers, peripherals)" },
        { name: "Software", description: "Software, OS, local application or cloud service issues" },
        { name: "Network", description: "Connectivity, Wi-Fi, switches, routers or VPN problems" },
        { name: "Access & Permissions", description: "Password resets, email accounts, folder access or roles" },
        { name: "General Inquiry", description: "General IT questions, requests or assistance" },
      ];

      await prisma.ticket_categories.createMany({
        data: defaults,
      });

      categories = await prisma.ticket_categories.findMany({
        orderBy: {
          name: "asc",
        },
      });
    }

    const formattedCategories = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
    }));

    return NextResponse.json(formattedCategories, { status: 200 });
  } catch (error: any) {
    console.error("Failed to fetch ticket categories:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const permission = await checkApiPermission(request, "tickets", "create");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const { createCategorySchema } = await import("@/lib/validations/categories");
    const { z } = await import("zod");

    const body = await request.json();
    const result = createCategorySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: z.treeifyError(result.error) },
        { status: 400 }
      );
    }

    const { name, description } = result.data;

    // Check if category name already exists
    const existing = await prisma.ticket_categories.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A category with this name already exists" },
        { status: 400 }
      );
    }

    const newCategory = await prisma.ticket_categories.create({
      data: {
        name: name.trim(),
        description: description ? description.trim() : null,
      },
    });

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create ticket category:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
