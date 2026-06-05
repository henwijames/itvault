import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCommentSchema } from "@/lib/validations/tickets";
import { checkApiPermission } from "@/lib/rbac";
import { z } from "zod";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const permission = await checkApiPermission(request, "tickets", "view");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const currentUserId = permission.payload!.userId;
    const currentUserName = permission.payload!.name;

    const body = await request.json();
    const result = createCommentSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: z.treeifyError(result.error) },
        { status: 400 }
      );
    }

    const { comment } = result.data;

    // Verify ticket exists
    const ticket = await prisma.tickets.findUnique({
      where: { id },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const newComment = await prisma.$transaction(async (tx) => {
      const c = await tx.ticket_comments.create({
        data: {
          ticket_id: id,
          user_id: currentUserId,
          comment: comment.trim(),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Add to ticket activities
      await tx.ticket_activities.create({
        data: {
          ticket_id: id,
          action: "COMMENT_ADDED",
          description: `${currentUserName} added a comment`,
        },
      });

      return c;
    });

    return NextResponse.json(newComment, { status: 201 });
  } catch (error: any) {
    console.error("Failed to add comment:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
