"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import {
  RiArchiveLine,
  RiAddLine,
  RiArrowUpDownLine,
  RiCheckLine,
  RiHandbagLine,
} from "@remixicon/react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import {
  createAssetSchema,
  borrowAssetSchema,
  type CreateAssetInput,
  type BorrowAssetInput,
} from "@/lib/validations/assets";
import { useAuth } from "@/components/auth-context";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  type Asset,
  type BorrowLog,
  getAssetColumns,
  getBorrowColumns,
} from "./columns";

interface BranchLookup {
  id: string;
  name: string;
  code: string | null;
  status: string;
}

interface StaffLookup {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  position: string | null;
  isActive: boolean;
}

interface ApiErrorResponse {
  error: string;
}

interface AssetFormValues {
  name: string;
  branchId: string;
  assetTag?: string | null;
  category: string;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  purchaseDate?: string | null;
  warrantyExpiry?: string | null;
  status: "ACTIVE" | "RETIRED" | "LOST" | "REPAIR";
  quantity: string | number;
  notes?: string | null;
}

interface BorrowFormValues {
  assetId: string;
  staffId?: string | null;
  borrowingBranchId?: string | null;
  quantity: string | number;
  notes?: string | null;
}

export default function AssetsPage() {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<"inventory" | "logs">("inventory");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [borrowLogs, setBorrowLogs] = useState<BorrowLog[]>([]);
  const [branches, setBranches] = useState<BranchLookup[]>([]);
  const [staffList, setStaffList] = useState<StaffLookup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Dialog & popover states
  const [isAssetFormOpen, setIsAssetFormOpen] = useState<boolean>(false);
  const [isBranchPopoverOpen, setIsBranchPopoverOpen] = useState<boolean>(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [submittingAsset, setSubmittingAsset] = useState<boolean>(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);

  // Borrow States
  const [isBorrowFormOpen, setIsBorrowFormOpen] = useState<boolean>(false);
  const [borrowAssetTarget, setBorrowAssetTarget] = useState<Asset | null>(null);
  const [isStaffPopoverOpen, setIsStaffPopoverOpen] = useState<boolean>(false);
  const [isBorrowBranchPopoverOpen, setIsBorrowBranchPopoverOpen] = useState<boolean>(false);
  const [borrowerType, setBorrowerType] = useState<"staff" | "branch">("staff");
  const [submittingBorrow, setSubmittingBorrow] = useState<boolean>(false);

  // Return States
  const [logToReturn, setLogToReturn] = useState<BorrowLog | null>(null);
  const [submittingReturn, setSubmittingReturn] = useState<boolean>(false);

  // Forms
  const {
    register: registerAsset,
    handleSubmit: handleSubmitAsset,
    control: controlAsset,
    reset: resetAsset,
    formState: { errors: errorsAsset },
  } = useForm<AssetFormValues>({
    resolver: zodResolver(createAssetSchema),
    defaultValues: {
      name: "",
      branchId: "",
      assetTag: "",
      category: "",
      brand: "",
      model: "",
      serialNumber: "",
      purchaseDate: "",
      warrantyExpiry: "",
      status: "ACTIVE",
      quantity: 1,
      notes: "",
    },
  });

  const {
    handleSubmit: handleSubmitBorrow,
    control: controlBorrow,
    reset: resetBorrow,
    setValue: setValueBorrow,
    formState: { errors: errorsBorrow },
  } = useForm<BorrowFormValues>({
    resolver: zodResolver(borrowAssetSchema),
    defaultValues: {
      assetId: "",
      staffId: "",
      borrowingBranchId: "",
      quantity: 1,
      notes: "",
    },
  });

  const fetchAssetsAndLogs = async (): Promise<void> => {
    setLoading(true);
    try {
      const [assetsRes, logsRes, branchesRes, staffRes] = await Promise.all([
        axios.get<Asset[]>("/api/assets"),
        axios.get<BorrowLog[]>("/api/assets/borrow-logs"),
        axios.get<BranchLookup[]>("/api/branches"),
        axios.get<StaffLookup[]>("/api/staff"),
      ]);
      setAssets(assetsRes.data);
      setBorrowLogs(logsRes.data);
      setBranches(branchesRes.data.filter((b) => b.status !== "DELETED"));
      setStaffList(staffRes.data.filter((s) => s.isActive));
    } catch (err: unknown) {
      console.error(err);
      const axiosError = err as AxiosError<ApiErrorResponse>;
      toast.error(axiosError.response?.data?.error || "Failed to load assets data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssetsAndLogs();
  }, []);

  // Sync edit form fields
  useEffect(() => {
    if (editingAsset && isAssetFormOpen) {
      resetAsset({
        name: editingAsset.name,
        branchId: editingAsset.branchId,
        assetTag: editingAsset.assetTag || "",
        category: editingAsset.category,
        brand: editingAsset.brand || "",
        model: editingAsset.model || "",
        serialNumber: editingAsset.serialNumber || "",
        purchaseDate: editingAsset.purchaseDate || "",
        warrantyExpiry: editingAsset.warrantyExpiry || "",
        status: editingAsset.status,
        quantity: editingAsset.quantity,
        notes: editingAsset.notes || "",
      });
    } else if (!isAssetFormOpen) {
      resetAsset({
        name: "",
        branchId: "",
        assetTag: "",
        category: "",
        brand: "",
        model: "",
        serialNumber: "",
        purchaseDate: "",
        warrantyExpiry: "",
        status: "ACTIVE",
        quantity: 1,
        notes: "",
      });
    }
  }, [editingAsset, isAssetFormOpen, resetAsset]);

  // Sync borrow form fields
  useEffect(() => {
    if (borrowAssetTarget && isBorrowFormOpen) {
      resetBorrow({
        assetId: borrowAssetTarget.id,
        staffId: "",
        borrowingBranchId: "",
        quantity: 1,
        notes: "",
      });
      setBorrowerType("staff");
    } else if (!isBorrowFormOpen) {
      resetBorrow({
        assetId: "",
        staffId: "",
        borrowingBranchId: "",
        quantity: 1,
        notes: "",
      });
    }
  }, [borrowAssetTarget, isBorrowFormOpen, resetBorrow]);

  // Asset CRUD functions
  const openCreateAsset = (): void => {
    setEditingAsset(null);
    setIsAssetFormOpen(true);
  };

  const openEditAsset = (asset: Asset): void => {
    setEditingAsset(asset);
    setIsAssetFormOpen(true);
  };

  const confirmDeleteAsset = async (): Promise<void> => {
    if (!assetToDelete) return;
    const asset = assetToDelete;
    setAssetToDelete(null);
    const toastId = toast.loading("Deleting asset...");
    try {
      await axios.delete(`/api/assets/${asset.id}`);
      toast.success("Asset deleted successfully!", { id: toastId });
      fetchAssetsAndLogs();
    } catch (err: unknown) {
      const axiosError = err as AxiosError<ApiErrorResponse>;
      toast.error(axiosError.response?.data?.error || "Failed to delete asset", { id: toastId });
    }
  };

  const onSubmitAsset = async (data: AssetFormValues): Promise<void> => {
    setSubmittingAsset(true);
    const toastId = toast.loading(editingAsset ? "Updating asset..." : "Creating asset...");

    const payload = {
      ...data,
      quantity: typeof data.quantity === "string" ? parseInt(data.quantity, 10) : data.quantity,
      assetTag: data.assetTag || null,
      brand: data.brand || null,
      model: data.model || null,
      serialNumber: data.serialNumber || null,
      purchaseDate: data.purchaseDate || null,
      warrantyExpiry: data.warrantyExpiry || null,
      notes: data.notes || null,
    };

    try {
      if (editingAsset) {
        await axios.patch(`/api/assets/${editingAsset.id}`, payload);
        toast.success("Asset updated successfully!", { id: toastId });
      } else {
        await axios.post("/api/assets", payload);
        toast.success("Asset created successfully!", { id: toastId });
      }
      setIsAssetFormOpen(false);
      fetchAssetsAndLogs();
    } catch (err: unknown) {
      const axiosError = err as AxiosError<ApiErrorResponse>;
      toast.error(
        axiosError.response?.data?.error || "An error occurred while saving asset",
        { id: toastId }
      );
    } finally {
      setSubmittingAsset(false);
    }
  };

  // Asset Borrowing functions
  const openBorrowAsset = (asset: Asset): void => {
    setBorrowAssetTarget(asset);
    setIsBorrowFormOpen(true);
  };

  const onSubmitBorrow = async (data: BorrowFormValues): Promise<void> => {
    setSubmittingBorrow(true);
    const toastId = toast.loading("Logging borrowing...");
    try {
      const payload = {
        ...data,
        quantity: typeof data.quantity === "string" ? parseInt(data.quantity, 10) : data.quantity,
        staffId: data.staffId || null,
        borrowingBranchId: data.borrowingBranchId || null,
      };
      await axios.post("/api/assets/borrow-logs", payload);
      toast.success("Asset borrowing logged successfully!", { id: toastId });
      setIsBorrowFormOpen(false);
      fetchAssetsAndLogs();
    } catch (err: unknown) {
      const axiosError = err as AxiosError<ApiErrorResponse>;
      toast.error(
        axiosError.response?.data?.error || "An error occurred while logging borrowing",
        { id: toastId }
      );
    } finally {
      setSubmittingBorrow(false);
    }
  };

  // Return asset function
  const handleReturnAsset = async (): Promise<void> => {
    if (!logToReturn) return;
    setSubmittingReturn(true);
    const toastId = toast.loading("Processing return...");
    try {
      await axios.post(`/api/assets/borrow-logs/${logToReturn.id}/return`);
      toast.success("Asset return registered successfully!", { id: toastId });
      setLogToReturn(null);
      fetchAssetsAndLogs();
    } catch (err: unknown) {
      const axiosError = err as AxiosError<ApiErrorResponse>;
      toast.error(
        axiosError.response?.data?.error || "Failed to return assets",
        { id: toastId }
      );
    } finally {
      setSubmittingReturn(false);
    }
  };

  // Memoized columns
  const assetColumns = useMemo(
    () =>
      getAssetColumns({
        hasPermission,
        onEdit: openEditAsset,
        onDelete: setAssetToDelete,
        onBorrow: openBorrowAsset,
      }),
    [hasPermission]
  );

  const borrowColumns = useMemo(
    () =>
      getBorrowColumns({
        hasPermission,
        onReturn: setLogToReturn,
      }),
    [hasPermission]
  );

  if (!hasPermission("assets", "view")) {
    return (
      <main className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center flex flex-col gap-2">
          <h1 className="text-xl font-bold text-destructive">Access Denied</h1>
          <p className="text-sm text-muted-foreground">
            You do not have permission to view this page.
          </p>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="flex-1 p-6 flex flex-col gap-6 bg-background/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">IT Assets Management</h1>
            <p className="text-sm text-muted-foreground">
              Manage organization hardware inventory, serial numbers, stock levels, and staff borrowing status logs.
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab("inventory")}
            className={cn(
              "px-5 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer",
              activeTab === "inventory"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Assets Inventory
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={cn(
              "px-5 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer",
              activeTab === "logs"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Borrowing Logs
          </button>
        </div>

        {/* Render Tab Content */}
        {activeTab === "inventory" ? (
          <DataTable
            columns={assetColumns}
            data={assets}
            searchKey="name"
            searchPlaceholder="Search assets inventory..."
            isLoading={loading}
            emptyMessage="No assets registered in the system."
            headerAction={
              hasPermission("assets", "create") ? (
                <Button onClick={openCreateAsset}>
                  <RiAddLine className="size-4" data-icon="inline-start" />
                  Add Asset
                </Button>
              ) : undefined
            }
          />
        ) : (
          <DataTable
            columns={borrowColumns}
            data={borrowLogs}
            searchKey="asset_name"
            searchPlaceholder="Search borrowing logs..."
            isLoading={loading}
            emptyMessage="No asset borrowing history recorded."
          />
        )}
      </main>

      {/* Asset Form Dialog */}
      <Dialog open={isAssetFormOpen} onOpenChange={setIsAssetFormOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <RiArchiveLine className="size-5 text-primary" />
              {editingAsset ? "Edit Asset Details" : "Register New Asset"}
            </DialogTitle>
            <DialogDescription>
              Log asset details, assign barcode tag, specify location and set initial quantity.
            </DialogDescription>
          </DialogHeader>

          <form id="asset-form" onSubmit={handleSubmitAsset(onSubmitAsset)} className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name" className="text-sm font-semibold">Asset Name</Label>
                <Input id="name" placeholder="e.g. MacBook Pro M3" {...registerAsset("name")} aria-invalid={!!errorsAsset.name} />
                {errorsAsset.name && <p className="text-xs text-destructive font-medium">{errorsAsset.name.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="category" className="text-sm font-semibold">Category</Label>
                <Input id="category" placeholder="e.g. Laptops, Monitors, Phones" {...registerAsset("category")} aria-invalid={!!errorsAsset.category} />
                {errorsAsset.category && <p className="text-xs text-destructive font-medium">{errorsAsset.category.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="branchId" className="text-sm font-semibold">Branch Location</Label>
                <Controller
                  name="branchId"
                  control={controlAsset}
                  render={({ field }) => {
                    const selectedBranch = branches.find((b) => b.id === field.value);
                    return (
                      <Popover open={isBranchPopoverOpen} onOpenChange={setIsBranchPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={isBranchPopoverOpen}
                            className="w-full h-10 justify-between text-left font-medium text-sm rounded-md border border-input bg-background px-3 hover:bg-background/80"
                          >
                            {selectedBranch ? (
                              <span>
                                {selectedBranch.name} {selectedBranch.code ? `(${selectedBranch.code})` : ""}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Select Branch Location</span>
                            )}
                            <RiArrowUpDownLine className="ml-2 size-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search branch..." />
                            <CommandList>
                              <CommandEmpty>No branch found.</CommandEmpty>
                              <CommandGroup>
                                {branches.map((b) => (
                                  <CommandItem
                                    key={b.id}
                                    value={b.name + (b.code ? ` ${b.code}` : "")}
                                    onSelect={() => {
                                      field.onChange(b.id);
                                      setIsBranchPopoverOpen(false);
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span>
                                        {b.name} {b.code ? `(${b.code})` : ""}
                                      </span>
                                      <RiCheckLine
                                        className={cn(
                                          "size-4 opacity-0",
                                          field.value === b.id && "opacity-100"
                                        )}
                                      />
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    );
                  }}
                />
                {errorsAsset.branchId && <p className="text-xs text-destructive font-medium">{errorsAsset.branchId.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="assetTag" className="text-sm font-semibold">Asset Tag / Barcode (Optional)</Label>
                <Input id="assetTag" placeholder="e.g. AST-00928" {...registerAsset("assetTag")} aria-invalid={!!errorsAsset.assetTag} />
                {errorsAsset.assetTag && <p className="text-xs text-destructive font-medium">{errorsAsset.assetTag.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="brand" className="text-sm font-semibold">Brand (Optional)</Label>
                <Input id="brand" placeholder="e.g. Apple" {...registerAsset("brand")} aria-invalid={!!errorsAsset.brand} />
                {errorsAsset.brand && <p className="text-xs text-destructive font-medium">{errorsAsset.brand.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="model" className="text-sm font-semibold">Model (Optional)</Label>
                <Input id="model" placeholder="e.g. MacBook Pro 16" {...registerAsset("model")} aria-invalid={!!errorsAsset.model} />
                {errorsAsset.model && <p className="text-xs text-destructive font-medium">{errorsAsset.model.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="serialNumber" className="text-sm font-semibold">Serial Number (Optional)</Label>
                <Input id="serialNumber" placeholder="S/N ID number" {...registerAsset("serialNumber")} aria-invalid={!!errorsAsset.serialNumber} />
                {errorsAsset.serialNumber && <p className="text-xs text-destructive font-medium">{errorsAsset.serialNumber.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="purchaseDate" className="text-sm font-semibold">Purchase Date (Optional)</Label>
                <Input id="purchaseDate" type="date" {...registerAsset("purchaseDate")} aria-invalid={!!errorsAsset.purchaseDate} />
                {errorsAsset.purchaseDate && <p className="text-xs text-destructive font-medium">{errorsAsset.purchaseDate.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="warrantyExpiry" className="text-sm font-semibold">Warranty Expiry (Optional)</Label>
                <Input id="warrantyExpiry" type="date" {...registerAsset("warrantyExpiry")} aria-invalid={!!errorsAsset.warrantyExpiry} />
                {errorsAsset.warrantyExpiry && <p className="text-xs text-destructive font-medium">{errorsAsset.warrantyExpiry.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="quantity" className="text-sm font-semibold">Quantity</Label>
                <Input id="quantity" type="number" min={1} placeholder="1" {...registerAsset("quantity")} aria-invalid={!!errorsAsset.quantity} />
                {errorsAsset.quantity && <p className="text-xs text-destructive font-medium">{errorsAsset.quantity.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="status" className="text-sm font-semibold">Status</Label>
                <Controller
                  name="status"
                  control={controlAsset}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="w-full h-10 border border-input bg-background font-medium text-sm rounded-md px-3">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active / Available</SelectItem>
                        <SelectItem value="REPAIR">In Repair</SelectItem>
                        <SelectItem value="RETIRED">Retired</SelectItem>
                        <SelectItem value="LOST">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errorsAsset.status && <p className="text-xs text-destructive font-medium">{errorsAsset.status.message}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes" className="text-sm font-semibold">Notes / Details (Optional)</Label>
              <Textarea id="notes" placeholder="Specifications, purchase reference, condition..." {...registerAsset("notes")} aria-invalid={!!errorsAsset.notes} rows={3} />
              {errorsAsset.notes && <p className="text-xs text-destructive font-medium">{errorsAsset.notes.message}</p>}
            </div>
          </form>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setIsAssetFormOpen(false)} disabled={submittingAsset}>Cancel</Button>
            <Button form="asset-form" type="submit" disabled={submittingAsset}>
              {submittingAsset ? "Saving..." : editingAsset ? "Save Changes" : "Create Asset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Asset Borrow Dialog */}
      <Dialog open={isBorrowFormOpen} onOpenChange={setIsBorrowFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <RiHandbagLine className="size-5 text-primary" />
              Borrow Asset
            </DialogTitle>
            <DialogDescription>
              Assign <strong>{borrowAssetTarget?.name}</strong> to a staff member.
            </DialogDescription>
          </DialogHeader>

          <form id="borrow-form" onSubmit={handleSubmitBorrow(onSubmitBorrow)} className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground font-semibold">Stock Availability</span>
              <span className="text-sm text-foreground font-medium">
                {borrowAssetTarget?.availableQuantity} out of {borrowAssetTarget?.quantity} units available to borrow.
              </span>
            </div>

            <div className="flex flex-col gap-2 bg-secondary/20 p-3 rounded-lg border border-secondary">
              <Label className="text-sm font-semibold">Borrower Type</Label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                  <input
                    type="radio"
                    name="borrowerType"
                    checked={borrowerType === "staff"}
                    onChange={() => {
                      setBorrowerType("staff");
                      setValueBorrow("borrowingBranchId", "");
                    }}
                    className="size-4 accent-primary"
                  />
                  Staff Member
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                  <input
                    type="radio"
                    name="borrowerType"
                    checked={borrowerType === "branch"}
                    onChange={() => {
                      setBorrowerType("branch");
                      setValueBorrow("staffId", "");
                    }}
                    className="size-4 accent-primary"
                  />
                  Branch / Location
                </label>
              </div>
            </div>

            {borrowerType === "staff" ? (
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-semibold">Select Staff Member</Label>
                <Controller
                  name="staffId"
                  control={controlBorrow}
                  render={({ field }) => {
                    const selectedStaff = staffList.find((s) => s.id === field.value);
                    return (
                      <Popover open={isStaffPopoverOpen} onOpenChange={setIsStaffPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={isStaffPopoverOpen}
                            className="w-full h-10 justify-between text-left font-medium text-sm rounded-md border border-input bg-background px-3 hover:bg-background/80"
                          >
                            {selectedStaff ? (
                              <span>
                                {selectedStaff.firstName} {selectedStaff.lastName} {selectedStaff.position ? `(${selectedStaff.position})` : ""}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Select borrowing staff...</span>
                            )}
                            <RiArrowUpDownLine className="ml-2 size-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search staff by name..." />
                            <CommandList>
                              <CommandEmpty>No active staff found.</CommandEmpty>
                              <CommandGroup>
                                {staffList.map((s) => (
                                  <CommandItem
                                    key={s.id}
                                    value={`${s.firstName} ${s.lastName} ${s.position || ""}`}
                                    onSelect={() => {
                                      field.onChange(s.id);
                                      setIsStaffPopoverOpen(false);
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span>
                                        {s.firstName} {s.lastName} {s.position ? `(${s.position})` : ""}
                                      </span>
                                      <RiCheckLine
                                        className={cn(
                                          "size-4 opacity-0",
                                          field.value === s.id && "opacity-100"
                                        )}
                                      />
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    );
                  }}
                />
                {errorsBorrow.staffId && <p className="text-xs text-destructive font-medium">{errorsBorrow.staffId.message}</p>}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-semibold">Select Borrowing Branch</Label>
                <Controller
                  name="borrowingBranchId"
                  control={controlBorrow}
                  render={({ field }) => {
                    const selectedBranch = branches.find((b) => b.id === field.value);
                    return (
                      <Popover open={isBorrowBranchPopoverOpen} onOpenChange={setIsBorrowBranchPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={isBorrowBranchPopoverOpen}
                            className="w-full h-10 justify-between text-left font-medium text-sm rounded-md border border-input bg-background px-3 hover:bg-background/80"
                          >
                            {selectedBranch ? (
                              <span>
                                {selectedBranch.name} {selectedBranch.code ? `(${selectedBranch.code})` : ""}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Select borrowing branch...</span>
                            )}
                            <RiArrowUpDownLine className="ml-2 size-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search branch..." />
                            <CommandList>
                              <CommandEmpty>No branch found.</CommandEmpty>
                              <CommandGroup>
                                {branches.map((b) => (
                                  <CommandItem
                                    key={b.id}
                                    value={b.name + (b.code ? ` ${b.code}` : "")}
                                    onSelect={() => {
                                      field.onChange(b.id);
                                      setIsBorrowBranchPopoverOpen(false);
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span>
                                        {b.name} {b.code ? `(${b.code})` : ""}
                                      </span>
                                      <RiCheckLine
                                        className={cn(
                                          "size-4 opacity-0",
                                          field.value === b.id && "opacity-100"
                                        )}
                                      />
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    );
                  }}
                />
                {errorsBorrow.borrowingBranchId && <p className="text-xs text-destructive font-medium">{errorsBorrow.borrowingBranchId.message}</p>}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-semibold">Quantity to Borrow</Label>
              <Controller
                name="quantity"
                control={controlBorrow}
                render={({ field }) => (
                  <Input
                    type="number"
                    min={1}
                    max={borrowAssetTarget?.availableQuantity || 1}
                    value={field.value}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                    aria-invalid={!!errorsBorrow.quantity}
                  />
                )}
              />
              {errorsBorrow.quantity && <p className="text-xs text-destructive font-medium">{errorsBorrow.quantity.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-semibold">Borrowing Notes / Purpose (Optional)</Label>
              <Textarea
                id="borrow-notes"
                placeholder="Details of borrowing purpose, expected return date..."
                {...controlBorrow.register("notes")}
                rows={2}
              />
            </div>
          </form>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setIsBorrowFormOpen(false)} disabled={submittingBorrow}>Cancel</Button>
            <Button form="borrow-form" type="submit" disabled={submittingBorrow}>
              {submittingBorrow ? "Saving..." : "Log Borrowing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Asset Confirmation Alert */}
      <AlertDialog open={!!assetToDelete} onOpenChange={(open) => !open && setAssetToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the asset registration for <strong>{assetToDelete?.name}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAsset} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Return Assets Confirmation Alert */}
      <AlertDialog open={!!logToReturn} onOpenChange={(open) => !open && setLogToReturn(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Register Return of Borrowed Assets</AlertDialogTitle>
            <AlertDialogDescription>
              Confirm return of <strong>{logToReturn?.quantity}</strong> unit(s) of <strong>{logToReturn?.asset.name}</strong> borrowed by <strong>{logToReturn?.staff ? `${logToReturn.staff.firstName} ${logToReturn.staff.lastName}` : logToReturn?.borrowingBranch ? `Branch: ${logToReturn.borrowingBranch.name}` : ""}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submittingReturn}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReturnAsset} disabled={submittingReturn} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Confirm Return
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
