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

export interface Module {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: "ACTIVE" | "INACTIVE";
  rolesCount: number;
  createdAt: string;
}

interface GetColumnsOptions {
  hasPermission: (module: string, action: string) => boolean;
  onEdit: (mod: Module) => void;
  onDelete: (mod: Module) => void;
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

export function getColumns({ hasPermission, onEdit, onDelete }: GetColumnsOptions): ColumnDef<Module>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Module Name" />
      ),
      cell: ({ row }) => (
        <span className="font-semibold text-foreground">{row.getValue("name")}</span>
      ),
      size: 180,
    },
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => (
        <Badge variant="secondary" className="font-mono text-xs font-semibold px-2 py-0.5 rounded border">
          {row.getValue("code") as string}
        </Badge>
      ),
      size: 150,
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
      size: 120,
    },
    {
      id: "actions",
      header: () => <span className="text-right block">Actions</span>,
      cell: ({ row }) => {
        const mod = row.original;
        if (!hasPermission("modules", "edit") && !hasPermission("modules", "delete")) return null;
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
                {hasPermission("modules", "edit") && (
                  <DropdownMenuItem onClick={() => onEdit(mod)} className="cursor-pointer gap-2">
                    <RiEditLine className="size-4 text-muted-foreground" />
                    Edit Details
                  </DropdownMenuItem>
                )}
                {hasPermission("modules", "delete") && (
                  <DropdownMenuItem onClick={() => onDelete(mod)} className="text-destructive cursor-pointer gap-2 focus:bg-destructive/10 focus:text-destructive">
                    <RiDeleteBinLine className="size-4" />
                    Delete Module
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
