import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createTicketSchema } from "@/lib/validations/tickets";
import { checkApiPermission } from "@/lib/rbac";
import { z } from "zod";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const permission = await checkApiPermission(request, "tickets", "view");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const tsk = await prisma.tickets.findMany({
      include: {
        branch: true,
        staff: true,
        category: true,
        created_by: true,
        assigned_to: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    const formattedTickets = tsk.map((t) => ({
      id: t.id,
      ticketNumber: t.ticket_number,
      branchId: t.branch_id,
      staffId: t.staff_id,
      categoryId: t.category_id,
      createdById: t.created_by_id,
      assignedToId: t.assigned_to_id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      responseDueAt: t.response_due_at ? t.response_due_at.toISOString().split("T")[0] : null,
      resolvedAt: t.resolved_at ? t.resolved_at.toISOString() : null,
      closedAt: t.closed_at ? t.closed_at.toISOString() : null,
      createdAt: t.created_at.toISOString(),
      updatedAt: t.updated_at.toISOString(),
      branch: {
        id: t.branch.id,
        name: t.branch.name,
        code: t.branch.code,
      },
      staff: t.staff ? {
        id: t.staff.id,
        firstName: t.staff.first_name,
        lastName: t.staff.last_name,
        email: t.staff.email,
      } : null,
      category: t.category ? {
        id: t.category.id,
        name: t.category.name,
      } : null,
      createdBy: {
        id: t.created_by.id,
        name: t.created_by.name,
        email: t.created_by.email,
      },
      assignedTo: t.assigned_to ? {
        id: t.assigned_to.id,
        name: t.assigned_to.name,
        email: t.assigned_to.email,
      } : null,
    }));

    return NextResponse.json(formattedTickets, { status: 200 });
  } catch (error: any) {
    console.error("Failed to fetch tickets:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const permission = await checkApiPermission(request, "tickets", "create");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const currentUserId = permission.payload!.userId;
    const body = await request.json();
    const result = createTicketSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: z.treeifyError(result.error) },
        { status: 400 }
      );
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

    // Generate unique ticket number: TKT-YYMMDD-XXXX
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, "0");
    const dd = now.getDate().toString().padStart(2, "0");
    const rand = Math.floor(1000 + Math.random() * 9000).toString();
    const ticketNumber = `TKT-${yy}${mm}${dd}-${rand}`;

    const newTicket = await prisma.$transaction(async (tx) => {
      const ticket = await tx.tickets.create({
        data: {
          ticket_number: ticketNumber,
          branch_id: branchId,
          staff_id: staffId || null,
          category_id: categoryId || null,
          created_by_id: currentUserId,
          assigned_to_id: assignedToId || null,
          title: title.trim(),
          description: description.trim(),
          status: status || "OPEN",
          priority: priority || "MEDIUM",
          response_due_at: responseDueAt ? new Date(responseDueAt) : null,
        },
      });

      // Create initial activity log
      await tx.ticket_activities.create({
        data: {
          ticket_id: ticket.id,
          action: "CREATED",
          description: `Ticket created by ${permission.payload!.name}`,
        },
      });

      return ticket;
    });

    const fullTicket = await prisma.tickets.findUnique({
      where: { id: newTicket.id },
      include: {
        branch: true,
        staff: true,
        category: true,
        created_by: true,
        assigned_to: true,
      },
    });

    if (!fullTicket) {
      throw new Error("Failed to load created ticket");
    }

    const formattedTicket = {
      id: fullTicket.id,
      ticketNumber: fullTicket.ticket_number,
      branchId: fullTicket.branch_id,
      staffId: fullTicket.staff_id,
      categoryId: fullTicket.category_id,
      createdById: fullTicket.created_by_id,
      assignedToId: fullTicket.assigned_to_id,
      title: fullTicket.title,
      description: fullTicket.description,
      status: fullTicket.status,
      priority: fullTicket.priority,
      responseDueAt: fullTicket.response_due_at ? fullTicket.response_due_at.toISOString().split("T")[0] : null,
      createdAt: fullTicket.created_at.toISOString(),
      updatedAt: fullTicket.updated_at.toISOString(),
      branch: {
        id: fullTicket.branch.id,
        name: fullTicket.branch.name,
        code: fullTicket.branch.code,
      },
      staff: fullTicket.staff ? {
        id: fullTicket.staff.id,
        firstName: fullTicket.staff.first_name,
        lastName: fullTicket.staff.last_name,
      } : null,
      category: fullTicket.category ? {
        id: fullTicket.category.id,
        name: fullTicket.category.name,
      } : null,
      createdBy: {
        id: fullTicket.created_by.id,
        name: fullTicket.created_by.name,
      },
      assignedTo: fullTicket.assigned_to ? {
        id: fullTicket.assigned_to.id,
        name: fullTicket.assigned_to.name,
      } : null,
    };

    return NextResponse.json(formattedTicket, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create ticket:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
