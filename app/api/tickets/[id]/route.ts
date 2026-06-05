import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateTicketSchema } from "@/lib/validations/tickets";
import { checkApiPermission } from "@/lib/rbac";
import { z } from "zod";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const permission = await checkApiPermission(request, "tickets", "view");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const ticket = await prisma.tickets.findUnique({
      where: { id },
      include: {
        branch: true,
        staff: true,
        category: true,
        created_by: true,
        assigned_to: true,
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            created_at: "asc",
          },
        },
        activities: {
          orderBy: {
            created_at: "desc",
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const formattedTicket = {
      id: ticket.id,
      ticketNumber: ticket.ticket_number,
      branchId: ticket.branch_id,
      staffId: ticket.staff_id,
      categoryId: ticket.category_id,
      createdById: ticket.created_by_id,
      assignedToId: ticket.assigned_to_id,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      responseDueAt: ticket.response_due_at ? ticket.response_due_at.toISOString().split("T")[0] : null,
      resolvedAt: ticket.resolved_at ? ticket.resolved_at.toISOString() : null,
      closedAt: ticket.closed_at ? ticket.closed_at.toISOString() : null,
      createdAt: ticket.created_at.toISOString(),
      updatedAt: ticket.updated_at.toISOString(),
      branch: {
        id: ticket.branch.id,
        name: ticket.branch.name,
        code: ticket.branch.code,
      },
      staff: ticket.staff ? {
        id: ticket.staff.id,
        firstName: ticket.staff.first_name,
        lastName: ticket.staff.last_name,
        email: ticket.staff.email,
      } : null,
      category: ticket.category ? {
        id: ticket.category.id,
        name: ticket.category.name,
      } : null,
      createdBy: {
        id: ticket.created_by.id,
        name: ticket.created_by.name,
        email: ticket.created_by.email,
      },
      assignedTo: ticket.assigned_to ? {
        id: ticket.assigned_to.id,
        name: ticket.assigned_to.name,
        email: ticket.assigned_to.email,
      } : null,
      comments: ticket.comments.map((c) => ({
        id: c.id,
        comment: c.comment,
        createdAt: c.created_at.toISOString(),
        user: c.user,
      })),
      activities: ticket.activities.map((act) => ({
        id: act.id,
        action: act.action,
        description: act.description,
        createdAt: act.created_at.toISOString(),
      })),
    };

    return NextResponse.json(formattedTicket, { status: 200 });
  } catch (error: any) {
    console.error("Failed to fetch ticket details:", error);
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
    const { id } = await params;
    const permission = await checkApiPermission(request, "tickets", "edit");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const currentUserId = permission.payload!.userId;
    const currentUserName = permission.payload!.name;

    const body = await request.json();
    const result = updateTicketSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: z.treeifyError(result.error) },
        { status: 400 }
      );
    }

    // Fetch current state of ticket
    const oldTicket = await prisma.tickets.findUnique({
      where: { id },
      include: { assigned_to: true },
    });

    if (!oldTicket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const {
      branchId,
      staffId,
      categoryId,
      assignedToId,
      title,
      description,
      status,
      priority,
      responseDueAt,
    } = result.data;

    // Track activity changes
    const activityLogs: { action: string; description: string }[] = [];

    if (status && status !== oldTicket.status) {
      activityLogs.push({
        action: "STATUS_CHANGE",
        description: `Status changed from ${oldTicket.status} to ${status} by ${currentUserName}`,
      });
    }

    if (priority && priority !== oldTicket.priority) {
      activityLogs.push({
        action: "PRIORITY_CHANGE",
        description: `Priority changed from ${oldTicket.priority} to ${priority} by ${currentUserName}`,
      });
    }

    if (assignedToId !== undefined && assignedToId !== oldTicket.assigned_to_id) {
      let assigneeName = "None";
      if (assignedToId) {
        const newAssignee = await prisma.users.findUnique({ where: { id: assignedToId } });
        if (newAssignee) {
          assigneeName = newAssignee.name;
        }
      }
      const oldAssigneeName = oldTicket.assigned_to?.name || "Unassigned";
      activityLogs.push({
        action: "ASSIGNEE_CHANGE",
        description: `Assignee changed from ${oldAssigneeName} to ${assigneeName} by ${currentUserName}`,
      });
    }

    // Handle resolve/close dates
    let resolvedAt: Date | null | undefined = undefined;
    let closedAt: Date | null | undefined = undefined;

    if (status === "RESOLVED" && oldTicket.status !== "RESOLVED") {
      resolvedAt = new Date();
    } else if (status && status !== "RESOLVED") {
      resolvedAt = null;
    }

    if (status === "CLOSED" && oldTicket.status !== "CLOSED") {
      closedAt = new Date();
    } else if (status && status !== "CLOSED") {
      closedAt = null;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const ticket = await tx.tickets.update({
        where: { id },
        data: {
          branch_id: branchId,
          staff_id: staffId === "" ? null : staffId,
          category_id: categoryId === "" ? null : categoryId,
          assigned_to_id: assignedToId === "" ? null : assignedToId,
          title,
          description,
          status,
          priority,
          response_due_at: responseDueAt ? new Date(responseDueAt) : responseDueAt === "" ? null : undefined,
          resolved_at: resolvedAt,
          closed_at: closedAt,
        },
      });

      // Insert all generated activity logs
      for (const log of activityLogs) {
        await tx.ticket_activities.create({
          data: {
            ticket_id: id,
            action: log.action,
            description: log.description,
          },
        });
      }

      // If generic details changed but no status/priority/assignee change
      if (activityLogs.length === 0) {
        await tx.ticket_activities.create({
          data: {
            ticket_id: id,
            action: "UPDATED",
            description: `Ticket details updated by ${currentUserName}`,
          },
        });
      }

      return ticket;
    });

    return NextResponse.json({ success: true, id: updated.id }, { status: 200 });
  } catch (error: any) {
    console.error("Failed to update ticket:", error);
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
    const { id } = await params;
    const permission = await checkApiPermission(request, "tickets", "delete");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const ticket = await prisma.tickets.findUnique({
      where: { id },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Delete child relations first
      await tx.ticket_comments.deleteMany({ where: { ticket_id: id } });
      await tx.ticket_activities.deleteMany({ where: { ticket_id: id } });
      await tx.ticket_attachments.deleteMany({ where: { ticket_id: id } });
      await tx.tickets.delete({ where: { id } });
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Failed to delete ticket:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
