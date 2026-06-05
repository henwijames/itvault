import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createInternetAccountSchema } from "@/lib/validations/internet-accounts";
import { checkApiPermission } from "@/lib/rbac";
import { z } from "zod";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const permission = await checkApiPermission(request, "internet_accounts", "view");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const accounts = await prisma.internet_accounts.findMany({
      include: {
        branch: true,
        original_branch: true,
        account_holder: true,
        _count: {
          select: { migrations: true },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    const formattedAccounts = accounts.map((item) => ({
      id: item.id,
      branchId: item.branch_id,
      originalBranchId: item.original_branch_id,
      accountHolderId: item.account_holder_id,
      accountType: item.account_type,
      status: item.status,
      providerSource: item.provider_source,
      accountNumber: item.account_number,
      shipmentNumber: item.shipment_number,
      startDate: item.start_date ? item.start_date.toISOString().split("T")[0] : null,
      contractEndDate: item.contract_end_date ? item.contract_end_date.toISOString().split("T")[0] : null,
      notes: item.notes,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      branch: {
        id: item.branch.id,
        name: item.branch.name,
        code: item.branch.code,
      },
      originalBranch: item.original_branch
        ? {
            id: item.original_branch.id,
            name: item.original_branch.name,
            code: item.original_branch.code,
          }
        : null,
      accountHolder: item.account_holder
        ? {
            id: item.account_holder.id,
            firstName: item.account_holder.first_name,
            lastName: item.account_holder.last_name,
            position: item.account_holder.position,
            email: item.account_holder.email,
            mobileNumber: item.account_holder.mobile_number,
            contactNumber: item.account_holder.contact_number,
            dateOfBirth: item.account_holder.date_of_birth ? item.account_holder.date_of_birth.toISOString().split("T")[0] : null,
            emiratesIdNumber: item.account_holder.emirates_id_number,
            emiratesIdExpiry: item.account_holder.emirates_id_expiry ? item.account_holder.emirates_id_expiry.toISOString().split("T")[0] : null,
          }
        : null,
      migrationsCount: item._count.migrations,
    }));

    return NextResponse.json(formattedAccounts, { status: 200 });
  } catch (error: any) {
    console.error("Failed to fetch internet accounts:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const permission = await checkApiPermission(request, "internet_accounts", "create");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const body = await request.json();
    const result = createInternetAccountSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: z.treeifyError(result.error) },
        { status: 400 }
      );
    }

    const {
      branchId,
      originalBranchId,
      accountHolderId,
      accountType,
      status,
      providerSource,
      accountNumber,
      shipmentNumber,
      startDate,
      contractEndDate,
      notes,
    } = result.data;

    // Verify branch exists and is active
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

    // Verify original branch exists if provided
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

    // Verify account holder exists if provided
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

    const newAccount = await prisma.internet_accounts.create({
      data: {
        branch_id: branchId,
        original_branch_id: originalBranchId || null,
        account_holder_id: accountHolderId || null,
        account_type: accountType,
        status: status || undefined,
        provider_source: providerSource ? providerSource.trim() : null,
        account_number: accountNumber.trim(),
        shipment_number: shipmentNumber ? shipmentNumber.trim() : null,
        start_date: startDate ? new Date(startDate) : null,
        contract_end_date: contractEndDate ? new Date(contractEndDate) : null,
        notes: notes ? notes.trim() : null,
      },
      include: {
        branch: true,
        original_branch: true,
        account_holder: true,
      },
    });

    const formattedAccount = {
      id: newAccount.id,
      branchId: newAccount.branch_id,
      originalBranchId: newAccount.original_branch_id,
      accountHolderId: newAccount.account_holder_id,
      accountType: newAccount.account_type,
      status: newAccount.status,
      providerSource: newAccount.provider_source,
      accountNumber: newAccount.account_number,
      shipmentNumber: newAccount.shipment_number,
      startDate: newAccount.start_date ? newAccount.start_date.toISOString().split("T")[0] : null,
      contractEndDate: newAccount.contract_end_date ? newAccount.contract_end_date.toISOString().split("T")[0] : null,
      notes: newAccount.notes,
      createdAt: newAccount.created_at,
      updatedAt: newAccount.updated_at,
      branch: {
        id: newAccount.branch.id,
        name: newAccount.branch.name,
        code: newAccount.branch.code,
      },
      originalBranch: newAccount.original_branch
        ? {
            id: newAccount.original_branch.id,
            name: newAccount.original_branch.name,
            code: newAccount.original_branch.code,
          }
        : null,
      accountHolder: newAccount.account_holder
        ? {
            id: newAccount.account_holder.id,
            firstName: newAccount.account_holder.first_name,
            lastName: newAccount.account_holder.last_name,
            position: newAccount.account_holder.position,
          }
        : null,
      migrationsCount: 0,
    };

    return NextResponse.json(formattedAccount, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create internet account:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
