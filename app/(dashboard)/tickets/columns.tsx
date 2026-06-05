"use client";

import { type ColumnDef } from "@tanstack/react-table";
import {
  RiDeleteBinLine,
  RiEditLine,
  RiMore2Fill,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiCalendarLine,
  RiUserLine,
  RiEyeLine,
  RiAlertLine,
} from "@remixicon/react";

import { DataTableColumnHeader } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Types ─────────────────────────────────────────────────────────

export interface Ticket {
  id: string;
  ticketNumber: string;
  branchId: string;
  staffId: string | null;
  categoryId: string | null;
  createdById: string;
  assignedToId: string | null;
  title: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "PENDING" | "RESOLVED" | "CLOSED" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  responseDueAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  branch: {
    id: string;
    name: string;
    code: string | null;
  };
  staff: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
  } | null;
  category: {
    id: string;
    name: string;
  } | null;
  createdBy: {
    id: string;
    name: string;
  };
  assignedTo: {
    id: string;
    name: string;
  } | null;
}

interface GetColumnsOptions {
  hasPermission: (module: string, action: string) => boolean;
  onViewDetails: (ticket: Ticket) => void;
  onEdit: (ticket: Ticket) => void;
  onDelete: (ticket: Ticket) => void;
}

// ─── Status Badge ──────────────────────────────────────────────────

