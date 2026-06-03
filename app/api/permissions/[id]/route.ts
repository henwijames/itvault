import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updatePermissionSchema } from "@/lib/validations/permissions";
import { checkApiPermission } from "@/lib/rbac";
import { z } from "zod";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const permission = await checkApiPermission(request, "permissions", "view");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const { id } = await params;

    const perm = await prisma.permissions.findFirst({
      where: { id, status: { not: "DELETED" } },
    });

    if (!perm) {
      return NextResponse.json({ error: "Permission not found" }, { status: 404 });
    }

    return NextResponse.json(perm, { status: 200 });
  } catch (error: any) {
    console.error("Failed to fetch permission details:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const permission = await checkApiPermission(request, "permissions", "edit");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const { id } = await params;

    const body = await request.json();
    const result = updatePermissionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: z.treeifyError(result.error) },
        { status: 400 }
      );
    }

    const { name, key, description } = result.data;
    const status = body.status; // status is not in zschema but we can support it if sent (e.g. INACTIVE, ACTIVE)

    // Check if permission exists
    const existingPerm = await prisma.permissions.findFirst({
      where: { id, status: { not: "DELETED" } },
    });
    if (!existingPerm) {
      return NextResponse.json({ error: "Permission not found" }, { status: 404 });
    }

    let finalKey = undefined;
    if (key !== undefined) {
      finalKey = (key && key.trim() !== "") ? key.trim() : (name || existingPerm.name).trim().toLowerCase().replace(/\s+/g, "_");
    }

    // Name uniqueness check if changing
    if (name && name.trim() !== existingPerm.name) {
      const nameConflict = await prisma.permissions.findFirst({
        where: { name: name.trim(), status: { not: "DELETED" } },
      });
      if (nameConflict) {
        return NextResponse.json(
          { error: "A permission with this name already exists" },
          { status: 400 }
        );
      }
    }

    // Key uniqueness check if changing
    if (finalKey && finalKey !== existingPerm.key) {
      const keyConflict = await prisma.permissions.findFirst({
        where: { key: finalKey, status: { not: "DELETED" } },
      });
      if (keyConflict) {
        return NextResponse.json(
          { error: "A permission with this key already exists" },
          { status: 400 }
        );
      }
    }

    // Support updating status if valid
    const allowedStatuses = ["ACTIVE", "INACTIVE"];
    const statusData = allowedStatuses.includes(status) ? status : undefined;

    const updatedPerm = await prisma.permissions.update({
      where: { id },
      data: {
        name: name ? name.trim() : undefined,
        key: finalKey,
        description: description !== undefined ? (description ? description.trim() : null) : undefined,
        status: statusData as any,
      },
    });

    return NextResponse.json(updatedPerm, { status: 200 });
  } catch (error: any) {
    console.error("Failed to update permission:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const permission = await checkApiPermission(request, "permissions", "delete");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const { id } = await params;


    const existingPerm = await prisma.permissions.findFirst({
      where: { id, status: { not: "DELETED" } },
    });
    if (!existingPerm) {
      return NextResponse.json({ error: "Permission not found" }, { status: 404 });
    }

    const timestamp = Date.now();
    await prisma.$transaction(async (tx) => {
      // Remove associations with roles
      await tx.role_permissions.deleteMany({
        where: { permission_id: id },
      });

      // Soft-delete the permission and append a suffix to release name/key constraints
      await tx.permissions.update({
        where: { id },
        data: {
          status: "DELETED",
          name: `${existingPerm.name}_deleted_${timestamp}`,
          key: `${existingPerm.key}_deleted_${timestamp}`,
        },
      });
    });

    return NextResponse.json({ message: "Permission deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Failed to delete permission:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
