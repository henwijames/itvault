import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateInternetAccountSchema } from "@/lib/validations/internet-accounts";
import { checkApiPermission } from "@/lib/rbac";
import { z } from "zod";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const permission = await checkApiPermission(request, "internet_accounts", "view");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const { id } = await params;

    const account = await prisma.internet_accounts.findUnique({
      where: { id },
      include: {
        branch: true,
        original_branch: true,
        account_holder: true,
        _count: {
          select: { migrations: true },
        },
      },
    });

    if (!account) {
      return NextResponse.json({ error: "Internet account not found" }, { status: 404 });
    }

    const formattedAccount = {
      id: account.id,
      branchId: account.branch_id,
      originalBranchId: account.original_branch_id,
      accountHolderId: account.account_holder_id,
      accountType: account.account_type,
      status: account.status,
      providerSource: account.provider_source,
      accountNumber: account.account_number,
      shipmentNumber: account.shipment_number,
      startDate: account.start_date ? account.start_date.toISOString().split("T")[0] : null,
      contractEndDate: account.contract_end_date ? account.contract_end_date.toISOString().split("T")[0] : null,
      notes: account.notes,
      createdAt: account.created_at,
      updatedAt: account.updated_at,
      branch: {
        id: account.branch.id,
        name: account.branch.name,
        code: account.branch.code,
      },
      originalBranch: account.original_branch
        ? {
            id: account.original_branch.id,
            name: account.original_branch.name,
            code: account.original_branch.code,
          }
        : null,
      accountHolder: account.account_holder
        ? {
            id: account.account_holder.id,
            firstName: account.account_holder.first_name,
            lastName: account.account_holder.last_name,
            position: account.account_holder.position,
          }
        : null,
      migrationsCount: account._count.migrations,
    };

    return NextResponse.json(formattedAccount, { status: 200 });
  } catch (error: any) {
    console.error("Failed to fetch internet account details:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const permission = await checkApiPermission(request, "internet_accounts", "edit");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const { id } = await params;

    const body = await request.json();
    const result = updateInternetAccountSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: z.treeifyError(result.error) },
        { status: 400 }
      );
    }

    const existingAccount = await prisma.internet_accounts.findUnique({
      where: { id },
    });

    if (!existingAccount) {
      return NextResponse.json({ error: "Internet account not found" }, { status: 404 });
    }

    const {
      branchId,
      originalBranchId,
      accountHolderId,
      accountType,
      status,
      statusNotes,
      providerSource,
      accountNumber,
      shipmentNumber,
      startDate,
      contractEndDate,
      notes,
    } = result.data;

    // Validate branch exists if it's changing
    if (branchId && branchId !== existingAccount.branch_id) {
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
    }

    // Validate original branch exists if it's changing
    if (originalBranchId !== undefined && originalBranchId !== existingAccount.original_branch_id) {
      if (originalBranchId) {
        const origBranch = await prisma.branches.findFirst({
          where: {
            id: originalBranchId,
            status: { not: "DELETED" },
          },
        });
        if (!origBranch) {
          return NextResponse.json(
            { error: "Selected original branch does not exist or has been deleted" },
            { status: 400 }
          );
        }
      }
    }

    // Validate account holder exists if it's changing
    if (accountHolderId !== undefined && accountHolderId !== existingAccount.account_holder_id) {
      if (accountHolderId) {
        const staff = await prisma.staff.findUnique({
          where: { id: accountHolderId },
        });
        if (!staff) {
          return NextResponse.json(
            { error: "Selected account holder (staff) does not exist" },
            { status: 400 }
          );
        }
      }
    }

    const updatedAccount = await prisma.$transaction(async (tx) => {
      // 1. Log status update if changed
      if (status && status !== existingAccount.status) {
        await tx.internet_account_status_logs.create({
          data: {
            internet_account_id: id,
            status,
            notes: statusNotes ? statusNotes.trim() : "Status updated by user",
          },
        });
      }

      // 2. Perform updates
      return tx.internet_accounts.update({
        where: { id },
        data: {
          branch_id: branchId || undefined,
          original_branch_id: originalBranchId !== undefined ? originalBranchId : undefined,
          account_holder_id: accountHolderId !== undefined ? accountHolderId : undefined,
          account_type: accountType || undefined,
          status: status || undefined,
          provider_source: providerSource !== undefined ? (providerSource ? providerSource.trim() : null) : undefined,
          account_number: accountNumber !== undefined ? accountNumber.trim() : undefined,
          shipment_number: shipmentNumber !== undefined ? (shipmentNumber ? shipmentNumber.trim() : null) : undefined,
          start_date: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
          contract_end_date: contractEndDate !== undefined ? (contractEndDate ? new Date(contractEndDate) : null) : undefined,
          notes: notes !== undefined ? (notes ? notes.trim() : null) : undefined,
        },
        include: {
          branch: true,
          original_branch: true,
          account_holder: true,
          _count: {
            select: { migrations: true },
          },
        },
      });
    });

    const formattedAccount = {
      id: updatedAccount.id,
      branchId: updatedAccount.branch_id,
      originalBranchId: updatedAccount.original_branch_id,
      accountHolderId: updatedAccount.account_holder_id,
      accountType: updatedAccount.account_type,
      status: updatedAccount.status,
      providerSource: updatedAccount.provider_source,
      accountNumber: updatedAccount.account_number,
      shipmentNumber: updatedAccount.shipment_number,
      startDate: updatedAccount.start_date ? updatedAccount.start_date.toISOString().split("T")[0] : null,
      contractEndDate: updatedAccount.contract_end_date ? updatedAccount.contract_end_date.toISOString().split("T")[0] : null,
      notes: updatedAccount.notes,
      createdAt: updatedAccount.created_at,
      updatedAt: updatedAccount.updated_at,
      branch: {
        id: updatedAccount.branch.id,
        name: updatedAccount.branch.name,
        code: updatedAccount.branch.code,
      },
      originalBranch: updatedAccount.original_branch
        ? {
            id: updatedAccount.original_branch.id,
            name: updatedAccount.original_branch.name,
            code: updatedAccount.original_branch.code,
          }
        : null,
      accountHolder: updatedAccount.account_holder
        ? {
            id: updatedAccount.account_holder.id,
            firstName: updatedAccount.account_holder.first_name,
            lastName: updatedAccount.account_holder.last_name,
            position: updatedAccount.account_holder.position,
          }
        : null,
      migrationsCount: updatedAccount._count.migrations,
    };

    return NextResponse.json(formattedAccount, { status: 200 });
  } catch (error: any) {
    console.error("Failed to update internet account:", error);
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
    const permission = await checkApiPermission(request, "internet_accounts", "delete");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const { id } = await params;

    const existingAccount = await prisma.internet_accounts.findUnique({
      where: { id },
    });

    if (!existingAccount) {
      return NextResponse.json({ error: "Internet account not found" }, { status: 404 });
    }

    // Wrap in a transaction to clean up migrations and status logs first
    await prisma.$transaction([
      prisma.internet_account_migrations.deleteMany({
        where: { internet_account_id: id },
      }),
      prisma.internet_account_status_logs.deleteMany({
        where: { internet_account_id: id },
      }),
      prisma.internet_accounts.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({ message: "Internet account deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Failed to delete internet account:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
