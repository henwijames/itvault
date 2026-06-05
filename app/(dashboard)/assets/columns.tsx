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
  RiHandbagLine,
  RiArrowLeftRightLine,
  RiOrganizationChart,
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

export interface Asset {
  id: string;
  branchId: string;
  assetTag: string | null;
  name: string;
  category: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  purchaseDate: string | null;
  warrantyExpiry: string | null;
  status: "ACTIVE" | "RETIRED" | "LOST" | "REPAIR";
  quantity: number;
  borrowedQuantity: number;
  availableQuantity: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  branch: {
    id: string;
    name: string;
    code: string | null;
  };
}

export interface BorrowLog {
  id: string;
  assetId: string;
  staffId: string | null;
  borrowingBranchId: string | null;
  quantity: number;
  borrowedAt: string;
  returnedAt: string | null;
  notes: string | null;
  asset: {
    id: string;
    name: string;
    category: string;
    assetTag: string | null;
    branch: {
      id: string;
      name: string;
    };
  };
  staff: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    position: string | null;
  } | null;
  borrowingBranch: {
    id: string;
    name: string;
    code: string | null;
  } | null;
}

interface GetAssetColumnsOptions {
  hasPermission: (module: string, action: string) => boolean;
  onEdit: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
  onBorrow: (asset: Asset) => void;
}

interface GetBorrowColumnsOptions {
  hasPermission: (module: string, action: string) => boolean;
  onReturn: (log: BorrowLog) => void;
}

// ─── Status Badges ─────────────────────────────────────────────────