function StatusBadge({ status }: { status: Ticket["status"] }) {
  switch (status) {
    case "OPEN":
      return (
        <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200 flex items-center gap-1 font-semibold text-xs py-0.5 w-fit">
          Open
        </Badge>
      );
    case "IN_PROGRESS":
      return (
        <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 flex items-center gap-1 font-semibold text-xs py-0.5 w-fit">
          In Progress
        </Badge>
      );
    case "PENDING":
      return (
        <Badge variant="outline" className="text-purple-700 bg-purple-50 border-purple-200 flex items-center gap-1 font-semibold text-xs py-0.5 w-fit">
          Pending
        </Badge>
      );
    case "RESOLVED":
      return (
        <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 flex items-center gap-1 font-semibold text-xs py-0.5 w-fit">
          <RiCheckboxCircleLine className="size-3 text-emerald-600" />
          Resolved
        </Badge>
      );
    case "CLOSED":
      return (
        <Badge variant="outline" className="text-gray-700 bg-gray-50 border-gray-200 flex items-center gap-1 font-semibold text-xs py-0.5 w-fit">
          Closed
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge variant="outline" className="text-rose-700 bg-rose-50 border-rose-200 flex items-center gap-1 font-semibold text-xs py-0.5 w-fit">
          <RiCloseCircleLine className="size-3 text-rose-600" />
          Cancelled
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

// ─── Priority Badge ────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: Ticket["priority"] }) {
  switch (priority) {
    case "LOW":
      return (
        <Badge variant="outline" className="text-slate-600 bg-slate-50 border-slate-200 font-semibold text-xs py-0.5 w-fit">
          Low
        </Badge>
      );
    case "MEDIUM":
      return (
        <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200 font-semibold text-xs py-0.5 w-fit">
          Medium
        </Badge>
      );
    case "HIGH":
      return (
        <Badge variant="outline" className="text-orange-700 bg-orange-50 border-orange-200 font-semibold text-xs py-0.5 w-fit">
          High
        </Badge>
      );
    case "CRITICAL":
      return (
        <Badge variant="outline" className="text-rose-700 bg-rose-50 border-rose-200 flex items-center gap-1 font-bold text-xs py-0.5 w-fit animate-pulse">
          <RiAlertLine className="size-3 text-rose-600" />
          Critical
        </Badge>
      );
    default:
      return <Badge variant="secondary">{priority}</Badge>;
  }
}

// ─── Column Definitions ────────────────────────────────────────────

export function getColumns({
  hasPermission,
  onViewDetails,
  onEdit,
  onDelete,
}: GetColumnsOptions): ColumnDef<Ticket>[] {
  return [
    {
      accessorKey: "ticketNumber",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Ticket #" />
      ),
      cell: ({ row }) => {
        const ticket = row.original;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs font-semibold text-primary">{ticket.ticketNumber}</span>
            <span className="text-[10px] text-muted-foreground">
              {new Date(ticket.createdAt).toLocaleDateString()}
            </span>
          </div>
        );
      },
      size: 110,
    },
    {
      accessorKey: "title",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Subject / Category" />
      ),
      cell: ({ row }) => {
        const ticket = row.original;
        return (
          <div className="flex flex-col gap-0.5 max-w-[240px]">
            <span className="font-semibold text-foreground truncate">{ticket.title}</span>
            {ticket.category && (
              <span className="text-xs text-muted-foreground font-medium">
                {ticket.category.name}
              </span>
            )}
          </div>
        );
      },
      size: 240,
    },
    {
      accessorKey: "branch.name",
      header: "Location",
      cell: ({ row }) => {
        const ticket = row.original;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{ticket.branch.name}</span>
            {ticket.staff && (
              <span className="text-xs text-muted-foreground truncate">
                For: {ticket.staff.firstName} {ticket.staff.lastName}
              </span>
            )}
          </div>
        );
      },
      size: 160,
    },
    {
      accessorKey: "priority",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Priority" />
      ),
      cell: ({ row }) => <PriorityBadge priority={row.getValue("priority")} />,
      size: 100,
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
      size: 110,
    },
    {
      id: "assignee",
      header: "Assignee",
      cell: ({ row }) => {
        const ticket = row.original;
        return ticket.assignedTo ? (
          <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <RiUserLine className="size-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">{ticket.assignedTo.name}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs italic">Unassigned</span>
        );
      },
      size: 140,
    },
    {
      accessorKey: "responseDueAt",
      header: "Due Date",
      cell: ({ row }) => {
        const dueStr = row.getValue("responseDueAt") as string | null;
        if (!dueStr) return <span className="text-muted-foreground text-xs">—</span>;

        const date = new Date(dueStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const diffTime = date.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let dateClass = "text-muted-foreground font-medium";
        const isClosed = ["CLOSED", "RESOLVED", "CANCELLED"].includes(row.original.status);

        if (!isClosed) {
          if (diffDays < 0) {
            dateClass = "text-rose-600 font-semibold";
          } else if (diffDays <= 2) {
            dateClass = "text-amber-600 font-semibold";
          }
        }

        return (
          <div className="flex items-center gap-1.5 text-sm">
            <RiCalendarLine className="size-3.5 text-muted-foreground shrink-0" />
            <span className={dateClass}>{dueStr}</span>
          </div>
        );
      },
      size: 130,
    },
    {
      id: "actions",
      header: () => <span className="text-right block">Actions</span>,
      cell: ({ row }) => {
        const ticket = row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="size-8 p-0">
                  <span className="sr-only">Open Menu</span>
                  <RiMore2Fill className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[150px]">
                <DropdownMenuItem onClick={() => onViewDetails(ticket)} className="cursor-pointer gap-2">
                  <RiEyeLine className="size-4 text-muted-foreground" />
                  View Details
                </DropdownMenuItem>
                {hasPermission("tickets", "edit") && (
                  <DropdownMenuItem onClick={() => onEdit(ticket)} className="cursor-pointer gap-2">
                    <RiEditLine className="size-4 text-muted-foreground" />
                    Edit Details
                  </DropdownMenuItem>
                )}
                {hasPermission("tickets", "delete") && (
                  <DropdownMenuItem
                    onClick={() => onDelete(ticket)}
                    className="text-destructive cursor-pointer gap-2 focus:bg-destructive/10 focus:text-destructive"
                  >
                    <RiDeleteBinLine className="size-4" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      size: 80,
    },
  ];
}
