"use client";

import { type ColumnDef } from "@tanstack/react-table";
import {
  RiDeleteBinLine,
  RiEditLine,
  RiMore2Fill,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiCalendarLine,
  RiMoneyDollarCircleLine,
  RiMailLine,
  RiUserLine,
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

export interface Subscription {
  id: string;
  branchId: string;
  name: string;
  provider: string | null;
  accountEmail: string | null;
  accountUsername: string | null;
  accountPassword: string | null;
  startDate: string | null;
  expiryDate: string | null;
  amount: string | null;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  branch: {
    id: string;
    name: string;
    code: string | null;
  };
}

interface GetColumnsOptions {
  hasPermission: (module: string, action: string) => boolean;
  onEdit: (sub: Subscription) => void;
  onDelete: (sub: Subscription) => void;
}

// ─── Status Badge ──────────────────────────────────────────────────

function StatusBadge({ status }: { status: "ACTIVE" | "EXPIRED" | "CANCELLED" }) {
  switch (status) {
    case "ACTIVE":
      return (
        <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 flex items-center gap-1 font-semibold text-xs py-0.5 w-fit">
          <RiCheckboxCircleLine className="size-3 text-emerald-600" />
          Active
        </Badge>
      );
    case "EXPIRED":
      return (
        <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 flex items-center gap-1 font-semibold text-xs py-0.5 w-fit">
          <RiCloseCircleLine className="size-3 text-amber-600" />
          Expired
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

// ─── Column Definitions ────────────────────────────────────────────

export function getColumns({ hasPermission, onEdit, onDelete }: GetColumnsOptions): ColumnDef<Subscription>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Subscription" />
      ),
      cell: ({ row }) => {
        const sub = row.original;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-foreground">{sub.name}</span>
            {sub.provider && (
              <span className="text-xs text-muted-foreground font-medium">
                Provider: {sub.provider}
              </span>
            )}
          </div>
        );
      },
      size: 200,
    },
    {
      accessorKey: "branch.name",
      header: "Branch",
      cell: ({ row }) => {
        const sub = row.original;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{sub.branch.name}</span>
            {sub.branch.code && (
              <Badge variant="secondary" className="font-mono text-[10px] px-1 py-0 w-fit rounded">
                {sub.branch.code}
              </Badge>
            )}
          </div>
        );
      },
      size: 150,
    },
    {
      id: "accountDetails",
      header: "Account Info",
      cell: ({ row }) => {
        const sub = row.original;
        if (!sub.accountEmail && !sub.accountUsername) {
          return <span className="text-muted-foreground text-xs">—</span>;
        }
        return (
          <div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            {sub.accountEmail && (
              <div className="flex items-center gap-1">
                <RiMailLine className="size-3 shrink-0" />
                <span>{sub.accountEmail}</span>
              </div>
            )}
            {sub.accountUsername && (
              <div className="flex items-center gap-1">
                <RiUserLine className="size-3 shrink-0" />
                <span>{sub.accountUsername}</span>
              </div>
            )}
          </div>
        );
      },
      size: 180,
    },
    {
      accessorKey: "amount",
      header: "Cost / Amount",
      cell: ({ row }) => {
        const amount = row.getValue("amount") as string | null;
        return amount ? (
          <div className="flex items-center gap-1 text-foreground font-medium">
            <RiMoneyDollarCircleLine className="size-4 text-muted-foreground" />
            <span>{parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        );
      },
      size: 120,
    },
    {
      accessorKey: "expiryDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Expiry Date" />
      ),
      cell: ({ row }) => {
        const dateStr = row.getValue("expiryDate") as string | null;
        if (!dateStr) return <span className="text-muted-foreground text-xs">—</span>;

        const date = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Highlight expiring soon (within 30 days) or expired
        const diffTime = date.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let dateClass = "text-muted-foreground";
        if (diffDays < 0) {
          dateClass = "text-rose-600 font-semibold";
        } else if (diffDays <= 30) {
          dateClass = "text-amber-600 font-semibold";
        }

        return (
          <div className="flex items-center gap-1.5 text-sm">
            <RiCalendarLine className="size-3.5 text-muted-foreground shrink-0" />
            <span className={dateClass}>{dateStr}</span>
          </div>
        );
      },
      size: 140,
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
      size: 120,
    },
    {
      id: "actions",
      header: () => <span className="text-right block">Actions</span>,
      cell: ({ row }) => {
        const sub = row.original;
        if (!hasPermission("subscriptions", "edit") && !hasPermission("subscriptions", "delete")) return null;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="size-8 p-0">
                  <span className="sr-only">Open Menu</span>
                  <RiMore2Fill className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[140px]">
                {hasPermission("subscriptions", "edit") && (
                  <DropdownMenuItem onClick={() => onEdit(sub)} className="cursor-pointer gap-2">
                    <RiEditLine className="size-4 text-muted-foreground" />
                    Edit Details
                  </DropdownMenuItem>
                )}
                {hasPermission("subscriptions", "delete") && (
                  <DropdownMenuItem
                    onClick={() => onDelete(sub)}
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