function AssetStatusBadge({ status }: { status: Asset["status"] }) {
  switch (status) {
    case "ACTIVE":
      return (
        <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 flex items-center gap-1 font-semibold text-xs py-0.5 w-fit">
          <RiCheckboxCircleLine className="size-3 text-emerald-600" />
          Active
        </Badge>
      );
    case "REPAIR":
      return (
        <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 flex items-center gap-1 font-semibold text-xs py-0.5 w-fit">
          <RiCloseCircleLine className="size-3 text-amber-600" />
          In Repair
        </Badge>
      );
    case "RETIRED":
      return (
        <Badge variant="outline" className="text-zinc-700 bg-zinc-50 border-zinc-200 flex items-center gap-1 font-semibold text-xs py-0.5 w-fit">
          <RiCloseCircleLine className="size-3 text-zinc-600" />
          Retired
        </Badge>
      );
    case "LOST":
      return (
        <Badge variant="outline" className="text-rose-700 bg-rose-50 border-rose-200 flex items-center gap-1 font-semibold text-xs py-0.5 w-fit">
          <RiCloseCircleLine className="size-3 text-rose-600" />
          Lost
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function BorrowStatusBadge({ returnedAt }: { returnedAt: string | null }) {
  if (returnedAt) {
    return (
      <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 flex items-center gap-1 font-semibold text-xs py-0.5 w-fit">
        <RiCheckboxCircleLine className="size-3 text-emerald-600" />
        Returned
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200 flex items-center gap-1 font-semibold text-xs py-0.5 w-fit">
      <RiArrowLeftRightLine className="size-3 text-blue-600" />
      Borrowed
    </Badge>
  );
}

// ─── Columns ───────────────────────────────────────────────────────

export function getAssetColumns({
  hasPermission,
  onEdit,
  onDelete,
  onBorrow,
}: GetAssetColumnsOptions): ColumnDef<Asset>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Asset Name" />
      ),
      cell: ({ row }) => {
        const asset = row.original;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-foreground">{asset.name}</span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <span>Cat: {asset.category}</span>
              {asset.assetTag && (
                <>
                  <span>•</span>
                  <span className="font-mono bg-secondary/50 px-1 rounded text-[10px]">{asset.assetTag}</span>
                </>
              )}
            </div>
          </div>
        );
      },
      size: 200,
    },
    {
      accessorKey: "branch.name",
      header: "Branch / Model",
      cell: ({ row }) => {
        const asset = row.original;
        const brandModel = [asset.brand, asset.model].filter(Boolean).join(" ");
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{asset.branch.name}</span>
            {brandModel && (
              <span className="text-xs text-muted-foreground font-medium">
                {brandModel}
              </span>
            )}
          </div>
        );
      },
      size: 150,
    },
    {
      accessorKey: "serialNumber",
      header: "Serial Number",
      cell: ({ row }) => {
        const val = row.getValue("serialNumber") as string | null;
        return val ? (
          <span className="font-mono text-xs font-medium text-muted-foreground">{val}</span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        );
      },
      size: 120,
    },
    {
      id: "stock",
      header: "Stock (Total / Avail)",
      cell: ({ row }) => {
        const asset = row.original;
        const availClass = asset.availableQuantity === 0
          ? "text-rose-600 font-bold"
          : asset.availableQuantity < asset.quantity
          ? "text-amber-600 font-bold"
          : "text-emerald-600 font-semibold";
        return (
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground font-medium">{asset.quantity} total</span>
            <span className="text-muted-foreground">/</span>
            <span className={availClass}>{asset.availableQuantity} avail</span>
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
      cell: ({ row }) => <AssetStatusBadge status={row.getValue("status")} />,
      size: 120,
    },
    {
      id: "actions",
      header: () => <span className="text-right block">Actions</span>,
      cell: ({ row }) => {
        const asset = row.original;
        const editPerm = hasPermission("assets", "edit");
        const deletePerm = hasPermission("assets", "delete");

        if (!editPerm && !deletePerm) return null;

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
                {editPerm && (
                  <>
                    <DropdownMenuItem onClick={() => onEdit(asset)} className="cursor-pointer gap-2">
                      <RiEditLine className="size-4 text-muted-foreground" />
                      Edit Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onBorrow(asset)}
                      disabled={asset.availableQuantity === 0 || asset.status !== "ACTIVE"}
                      className="cursor-pointer gap-2"
                    >
                      <RiHandbagLine className="size-4 text-muted-foreground" />
                      Borrow Asset
                    </DropdownMenuItem>
                  </>
                )}
                {deletePerm && (
                  <DropdownMenuItem
                    onClick={() => onDelete(asset)}
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

export function getBorrowColumns({
  hasPermission,
  onReturn,
}: GetBorrowColumnsOptions): ColumnDef<BorrowLog>[] {
  return [
    {
      accessorKey: "asset.name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Asset" />
      ),
      cell: ({ row }) => {
        const log = row.original;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-foreground">{log.asset.name}</span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <span>{log.asset.category}</span>
              {log.asset.assetTag && (
                <>
                  <span>•</span>
                  <span className="font-mono text-[10px]">{log.asset.assetTag}</span>
                </>
              )}
            </div>
          </div>
        );
      },
      size: 180,
    },
    {
      id: "borrower",
      header: "Borrower",
      cell: ({ row }) => {
        const log = row.original;
        if (log.staff) {
          const name = `${log.staff.firstName} ${log.staff.lastName}`;
          return (
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-foreground flex items-center gap-1">
                <RiUserLine className="size-3.5 text-muted-foreground shrink-0" />
                {name}
              </span>
              {log.staff.position && (
                <span className="text-xs text-muted-foreground font-medium pl-5">
                  {log.staff.position}
                </span>
              )}
            </div>
          );
        } else if (log.borrowingBranch) {
          return (
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-foreground flex items-center gap-1 text-primary">
                <RiOrganizationChart className="size-3.5 text-primary shrink-0" />
                <span>Branch: {log.borrowingBranch.name}</span>
              </span>
              {log.borrowingBranch.code && (
                <span className="text-[10px] text-muted-foreground font-mono pl-5">
                  ({log.borrowingBranch.code})
                </span>
              )}
            </div>
          );
        }
        return <span className="text-muted-foreground text-xs">—</span>;
      },
      size: 180,
    },
    {
      accessorKey: "quantity",
      header: "Borrowed Qty",
      cell: ({ row }) => {
        const qty = row.getValue("quantity") as number;
        return <span className="font-bold text-foreground pl-2">{qty}</span>;
      },
      size: 100,
    },
    {
      accessorKey: "borrowedAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Borrowed At" />
      ),
      cell: ({ row }) => {
        const dateStr = row.original.borrowedAt;
        const date = new Date(dateStr);
        return (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <RiCalendarLine className="size-3.5 shrink-0" />
            <span>{date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        );
      },
      size: 160,
    },
    {
      accessorKey: "returnedAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status / Returned" />
      ),
      cell: ({ row }) => {
        const log = row.original;
        if (log.returnedAt) {
          const date = new Date(log.returnedAt);
          return (
            <div className="flex flex-col gap-0.5">
              <BorrowStatusBadge returnedAt={log.returnedAt} />
              <span className="text-[10px] text-muted-foreground font-mono">
                {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        }
        return <BorrowStatusBadge returnedAt={null} />;
      },
      size: 140,
    },
    {
      id: "actions",
      header: () => <span className="text-right block">Actions</span>,
      cell: ({ row }) => {
        const log = row.original;
        const editPerm = hasPermission("assets", "edit");

        if (log.returnedAt || !editPerm) return null;

        return (
          <div className="text-right">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReturn(log)}
              className="h-8 border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-50 hover:text-emerald-700"
            >
              <RiCheckboxCircleLine className="size-4 shrink-0" data-icon="inline-start" />
              Return
            </Button>
          </div>
        );
      },
      size: 100,
    },
  ];
}
