import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSubscriptionSchema } from "@/lib/validations/subscriptions";
import { checkApiPermission } from "@/lib/rbac";
import { z } from "zod";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const permission = await checkApiPermission(request, "subscriptions", "view");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const subs = await prisma.subscriptions.findMany({
      include: {
        branch: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    const formattedSubs = subs.map((sub) => ({
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
    }));

    return NextResponse.json(formattedSubs, { status: 200 });
  } catch (error: any) {
    console.error("Failed to fetch subscriptions:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const permission = await checkApiPermission(request, "subscriptions", "create");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const body = await request.json();
    const result = createSubscriptionSchema.safeParse(body);

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

    // Verify branch exists and is not deleted
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

    const newSub = await prisma.subscriptions.create({
      data: {
        branch_id: branchId,
        name: name.trim(),
        provider: provider ? provider.trim() : null,
        account_email: accountEmail ? accountEmail.trim() : null,
        account_username: accountUsername ? accountUsername.trim() : null,
        account_password: accountPassword ? accountPassword.trim() : null,
        start_date: startDate ? new Date(startDate) : null,
        expiry_date: expiryDate ? new Date(expiryDate) : null,
        amount: amount ? parseFloat(amount) : null,
        status: status || undefined,
        notes: notes ? notes.trim() : null,
      },
      include: {
        branch: true,
      },
    });

    const formattedSub = {
      id: newSub.id,
      branchId: newSub.branch_id,
      name: newSub.name,
      provider: newSub.provider,
      accountEmail: newSub.account_email,
      accountUsername: newSub.account_username,
      accountPassword: newSub.account_password,
      startDate: newSub.start_date ? newSub.start_date.toISOString().split("T")[0] : null,
      expiryDate: newSub.expiry_date ? newSub.expiry_date.toISOString().split("T")[0] : null,
      amount: newSub.amount ? newSub.amount.toString() : null,
      status: newSub.status,
      notes: newSub.notes,
      createdAt: newSub.created_at,
      updatedAt: newSub.updated_at,
      branch: {
        id: newSub.branch.id,
        name: newSub.branch.name,
        code: newSub.branch.code,
      },
    };

    return NextResponse.json(formattedSub, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create subscription:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
