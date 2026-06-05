import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateSubscriptionSchema } from "@/lib/validations/subscriptions";
import { checkApiPermission } from "@/lib/rbac";
import { z } from "zod";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const permission = await checkApiPermission(request, "subscriptions", "view");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const { id } = await params;

    const sub = await prisma.subscriptions.findUnique({
      where: { id },
      include: { branch: true },
    });

    if (!sub) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    const formattedSub = {
      id: sub.id,
      branchId: sub.branch_id,
      name: sub.name,
      provider: sub.provider,
      accountEmail: sub.account_email,
      accountUsername: sub.account_username,
      accountPassword: sub.account_password,
      startDate: sub.start_date ? sub.start_date.toISOString().split("T")[0] : null,
      expiryDate: sub.expiry_date ? sub.expiry_date.toISOString().split("T")[0] : null,
      amount: sub.amount ? sub.amount.toString() : null,
      status: sub.status,
      notes: sub.notes,
      createdAt: sub.created_at,
      updatedAt: sub.updated_at,
      branch: {
        id: sub.branch.id,
        name: sub.branch.name,
        code: sub.branch.code,
      },
    };

    return NextResponse.json(formattedSub, { status: 200 });
  } catch (error: any) {
    console.error("Failed to fetch subscription details:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const permission = await checkApiPermission(request, "subscriptions", "edit");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const { id } = await params;

    const body = await request.json();
    const result = updateSubscriptionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: z.treeifyError(result.error) },
        { status: 400 }
      );
    }

    const {
      branchId,
      name,
      provider,
      accountEmail,
      accountUsername,
      accountPassword,
      startDate,
      expiryDate,
      amount,
      status,
      notes,
    } = result.data;

    // Check if subscription exists
    const existingSub = await prisma.subscriptions.findUnique({
      where: { id },
    });
    if (!existingSub) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    // Verify branch if changed
    if (branchId && branchId !== existingSub.branch_id) {
      const branchExists = await prisma.branches.findFirst({
        where: {
          id: branchId,
          status: { not: "DELETED" },
        },
      });
      if (!branchExists) {
        return NextResponse.json(
          { error: "Selected branch does not exist or has been deleted" },
          { status: 400 }
        );
      }
    }

    const updatedSub = await prisma.subscriptions.update({
      where: { id },
      data: {
        branch_id: branchId || undefined,
        name: name ? name.trim() : undefined,
        provider: provider !== undefined ? (provider ? provider.trim() : null) : undefined,
        account_email: accountEmail !== undefined ? (accountEmail ? accountEmail.trim() : null) : undefined,
        account_username: accountUsername !== undefined ? (accountUsername ? accountUsername.trim() : null) : undefined,
        account_password: accountPassword !== undefined ? (accountPassword ? accountPassword.trim() : null) : undefined,
        start_date: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
        expiry_date: expiryDate !== undefined ? (expiryDate ? new Date(expiryDate) : null) : undefined,
        amount: amount !== undefined ? (amount ? parseFloat(amount) : null) : undefined,
        status: status || undefined,
        notes: notes !== undefined ? (notes ? notes.trim() : null) : undefined,
      },
      include: {
        branch: true,
      },
    });

    const formattedSub = {
      id: updatedSub.id,
      branchId: updatedSub.branch_id,
      name: updatedSub.name,
      provider: updatedSub.provider,
      accountEmail: updatedSub.account_email,
      accountUsername: updatedSub.account_username,
      accountPassword: updatedSub.account_password,
      startDate: updatedSub.start_date ? updatedSub.start_date.toISOString().split("T")[0] : null,
      expiryDate: updatedSub.expiry_date ? updatedSub.expiry_date.toISOString().split("T")[0] : null,
      amount: updatedSub.amount ? updatedSub.amount.toString() : null,
      status: updatedSub.status,
      notes: updatedSub.notes,
      createdAt: updatedSub.created_at,
      updatedAt: updatedSub.updated_at,
      branch: {
        id: updatedSub.branch.id,
        name: updatedSub.branch.name,
        code: updatedSub.branch.code,
      },
    };

    return NextResponse.json(formattedSub, { status: 200 });
  } catch (error: any) {
    console.error("Failed to update subscription:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const permission = await checkApiPermission(request, "subscriptions", "delete");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const { id } = await params;

    const existingSub = await prisma.subscriptions.findUnique({
      where: { id },
    });
    if (!existingSub) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    await prisma.subscriptions.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Subscription deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Failed to delete subscription:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
