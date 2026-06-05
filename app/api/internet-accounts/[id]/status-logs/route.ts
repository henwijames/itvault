import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/rbac";

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

    const logs = await prisma.internet_account_status_logs.findMany({
      where: { internet_account_id: id },
      orderBy: { created_at: "desc" },
    });

    const formattedLogs = logs.map((log) => ({
      id: log.id,
      internetAccountId: log.internet_account_id,
      status: log.status,
      notes: log.notes,
      createdAt: log.created_at,
    }));

    return NextResponse.json(formattedLogs, { status: 200 });
  } catch (error: any) {
    console.error("Failed to fetch internet account status logs:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
