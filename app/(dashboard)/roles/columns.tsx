"use client";

import { type ColumnDef } from "@tanstack/react-table";
import {
  RiCpuLine,
  RiEditLine,
  RiDeleteBinLine,
  RiMore2Fill,
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

export interface Role {
  id: string;
  name: string;
  description: string | null;
  userCount: number;
  permissions: {
    id: string;
    name: string;
    key: string;
  }[];
  modules: {
    id: string;
    name: string;
    code: string;
  }[];
  createdAt: string;
  roleModulePermissions?: {
    moduleId: string;
    permissionId: string;
  }[];
}

interface GetColumnsOptions {
  hasPermission: (module: string, action: string) => boolean;
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
}

// ─── Column Definitions ────────────────────────────────────────────

export function getColumns({ hasPermission, onEdit, onDelete }: GetColumnsOptions): ColumnDef<Role>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Role Name" />
      ),
      cell: ({ row }) => (
        <span className="font-semibold text-foreground">{row.getValue("name")}</span>
      ),
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
      accessorKey: "userCount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Users" className="text-center" />
      ),
      cell: ({ row }) => (
        <span className="text-center font-semibold text-sm block">
          {row.getValue("userCount") as number}
        </span>
      ),
    },
    {
      id: "modules",
      header: "Modules",
      cell: ({ row }) => {
        const role = row.original;
        return (
          <div className="flex flex-wrap gap-1">
            {role.modules.length === 0 ? (
              <span className="text-xs text-muted-foreground">None</span>
            ) : (
              role.modules.map((m) => (
                <Badge key={m.id} variant="secondary" className="text-[10px] py-0 px-1.5 flex items-center gap-0.5 border">
                  <RiCpuLine className="size-3 text-muted-foreground" />
                  {m.name}
                </Badge>
              ))
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: () => <span className="text-right block">Actions</span>,
      cell: ({ row }) => {
        const role = row.original;
        if (!hasPermission("roles", "edit") && !hasPermission("roles", "delete")) return null;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="size-8 p-0">
                  <span className="sr-only">Open Menu</span>
                  <RiMore2Fill className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-35">
                {hasPermission("roles", "edit") && (
                  <DropdownMenuItem onClick={() => onEdit(role)} className="cursor-pointer gap-2">
                    <RiEditLine className="size-4 text-muted-foreground" />
                    Edit Details
                  </DropdownMenuItem>
                )}
                {hasPermission("roles", "delete") && (
                  <DropdownMenuItem onClick={() => onDelete(role)} className="text-destructive cursor-pointer gap-2 focus:bg-destructive/10 focus:text-destructive">
                    <RiDeleteBinLine className="size-4" />
                    Delete Role
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
