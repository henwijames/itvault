import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/rbac";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const permission = await checkApiPermission(request, "assets", "edit");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const { id } = await params;

    const log = await prisma.asset_borrow_logs.findUnique({
      where: { id },
    });

    if (!log) {
      return NextResponse.json({ error: "Borrow log not found" }, { status: 404 });
    }

    if (log.returned_at) {
      return NextResponse.json({ error: "Assets have already been returned for this log" }, { status: 400 });
    }

    const updated = await prisma.asset_borrow_logs.update({
      where: { id },
      data: {
        returned_at: new Date(),
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    console.error("Failed to return assets:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
