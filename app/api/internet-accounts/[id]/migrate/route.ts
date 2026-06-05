import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { migrateInternetAccountSchema } from "@/lib/validations/internet-accounts";
import { checkApiPermission } from "@/lib/rbac";
import { z } from "zod";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET: Fetch migration history for this internet account
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

    const migrations = await prisma.internet_account_migrations.findMany({
      where: { internet_account_id: id },
      include: {
        internet_account: true,
      },
      orderBy: {
        migrated_at: "desc",
      },
    });

    // We also want to resolve the names of from_branch and to_branch
    const branchIds = new Set<string>();
    migrations.forEach((m) => {
      branchIds.add(m.from_branch_id);
      branchIds.add(m.to_branch_id);
    });

    const branches = await prisma.branches.findMany({
      where: { id: { in: Array.from(branchIds) } },
      select: { id: true, name: true, code: true },
    });

    const branchMap = new Map(branches.map((b) => [b.id, b]));

    const formattedMigrations = migrations.map((m) => {
      const fromBranch = branchMap.get(m.from_branch_id);
      const toBranch = branchMap.get(m.to_branch_id);
      return {
        id: m.id,
        internetAccountId: m.internet_account_id,
        fromBranchId: m.from_branch_id,
        toBranchId: m.to_branch_id,
        reason: m.reason,
        migratedAt: m.migrated_at,
        fromBranch: fromBranch
          ? {
              id: fromBranch.id,
              name: fromBranch.name,
              code: fromBranch.code,
            }
          : null,
        toBranch: toBranch
          ? {
              id: toBranch.id,
              name: toBranch.name,
              code: toBranch.code,
            }
          : null,
      };
    });

    return NextResponse.json(formattedMigrations, { status: 200 });
  } catch (error: any) {
    console.error("Failed to fetch migration history:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

// POST: Execute account branch migration
export async function POST(
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
    const result = migrateInternetAccountSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: z.treeifyError(result.error) },
        { status: 400 }
      );
    }

    const { toBranchId, reason } = result.data;

    // Verify account exists
    const account = await prisma.internet_accounts.findUnique({
      where: { id },
    });

    if (!account) {
      return NextResponse.json({ error: "Internet account not found" }, { status: 404 });
    }

    // Verify target branch exists
    const targetBranch = await prisma.branches.findFirst({
      where: {
        id: toBranchId,
        status: { not: "DELETED" },
      },
    });

    if (!targetBranch) {
      return NextResponse.json(
        { error: "Target branch does not exist or has been deleted" },
        { status: 400 }
      );
    }

    if (account.branch_id === toBranchId) {
      return NextResponse.json(
        { error: "Internet account is already registered at this branch" },
        { status: 400 }
      );
    }

    const migration = await prisma.$transaction(async (tx) => {
      // 1. Create migration history entry
      const log = await tx.internet_account_migrations.create({
        data: {
          internet_account_id: id,
          from_branch_id: account.branch_id,
          to_branch_id: toBranchId,
          reason: reason ? reason.trim() : null,
        },
      });

      // 2. Update current branch, and original branch if it was null
      await tx.internet_accounts.update({
        where: { id },
        data: {
          branch_id: toBranchId,
          original_branch_id: account.original_branch_id ? undefined : account.branch_id,
        },
      });

      return log;
    });

    return NextResponse.json(migration, { status: 201 });
  } catch (error: any) {
    console.error("Failed to migrate internet account:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
