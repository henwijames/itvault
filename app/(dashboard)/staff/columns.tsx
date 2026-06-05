"use client";

import { type ColumnDef } from "@tanstack/react-table";
import {
  RiDeleteBinLine,
  RiEditLine,
  RiMore2Fill,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiUserSharedLine,
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

export interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  mobileNumber: string | null;
  contactNumber: string | null;
  dateOfBirth: string | null;
  emiratesIdNumber: string | null;
  emiratesIdExpiry: string | null;
  position: string | null;
  isActive: boolean;
  userId: string | null;
  branchId: string;
  createdAt: string;
  updatedAt: string;
  branch: {
    id: string;
    name: string;
    code: string | null;
  };
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface GetColumnsOptions {
  hasPermission: (module: string, action: string) => boolean;
  onEdit: (staff: Staff) => void;
  onDelete: (staff: Staff) => void;
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return (
      <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 flex items-center gap-1 font-semibold text-xs py-0.5 w-fit">
        <RiCheckboxCircleLine className="size-3 text-emerald-600" />
        Active
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-rose-700 bg-rose-50 border-rose-200 flex items-center gap-1 font-semibold text-xs py-0.5 w-fit">
      <RiCloseCircleLine className="size-3 text-rose-600" />
      Inactive
    </Badge>
  );
}

export function getColumns({ hasPermission, onEdit, onDelete }: GetColumnsOptions): ColumnDef<Staff>[] {
  return [
    {
      id: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Staff Name" />
      ),
      accessorFn: (row) => `${row.firstName} ${row.lastName}`,
      cell: ({ row }) => (
        <span className="font-semibold text-foreground">
          {row.original.firstName} {row.original.lastName}
        </span>
      ),
      size: 200,
    },
    {
      accessorKey: "position",
      header: "Position",
      cell: ({ row }) => {
        const val = row.getValue("position") as string | null;
        return val ? <span className="text-sm font-medium">{val}</span> : <span className="text-muted-foreground text-xs">—</span>;
      },
      size: 150,
    },
    {
      id: "branch",
      header: "Branch",
      accessorFn: (row) => row.branch.name,
      cell: ({ row }) => {
        const branchName = row.original.branch.name;
        const branchCode = row.original.branch.code;
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium">{branchName}</span>
            {branchCode && (
              <span className="text-xs text-muted-foreground font-mono">{branchCode}</span>
            )}
          </div>
        );
      },
      size: 150,
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => {
        const val = row.getValue("email") as string | null;
        return val ? <span className="text-sm">{val}</span> : <span className="text-muted-foreground text-xs">—</span>;
      },
    },
    {
      accessorKey: "mobileNumber",
      header: "Mobile Number",
      cell: ({ row }) => {
        const val = row.getValue("mobileNumber") as string | null;
        return val ? <span className="text-sm font-mono">{val}</span> : <span className="text-muted-foreground text-xs">—</span>;
      },
      size: 150,
    },
    {
      id: "user",
      header: "Login Account",
      accessorFn: (row) => row.user?.name || "",
      cell: ({ row }) => {
        const user = row.original.user;
        return user ? (
          <div className="flex items-center gap-1.5 text-sm text-foreground">
            <RiUserSharedLine className="size-3.5 text-primary shrink-0" />
            <span>{user.name}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">No login account</span>
        );
      },
      size: 150,
    },
    {
      accessorKey: "isActive",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => <StatusBadge isActive={row.getValue("isActive")} />,
      size: 120,
    },
    {
      id: "actions",
      header: () => <span className="text-right block">Actions</span>,
      cell: ({ row }) => {
        const staff = row.original;
        if (!hasPermission("staff", "edit") && !hasPermission("staff", "delete")) return null;
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
                {hasPermission("staff", "edit") && (
                  <DropdownMenuItem onClick={() => onEdit(staff)} className="cursor-pointer gap-2">
                    <RiEditLine className="size-4 text-muted-foreground" />
                    Edit Details
                  </DropdownMenuItem>
                )}
                {hasPermission("staff", "delete") && (
                  <DropdownMenuItem
                    onClick={() => onDelete(staff)}
                    className="text-destructive cursor-pointer gap-2 focus:bg-destructive/10 focus:text-destructive"
                  >
                    <RiDeleteBinLine className="size-4" />
                    Delete Staff
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
