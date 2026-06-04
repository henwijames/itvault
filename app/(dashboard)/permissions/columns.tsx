"use client";

import { type ColumnDef } from "@tanstack/react-table";
import {
  RiDeleteBinLine,
  RiEditLine,
  RiMore2Fill,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
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

export interface Permission {
  id: string;
  name: string;
  key: string;
  description: string | null;
  status: "ACTIVE" | "INACTIVE";
  created_at: string;
}

interface GetColumnsOptions {
  hasPermission: (module: string, action: string) => boolean;
  onEdit: (perm: Permission) => void;
  onDelete: (perm: Permission) => void;
}

// ─── Status Badge ──────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "ACTIVE":
      return (
        <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 flex items-center gap-1 font-semibold text-xs py-0.5 w-fit">
          <RiCheckboxCircleLine className="size-3 text-emerald-600" />
          Active
        </Badge>
      );
    case "INACTIVE":
      return (
        <Badge variant="outline" className="text-rose-700 bg-rose-50 border-rose-200 flex items-center gap-1 font-semibold text-xs py-0.5 w-fit">
          <RiCloseCircleLine className="size-3 text-rose-600" />
          Inactive
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

// ─── Column Definitions ────────────────────────────────────────────

export function getColumns({ hasPermission, onEdit, onDelete }: GetColumnsOptions): ColumnDef<Permission>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <span className="font-semibold text-foreground">{row.getValue("name")}</span>
      ),
      size: 200,
    },
    {
      accessorKey: "key",
      header: "System Key",
      cell: ({ row }) => (
        <code className="text-xs bg-muted px-2 py-1 rounded font-mono text-primary font-medium border border-border">
          {row.getValue("key") as string}
        </code>
      ),
      size: 200,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {(row.getValue("description") as string) || "—"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
      size: 100,
    },
    {
      id: "type",
      header: "Type",
      cell: () => (
        <Badge variant="outline" className="capitalize text-xs font-semibold">
          System
        </Badge>
      ),
      size: 100,
    },
    {
      id: "actions",
      header: () => <span className="text-right block">Actions</span>,
      cell: ({ row }) => {
        const permission = row.original;
        if (!hasPermission("permissions", "edit") && !hasPermission("permissions", "delete")) return null;
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
                {hasPermission("permissions", "edit") && (
                  <DropdownMenuItem onClick={() => onEdit(permission)} className="cursor-pointer gap-2">
                    <RiEditLine className="size-4 text-muted-foreground" />
                    Edit Details
                  </DropdownMenuItem>
                )}
                {hasPermission("permissions", "delete") && (
                  <DropdownMenuItem onClick={() => onDelete(permission)} className="text-destructive cursor-pointer gap-2 focus:bg-destructive/10 focus:text-destructive">
                    <RiDeleteBinLine className="size-4" />
                    Delete Perm
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
