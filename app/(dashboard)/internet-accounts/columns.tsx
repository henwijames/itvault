"use client";

import { type ColumnDef } from "@tanstack/react-table";
import {
  RiDeleteBinLine,
  RiEditLine,
  RiMore2Fill,
  RiExchangeLine,
  RiHistoryLine,
  RiUserStarLine,
  RiStore2Line,
  RiHome4Line,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiAlertLine,
  RiInformationLine,
  RiBookOpenLine,
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
import { formatDateToWords } from "@/lib/utils";

export interface InternetAccount {
  id: string;
  branchId: string;
  originalBranchId: string | null;
  accountHolderId: string | null;
  accountType: "SHOP" | "ACCOMMODATION";
  status: "NEW" | "RENEWED" | "FOR_CANCELLATION" | "CANCELLED";
  providerSource: string | null;
  accountNumber: string;
  shipmentNumber: string | null;
  startDate: string | null;
  contractEndDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  branch: {
    id: string;
    name: string;
    code: string | null;
  };
  originalBranch: {
    id: string;
    name: string;
    code: string | null;
  } | null;
  accountHolder: {
    id: string;
    firstName: string;
    lastName: string;
    position: string | null;
    email: string | null;
    mobileNumber: string | null;
    contactNumber: string | null;
    dateOfBirth: string | null;
    emiratesIdNumber: string | null;
    emiratesIdExpiry: string | null;
  } | null;
  migrationsCount: number;
}

interface GetColumnsOptions {
  hasPermission: (module: string, action: string) => boolean;
  onEdit: (account: InternetAccount) => void;
  onMigrate: (account: InternetAccount) => void;
  onViewHistory: (account: InternetAccount) => void;
  onViewStatusLogs: (account: InternetAccount) => void;
  onDelete: (account: InternetAccount) => void;
  onViewDetails: (account: InternetAccount) => void;
}


function AccountTypeBadge({ type }: { type: "SHOP" | "ACCOMMODATION" }) {
  if (type === "SHOP") {
    return (
      <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200 flex items-center gap-1 font-semibold text-xs py-0.5 w-fit">
        <RiStore2Line className="size-3 text-blue-600" />
        Shop
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 flex items-center gap-1 font-semibold text-xs py-0.5 w-fit">
      <RiHome4Line className="size-3 text-amber-600" />
      Accommodation
    </Badge>
  );
}

function StatusBadge({ status }: { status: InternetAccount["status"] }) {
  switch (status) {
    case "NEW":
      return (
        <Badge variant="outline" className="text-sky-700 bg-sky-50 border-sky-200 flex items-center gap-1 font-semibold text-xs py-0.5 w-fit">
          <RiInformationLine className="size-3 text-sky-600" />
          New
        </Badge>
      );
    case "RENEWED":
      return (
        <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 flex items-center gap-1 font-semibold text-xs py-0.5 w-fit">
          <RiCheckboxCircleLine className="size-3 text-emerald-600" />
          Renewed
        </Badge>
      );
    case "FOR_CANCELLATION":
      return (
        <Badge variant="outline" className="text-rose-700 bg-rose-50 border-rose-200 flex items-center gap-1 font-semibold text-xs py-0.5 w-fit">
          <RiAlertLine className="size-3 text-rose-600" />
          For Cancellation
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge variant="outline" className="text-gray-700 bg-gray-50 border-gray-200 flex items-center gap-1 font-semibold text-xs py-0.5 w-fit">
          <RiCloseCircleLine className="size-3 text-gray-600" />
          Cancelled
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function getColumns({
  hasPermission,
  onEdit,
  onMigrate,
  onViewHistory,
  onViewStatusLogs,
  onDelete,
  onViewDetails,
}: GetColumnsOptions): ColumnDef<InternetAccount>[] {
  return [
    {
      accessorKey: "accountNumber",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Account Details" />
      ),
      cell: ({ row }) => {
        const accNo = row.original.accountNumber;
        const shipNo = row.original.shipmentNumber;
        return (
          <div className="flex flex-col gap-0.5">
            <button
              onClick={() => onViewDetails(row.original)}
              className="font-semibold text-primary hover:underline font-mono text-sm text-left block p-0 h-auto bg-transparent border-0 cursor-pointer"
            >
              {accNo}
            </button>
            {shipNo && (
              <span className="text-xs text-muted-foreground font-mono">Shipment: {shipNo}</span>
            )}
          </div>
        );
      },
      size: 180,
    },
    {
      accessorKey: "accountType",
      header: "Type",
      cell: ({ row }) => <AccountTypeBadge type={row.getValue("accountType")} />,
      size: 130,
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
      size: 130,
    },
    {
      id: "branch",
      header: "Branch Location",
      accessorFn: (row) => row.branch.name,
      cell: ({ row }) => {
        const currentName = row.original.branch.name;
        const currentCode = row.original.branch.code;
        const original = row.original.originalBranch;
        const wasMigrated = original && original.id !== row.original.branchId;

        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium">{currentName}</span>
              {currentCode && (
                <span className="text-xs text-muted-foreground font-mono">({currentCode})</span>
              )}
            </div>
            {wasMigrated && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <RiExchangeLine className="size-2.5 text-muted-foreground" />
                Originally: {original.name}
              </span>
            )}
          </div>
        );
      },
      size: 180,
    },
    {
      accessorKey: "providerSource",
      header: "Provider / Source",
      cell: ({ row }) => {
        const val = row.getValue("providerSource") as string | null;
        return val ? <span className="text-sm font-medium">{val}</span> : <span className="text-muted-foreground text-xs">—</span>;
      },
      size: 150,
    },
    {
      id: "accountHolder",
      header: "Account Holder",
      accessorFn: (row) => row.accountHolder ? `${row.accountHolder.firstName} ${row.accountHolder.lastName}` : "",
      cell: ({ row }) => {
        const holder = row.original.accountHolder;
        return holder ? (
          <div className="flex items-center gap-1.5 text-sm text-foreground">
            <RiUserStarLine className="size-3.5 text-primary shrink-0" />
            <div className="flex flex-col">
              <span className="font-medium text-sm">{holder.firstName} {holder.lastName}</span>
              {holder.position && (
                <span className="text-[10px] text-muted-foreground leading-tight">{holder.position}</span>
              )}
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">No linked staff</span>
        );
      },
      size: 180,
    },
    {
      id: "contractDates",
      header: "Contract Validity",
      cell: ({ row }) => {
        const start = row.original.startDate;
        const end = row.original.contractEndDate;

        if (!start && !end) {
          return <span className="text-muted-foreground text-xs">—</span>;
        }

        return (
          <div className="flex flex-col text-xs font-mono">
            {start && (
              <span className="text-muted-foreground">Start: {formatDateToWords(start)}</span>
            )}
            {end && (
              <span className="text-foreground font-semibold">End: {formatDateToWords(end)}</span>
            )}
          </div>
        );
      },
      size: 150,
    },
    {
      id: "migrations",
      header: "Migrations",
      cell: ({ row }) => {
        const count = row.original.migrationsCount;
        if (count === 0) {
          return <span className="text-muted-foreground text-xs font-mono">None</span>;
        }
        return (
          <Button
            variant="link"
            onClick={() => onViewHistory(row.original)}
            className="h-auto p-0 text-xs font-semibold flex items-center gap-1 text-primary hover:underline"
          >
            <RiHistoryLine className="size-3" />
            {count} {count === 1 ? "migration" : "migrations"}
          </Button>
        );
      },
      size: 120,
    },
    {
      id: "actions",
      header: () => <span className="text-right block">Actions</span>,
      cell: ({ row }) => {
        const acc = row.original;
        const canEdit = hasPermission("internet_accounts", "edit");
        const canDelete = hasPermission("internet_accounts", "delete");

        if (!canEdit && !canDelete) return null;

        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="size-8 p-0">
                  <span className="sr-only">Open Menu</span>
                  <RiMore2Fill className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[180px]">
                <DropdownMenuItem onClick={() => onViewDetails(acc)} className="cursor-pointer gap-2">
                  <RiInformationLine className="size-4 text-muted-foreground" />
                  View Details
                </DropdownMenuItem>
                {canEdit && (
                  <>
                    <DropdownMenuItem onClick={() => onEdit(acc)} className="cursor-pointer gap-2">
                      <RiEditLine className="size-4 text-muted-foreground" />
                      Edit Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onMigrate(acc)} className="cursor-pointer gap-2">
                      <RiExchangeLine className="size-4 text-muted-foreground" />
                      Migrate Location
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onClick={() => onViewStatusLogs(acc)} className="cursor-pointer gap-2">
                  <RiBookOpenLine className="size-4 text-muted-foreground" />
                  View Status Logs
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewHistory(acc)} className="cursor-pointer gap-2">
                  <RiHistoryLine className="size-4 text-muted-foreground" />
                  Migration History
                </DropdownMenuItem>
                {canDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(acc)}
                    className="text-destructive cursor-pointer gap-2 focus:bg-destructive/10 focus:text-destructive"
                  >
                    <RiDeleteBinLine className="size-4" />
                    Delete Account
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
