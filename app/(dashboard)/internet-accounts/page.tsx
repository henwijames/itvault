"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import {
  RiGlobalLine,
  RiAddLine,
  RiExchangeLine,
  RiHistoryLine,
  RiArrowRightLine,
  RiFileDownloadLine,
  RiFileUploadLine,
  RiBookOpenLine,
  RiTimeLine,
} from "@remixicon/react";

import {
  createInternetAccountSchema,
  migrateInternetAccountSchema,
  type CreateInternetAccountInput,
  type MigrateInternetAccountInput,
} from "@/lib/validations/internet-accounts";
import { useAuth } from "@/components/auth-context";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { formatDateToWords } from "@/lib/utils";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { type InternetAccount, getColumns } from "./columns";

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
  position: string | null;
  isActive: boolean;
}

interface MigrationLog {
  id: string;
  fromBranch: { name: string; code: string | null } | null;
  toBranch: { name: string; code: string | null } | null;
  reason: string | null;
  migratedAt: string;
}

interface StatusLog {
  id: string;
  status: "NEW" | "RENEWED" | "FOR_CANCELLATION" | "CANCELLED";
  notes: string | null;
  createdAt: string;
}

interface ApiErrorResponse {
  error: string;
}

interface AccountFormValues {
  branchId: string;
  originalBranchId?: string | null;
  accountHolderId?: string | null;
  accountType: "SHOP" | "ACCOMMODATION";
  status?: "NEW" | "RENEWED" | "FOR_CANCELLATION" | "CANCELLED";
  statusNotes?: string | null;
  providerSource?: string | null;
  accountNumber: string;
  shipmentNumber?: string | null;
  startDate?: string | null;
  contractEndDate?: string | null;
  notes?: string | null;
}

interface MigrateFormValues {
  toBranchId: string;
  reason?: string | null;
}

export default function InternetAccountsPage() {
  const { hasPermission } = useAuth();
  const [accounts, setAccounts] = useState<InternetAccount[]>([]);
  const [branches, setBranches] = useState<BranchLookup[]>([]);
  const [staffList, setStaffList] = useState<StaffLookup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [isMigrateOpen, setIsMigrateOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isStatusLogsOpen, setIsStatusLogsOpen] = useState<boolean>(false);
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [accountToDelete, setAccountToDelete] = useState<InternetAccount | null>(null);

  const [activeAccount, setActiveAccount] = useState<InternetAccount | null>(null);
  const [migrationHistory, setMigrationHistory] = useState<MigrationLog[]>([]);
  const [statusLogs, setStatusLogs] = useState<StatusLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [loadingStatusLogs, setLoadingStatusLogs] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // CSV Import state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Account Form hook
  const {
    register: registerAcc,
    handleSubmit: handleSubmitAcc,
    control: controlAcc,
    reset: resetAcc,
    watch: watchAcc,
    formState: { errors: errorsAcc },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(createInternetAccountSchema),
    defaultValues: {
      branchId: "",
      originalBranchId: "",
      accountHolderId: "",
      accountType: "SHOP",
      status: "NEW",
      statusNotes: "",
      providerSource: "",
      accountNumber: "",
      shipmentNumber: "",
      startDate: "",
      contractEndDate: "",
      notes: "",
    },
  });

  const selectedStatus = watchAcc("status");
  const isStatusChanged = activeAccount && selectedStatus !== activeAccount.status;

  // Migrate Form hook
  const {
    register: registerMigrate,
    handleSubmit: handleSubmitMigrate,
    control: controlMigrate,
    reset: resetMigrate,
    formState: { errors: errorsMigrate },
  } = useForm<MigrateFormValues>({
    resolver: zodResolver(migrateInternetAccountSchema),
    defaultValues: {
      toBranchId: "",
      reason: "",
    },
  });

  const fetchData = async (): Promise<void> => {
    setLoading(true);
    try {
      const [accountsRes, branchesRes, staffRes] = await Promise.all([
        axios.get<InternetAccount[]>("/api/internet-accounts"),
        axios.get<BranchLookup[]>("/api/branches"),
        axios.get<StaffLookup[]>("/api/staff"),
      ]);
      setAccounts(accountsRes.data);
      setBranches(branchesRes.data.filter((b) => b.status !== "DELETED"));
      setStaffList(staffRes.data.filter((s) => s.isActive));
    } catch (err: unknown) {
      console.error(err);
      const axiosError = err as AxiosError<ApiErrorResponse>;
      toast.error(axiosError.response?.data?.error || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sync edit values
  useEffect(() => {
    if (activeAccount && isFormOpen) {
      resetAcc({
        branchId: activeAccount.branchId,
        originalBranchId: activeAccount.originalBranchId || "",
        accountHolderId: activeAccount.accountHolderId || "",
        accountType: activeAccount.accountType,
        status: activeAccount.status,
        statusNotes: "",
        providerSource: activeAccount.providerSource || "",
        accountNumber: activeAccount.accountNumber,
        shipmentNumber: activeAccount.shipmentNumber || "",
        startDate: activeAccount.startDate || "",
        contractEndDate: activeAccount.contractEndDate || "",
        notes: activeAccount.notes || "",
      });
    } else if (!isFormOpen) {
      resetAcc({
        branchId: "",
        originalBranchId: "",
        accountHolderId: "",
        accountType: "SHOP",
        status: "NEW",
        statusNotes: "",
        providerSource: "",
        accountNumber: "",
        shipmentNumber: "",
        startDate: "",
        contractEndDate: "",
        notes: "",
      });
    }
  }, [activeAccount, isFormOpen, resetAcc]);

  // Reset migrate form when modal toggles
  useEffect(() => {
    if (!isMigrateOpen) {
      resetMigrate({
        toBranchId: "",
        reason: "",
      });
    }
  }, [isMigrateOpen, resetMigrate]);

  const openCreateDialog = (): void => {
    setActiveAccount(null);
    setIsFormOpen(true);
  };

  const openEditDialog = (account: InternetAccount): void => {
    setActiveAccount(account);
    setIsFormOpen(true);
  };

  const openMigrateDialog = (account: InternetAccount): void => {
    setActiveAccount(account);
    setIsMigrateOpen(true);
  };

  const openHistoryDialog = async (account: InternetAccount): Promise<void> => {
    setActiveAccount(account);
    setIsHistoryOpen(true);
    setLoadingHistory(true);
    try {
      const res = await axios.get<MigrationLog[]>(`/api/internet-accounts/${account.id}/migrate`);
      setMigrationHistory(res.data);
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to load migration history");
    } finally {
      setLoadingHistory(false);
    }
  };

  const openStatusLogsDialog = async (account: InternetAccount): Promise<void> => {
    setActiveAccount(account);
    setIsStatusLogsOpen(true);
    setLoadingStatusLogs(true);
    try {
      const res = await axios.get<StatusLog[]>(`/api/internet-accounts/${account.id}/status-logs`);
      setStatusLogs(res.data);
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to load status logs");
    } finally {
      setLoadingStatusLogs(false);
    }
  };

  const confirmDeleteAccount = async (): Promise<void> => {
    if (!accountToDelete) return;
    const account = accountToDelete;
    setAccountToDelete(null);
    const toastId = toast.loading("Deleting internet account...");
    try {
      await axios.delete(`/api/internet-accounts/${account.id}`);
      toast.success("Internet account deleted successfully!", { id: toastId });
      fetchData();
    } catch (err: unknown) {
      const axiosError = err as AxiosError<ApiErrorResponse>;
      toast.error(axiosError.response?.data?.error || "Failed to delete account", { id: toastId });
    }
  };

  const onSubmitAccount = async (data: AccountFormValues): Promise<void> => {
    setSubmitting(true);
    const toastId = toast.loading(activeAccount ? "Updating internet account..." : "Creating internet account...");

    const payload = {
      ...data,
      originalBranchId: data.originalBranchId || null,
      accountHolderId: data.accountHolderId || null,
      providerSource: data.providerSource || null,
      shipmentNumber: data.shipmentNumber || null,
      startDate: data.startDate || null,
      contractEndDate: data.contractEndDate || null,
      notes: data.notes || null,
      statusNotes: data.statusNotes || null,
    };

    try {
      if (activeAccount) {
        await axios.patch(`/api/internet-accounts/${activeAccount.id}`, payload);
        toast.success("Internet account updated successfully!", { id: toastId });
      } else {
        await axios.post("/api/internet-accounts", payload);
        toast.success("Internet account created successfully!", { id: toastId });
      }
      setIsFormOpen(false);
      fetchData();
    } catch (err: unknown) {
      const axiosError = err as AxiosError<ApiErrorResponse>;
      toast.error(
        axiosError.response?.data?.error || "An error occurred while saving the account details",
        { id: toastId }
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmitMigrate = async (data: MigrateFormValues): Promise<void> => {
    if (!activeAccount) return;
    setSubmitting(true);
    const toastId = toast.loading("Processing branch migration...");

    const payload = {
      toBranchId: data.toBranchId,
      reason: data.reason || null,
    };

    try {
      await axios.post(`/api/internet-accounts/${activeAccount.id}/migrate`, payload);
      toast.success("Internet account migrated successfully!", { id: toastId });
      setIsMigrateOpen(false);
      fetchData();
    } catch (err: unknown) {
      const axiosError = err as AxiosError<ApiErrorResponse>;
      toast.error(
        axiosError.response?.data?.error || "Failed to complete account migration",
        { id: toastId }
      );
    } finally {
      setSubmitting(false);
    }
  };

  // CSV Import Helpers
  const downloadCSVTemplate = (): void => {
    const headers = [
      "accountType", "branch", "originalBranch", "accountNumber", "providerSource", 
      "shipmentNumber", "startDate", "contractEndDate", "status", 
      "notes", "staffName", "staffEmiratesId", "staffEmiratesIdExpiry", 
      "staffDateOfBirth", "staffContactNumber"
    ].join(",");
    const row1 = "SHOP,Main Branch,Originally From Branch,1.2345678,Du,0501234567,2025-01-01,2026-01-01,NEW,100 Mbps line,John Doe,784-1990-1234567-1,2027-05-15,1990-06-15,0507654321";
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + row1;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "internet_accounts_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = async (): Promise<void> => {
    if (!csvFile) return;
    setSubmitting(true);
    const toastId = toast.loading("Parsing and importing CSV rows...");

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) {
        toast.error("File is empty or could not be read", { id: toastId });
        setSubmitting(false);
        return;
      }

      const lines = text.split(/\r?\n/);
      if (lines.length <= 1) {
        toast.error("CSV file contains no rows besides headers", { id: toastId });
        setSubmitting(false);
        return;
      }

      // Read headers
      const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
      const rows = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple CSV splitter
        const values = line.split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
        const rowObj: any = {};
        headers.forEach((header, index) => {
          rowObj[header] = values[index] !== undefined && values[index] !== "" ? values[index] : null;
        });
        rows.push(rowObj);
      }

      try {
        const res = await axios.post("/api/internet-accounts/import", { rows });
        const data = res.data;
        if (data.skipped && data.skipped.length > 0) {
          toast.warning(`Import completed. Added ${data.createdCount} accounts. Skipped ${data.skipped.length} rows (check console for detail).`, { id: toastId, duration: 8000 });
          console.warn("Skipped rows detail:", data.skipped);
        } else {
          toast.success(`Successfully imported all ${data.createdCount} accounts!`, { id: toastId });
        }
        setIsImportOpen(false);
        setCsvFile(null);
        fetchData();
      } catch (err: unknown) {
        const axiosError = err as AxiosError<ApiErrorResponse>;
        toast.error(axiosError.response?.data?.error || "Failed to process database import", { id: toastId });
      } finally {
        setSubmitting(false);
      }
    };
    reader.readAsText(csvFile);
  };

  // Filter target branches for migration (exclude current branch)
  const migrationBranches = useMemo(() => {
    if (!activeAccount) return branches;
    return branches.filter((b) => b.id !== activeAccount.branchId);
  }, [branches, activeAccount]);

  const columns = useMemo(
    () =>
      getColumns({
        hasPermission,
        onEdit: openEditDialog,
        onMigrate: openMigrateDialog,
        onViewHistory: openHistoryDialog,
        onViewStatusLogs: openStatusLogsDialog,
        onDelete: setAccountToDelete,
        onViewDetails: (account) => {
          setActiveAccount(account);
          setIsDetailsOpen(true);
        },
      }),
    [hasPermission]
  );

  if (!hasPermission("internet_accounts", "view")) {
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
            <h1 className="text-2xl font-bold tracking-tight">Internet Subscription Accounts</h1>
            <p className="text-sm text-muted-foreground">
              Manage network lines, subscriptions, location details, track status state logs, and run imports.
            </p>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={accounts}
          searchKey="accountNumber"
          searchPlaceholder="Search by account number..."
          isLoading={loading}
          emptyMessage="No internet accounts registered."
          headerAction={
            <div className="flex items-center gap-2">
              {hasPermission("internet_accounts", "create") && (
                <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                  <RiFileUploadLine className="size-4" data-icon="inline-start" />
                  Import CSV
                </Button>
              )}
              {hasPermission("internet_accounts", "create") && (
                <Button onClick={openCreateDialog}>
                  <RiAddLine className="size-4" data-icon="inline-start" />
                  Add Account
                </Button>
              )}
            </div>
          }
        />
      </main>

      {/* Account Create/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <RiGlobalLine className="size-5 text-primary" />
              {activeAccount ? "Edit Account Details" : "Register Internet Account"}
            </DialogTitle>
            <DialogDescription>
              Provide account credentials, contract timeline, and select the location assignment.
            </DialogDescription>
          </DialogHeader>

          <form id="account-form" onSubmit={handleSubmitAcc(onSubmitAccount)} className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="accountNumber" className="text-sm font-semibold">Account Number</Label>
                <Input id="accountNumber" placeholder="e.g. 1.2345678" {...registerAcc("accountNumber")} aria-invalid={!!errorsAcc.accountNumber} />
                {errorsAcc.accountNumber && <p className="text-xs text-destructive font-medium">{errorsAcc.accountNumber.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="shipmentNumber" className="text-sm font-semibold">Shipment / Line Number (Optional)</Label>
                <Input id="shipmentNumber" placeholder="e.g. 0501234567" {...registerAcc("shipmentNumber")} aria-invalid={!!errorsAcc.shipmentNumber} />
                {errorsAcc.shipmentNumber && <p className="text-xs text-destructive font-medium">{errorsAcc.shipmentNumber.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="accountType" className="text-sm font-semibold">Account Type</Label>
                <Controller
                  name="accountType"
                  control={controlAcc}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="w-full h-10 border border-input bg-background font-medium text-sm rounded-md px-3">
                        <SelectValue placeholder="Select Account Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SHOP">Shop</SelectItem>
                        <SelectItem value="ACCOMMODATION">Accommodation</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errorsAcc.accountType && <p className="text-xs text-destructive font-medium">{errorsAcc.accountType.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="status" className="text-sm font-semibold">Account Status</Label>
                <Controller
                  name="status"
                  control={controlAcc}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="w-full h-10 border border-input bg-background font-medium text-sm rounded-md px-3">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NEW">New</SelectItem>
                        <SelectItem value="RENEWED">Renewed</SelectItem>
                        <SelectItem value="FOR_CANCELLATION">For Cancellation</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errorsAcc.status && <p className="text-xs text-destructive font-medium">{errorsAcc.status.message}</p>}
              </div>
            </div>

            {isStatusChanged && (
              <div className="flex flex-col gap-1.5 bg-primary/5 border border-primary/20 rounded-md p-3">
                <Label htmlFor="statusNotes" className="text-sm font-semibold text-primary">Reason for Status Change</Label>
                <Textarea id="statusNotes" placeholder="Specify why the status is changing (e.g. renewal confirmation, requested cancellation)..." {...registerAcc("statusNotes")} aria-invalid={!!errorsAcc.statusNotes} rows={2} />
                {errorsAcc.statusNotes && <p className="text-xs text-destructive font-medium">{errorsAcc.statusNotes.message}</p>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="providerSource" className="text-sm font-semibold">Provider / Source (Optional)</Label>
                <Input id="providerSource" placeholder="e.g. Du, Etisalat" {...registerAcc("providerSource")} aria-invalid={!!errorsAcc.providerSource} />
                {errorsAcc.providerSource && <p className="text-xs text-destructive font-medium">{errorsAcc.providerSource.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="branchId" className="text-sm font-semibold">Current Branch Location</Label>
                <Controller
                  name="branchId"
                  control={controlAcc}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="w-full h-10 border border-input bg-background font-medium text-sm rounded-md px-3">
                        <SelectValue placeholder="Select Branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name} {b.code ? `(${b.code})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errorsAcc.branchId && <p className="text-xs text-destructive font-medium">{errorsAcc.branchId.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="originalBranchId" className="text-sm font-semibold">Original Branch Location (Optional)</Label>
                <Controller
                  name="originalBranchId"
                  control={controlAcc}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || "none"}>
                      <SelectTrigger className="w-full h-10 border border-input bg-background font-medium text-sm rounded-md px-3">
                        <SelectValue placeholder="No Original Branch" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Same as current / None</SelectItem>
                        {branches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name} {b.code ? `(${b.code})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errorsAcc.originalBranchId && <p className="text-xs text-destructive font-medium">{errorsAcc.originalBranchId.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="accountHolderId" className="text-sm font-semibold">Account Holder / Linked Staff (Optional)</Label>
                <Controller
                  name="accountHolderId"
                  control={controlAcc}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || "none"}>
                      <SelectTrigger className="w-full h-10 border border-input bg-background font-medium text-sm rounded-md px-3">
                        <SelectValue placeholder="Select Staff Member" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No associated staff</SelectItem>
                        {staffList.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.firstName} {s.lastName} {s.position ? `(${s.position})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errorsAcc.accountHolderId && <p className="text-xs text-destructive font-medium">{errorsAcc.accountHolderId.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="startDate" className="text-sm font-semibold">Contract Start Date (Optional)</Label>
                <Input id="startDate" type="date" {...registerAcc("startDate")} aria-invalid={!!errorsAcc.startDate} />
                {errorsAcc.startDate && <p className="text-xs text-destructive font-medium">{errorsAcc.startDate.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contractEndDate" className="text-sm font-semibold">Contract End Date (Optional)</Label>
                <Input id="contractEndDate" type="date" {...registerAcc("contractEndDate")} aria-invalid={!!errorsAcc.contractEndDate} />
                {errorsAcc.contractEndDate && <p className="text-xs text-destructive font-medium">{errorsAcc.contractEndDate.message}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes" className="text-sm font-semibold">Notes / Additional Specs (Optional)</Label>
              <Textarea id="notes" placeholder="Specify package detail, router specs, IP configs..." {...registerAcc("notes")} aria-invalid={!!errorsAcc.notes} rows={3} />
              {errorsAcc.notes && <p className="text-xs text-destructive font-medium">{errorsAcc.notes.message}</p>}
            </div>
          </form>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={submitting}>Cancel</Button>
            <Button form="account-form" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : activeAccount ? "Save Changes" : "Register Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Migration Trigger Dialog */}
      <Dialog open={isMigrateOpen} onOpenChange={setIsMigrateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <RiExchangeLine className="size-5 text-primary" />
              Migrate Branch Assignment
            </DialogTitle>
            <DialogDescription>
              Move Internet Account <strong>{activeAccount?.accountNumber}</strong> to a different physical branch.
            </DialogDescription>
          </DialogHeader>

          <form id="migrate-form" onSubmit={handleSubmitMigrate(onSubmitMigrate)} className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="toBranchId" className="text-sm font-semibold">Target Branch Location</Label>
              <Controller
                name="toBranchId"
                control={controlMigrate}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="w-full h-10 border border-input bg-background font-medium text-sm rounded-md px-3">
                      <SelectValue placeholder="Select Destination Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {migrationBranches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name} {b.code ? `(${b.code})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errorsMigrate.toBranchId && <p className="text-xs text-destructive font-medium">{errorsMigrate.toBranchId.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reason" className="text-sm font-semibold">Reason for Migration (Optional)</Label>
              <Textarea id="reason" placeholder="Explain why this connection line is being transferred..." {...registerMigrate("reason")} aria-invalid={!!errorsMigrate.reason} rows={3} />
              {errorsMigrate.reason && <p className="text-xs text-destructive font-medium">{errorsMigrate.reason.message}</p>}
            </div>
          </form>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setIsMigrateOpen(false)} disabled={submitting}>Cancel</Button>
            <Button form="migrate-form" type="submit" disabled={submitting}>
              {submitting ? "Migrating..." : "Execute Migration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Migration History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <RiHistoryLine className="size-5 text-primary" />
              Migration Log Timeline
            </DialogTitle>
            <DialogDescription>
              History of location adjustments for Account <strong>{activeAccount?.accountNumber}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {loadingHistory ? (
              <div className="text-center text-sm text-muted-foreground py-8">Loading logs...</div>
            ) : migrationHistory.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">This account has never been migrated.</div>
            ) : (
              <div className="relative border-l border-muted ml-3 pl-6 flex flex-col gap-6">
                {migrationHistory.map((log) => (
                  <div key={log.id} className="relative">
                    <span className="absolute -left-[31px] top-1.5 bg-background border-2 border-primary rounded-full size-4 flex items-center justify-center shrink-0">
                      <span className="size-1.5 bg-primary rounded-full" />
                    </span>
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground font-semibold">
                        <span>{new Date(log.migratedAt).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">{log.fromBranch?.name || "Unknown"}</span>
                        <RiArrowRightLine className="size-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm font-semibold text-primary">{log.toBranch?.name || "Unknown"}</span>
                      </div>
                      {log.reason && (
                        <p className="text-xs text-muted-foreground bg-muted/40 border border-muted/20 rounded p-2 mt-1">
                          <strong>Reason:</strong> {log.reason}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setIsHistoryOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status History Logs Dialog */}
      <Dialog open={isStatusLogsOpen} onOpenChange={setIsStatusLogsOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <RiTimeLine className="size-5 text-primary" />
              Status State History Log
            </DialogTitle>
            <DialogDescription>
              Chronological log of status adjustments for Account <strong>{activeAccount?.accountNumber}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {loadingStatusLogs ? (
              <div className="text-center text-sm text-muted-foreground py-8">Loading history logs...</div>
            ) : statusLogs.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">No status transition log records found.</div>
            ) : (
              <div className="relative border-l border-muted ml-3 pl-6 flex flex-col gap-6">
                {statusLogs.map((log) => (
                  <div key={log.id} className="relative">
                    <span className="absolute -left-[31px] top-1.5 bg-background border-2 border-primary rounded-full size-4 flex items-center justify-center shrink-0">
                      <span className="size-1.5 bg-primary rounded-full" />
                    </span>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-mono">{new Date(log.createdAt).toLocaleString()}</span>
                        <span className="text-xs font-bold uppercase tracking-wider text-primary border border-primary/20 rounded px-1.5 py-0.5 bg-primary/5">
                          {log.status.replace("_", " ")}
                        </span>
                      </div>
                      {log.notes && (
                        <p className="text-xs text-muted-foreground bg-muted/40 border border-muted/20 rounded p-2 mt-1">
                          {log.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setIsStatusLogsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <RiFileUploadLine className="size-5 text-primary" />
              Import Subscription Data via CSV
            </DialogTitle>
            <DialogDescription>
              Upload a comma-separated `.csv` file matching our data columns. Missing branch codes and staff members will be created automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-3">
            <div className="bg-muted/40 border border-muted rounded-md p-4 flex flex-col gap-2">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Required Schema Format:</span>
              <p className="text-xs text-muted-foreground leading-normal">
                `accountType`, `branch`, `originalBranch`, `accountNumber`, `providerSource`, `shipmentNumber`, `startDate`, `contractEndDate`, `status`, `notes`, `staffName`, `staffEmiratesId`, `staffEmiratesIdExpiry`, `staffDateOfBirth`, `staffContactNumber`
              </p>
              <Button type="button" variant="link" onClick={downloadCSVTemplate} className="h-auto p-0 self-start text-xs font-semibold flex items-center gap-1 text-primary">
                <RiFileDownloadLine className="size-3.5" />
                Download Sample CSV Template
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="csvFile" className="text-sm font-semibold">Select CSV File</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="csvFile"
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setCsvFile(file || null);
                  }}
                  ref={fileInputRef}
                  className="flex-1"
                />
                {csvFile && (
                  <Button type="button" variant="ghost" onClick={() => {
                    setCsvFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }} className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setIsImportOpen(false)} disabled={submitting}>Cancel</Button>
            <Button type="button" onClick={handleImportCSV} disabled={!csvFile || submitting}>
              {submitting ? "Uploading & Importing..." : "Start Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!accountToDelete} onOpenChange={(open: boolean) => !open && setAccountToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete internet account <strong>{accountToDelete?.accountNumber}</strong> and all of its associated migration records. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAccount} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Account Details Sheet */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="sm:max-w-[450px] overflow-y-auto flex flex-col gap-6 p-6">
          <SheetHeader className="border-b pb-4">
            <div className="flex items-center gap-2 mb-1">
              {activeAccount?.accountType && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {activeAccount.accountType}
                </span>
              )}
              {activeAccount?.status && (
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                  activeAccount.status === "NEW" ? "bg-sky-50 text-sky-700 border border-sky-200" :
                  activeAccount.status === "RENEWED" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                  activeAccount.status === "FOR_CANCELLATION" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                  "bg-gray-50 text-gray-700 border border-gray-200"
                }`}>
                  {activeAccount.status.replace("_", " ")}
                </span>
              )}
            </div>
            <SheetTitle className="text-xl font-bold font-mono text-foreground break-all">
              {activeAccount?.accountNumber}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground mt-0.5">
              Full subscription credentials, location mapping, and holder details.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 flex flex-col gap-5 text-sm">
            {/* Connection Information */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Subscription Info</h3>
              <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded-lg border">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground font-medium">Provider / Source</span>
                  <span className="font-semibold text-foreground text-xs">{activeAccount?.providerSource || "—"}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground font-medium">Shipment / Line #</span>
                  <span className="font-mono text-foreground text-xs font-semibold">{activeAccount?.shipmentNumber || "—"}</span>
                </div>
              </div>
            </div>

            {/* Location & Routing */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Location Assignment</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-2.5 p-2.5 rounded-lg border bg-background/50 hover:bg-background transition-colors">
                  <div className="size-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                    <RiGlobalLine className="size-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase">Current Branch</span>
                    <span className="font-semibold text-foreground text-xs mt-0.5">{activeAccount?.branch?.name}</span>
                    {activeAccount?.branch?.code && (
                      <span className="text-[10px] text-muted-foreground font-mono mt-0.5">Code: {activeAccount.branch.code}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-lg border bg-background/50 hover:bg-background transition-colors">
                  <div className="size-8 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                    <RiExchangeLine className="size-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase">Original Branch</span>
                    <span className="font-semibold text-foreground text-xs mt-0.5">
                      {activeAccount?.originalBranch?.name || activeAccount?.branch?.name}
                    </span>
                    {(activeAccount?.originalBranch?.code || activeAccount?.branch?.code) && (
                      <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        Code: {activeAccount?.originalBranch?.code || activeAccount?.branch?.code}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Contract Dates */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Contract Validity</h3>
              <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded-lg border">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                    <RiTimeLine className="size-3 text-muted-foreground" /> Start Date
                  </span>
                  <span className="text-foreground text-xs font-semibold">{formatDateToWords(activeAccount?.startDate)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                    <RiTimeLine className="size-3 text-muted-foreground" /> End Date
                  </span>
                  <span className="text-foreground text-xs font-semibold">{formatDateToWords(activeAccount?.contractEndDate)}</span>
                </div>
              </div>
            </div>

            {/* Linked Staff Member */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Account Holder</h3>
              <div className="p-4 rounded-lg border bg-background/50 space-y-3">
                {activeAccount?.accountHolder ? (
                  <>
                    <div className="flex items-center gap-3 border-b pb-3">
                      <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                        <span className="font-bold text-sm uppercase">
                          {activeAccount.accountHolder.firstName.slice(0, 1)}
                          {activeAccount.accountHolder.lastName.slice(0, 1)}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground text-sm">
                          {activeAccount.accountHolder.firstName} {activeAccount.accountHolder.lastName}
                        </span>
                        {activeAccount.accountHolder.position && (
                          <span className="text-xs text-muted-foreground">{activeAccount.accountHolder.position}</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                      {activeAccount.accountHolder.email && (
                        <div className="flex flex-col gap-0.5 col-span-2 border-b border-dashed pb-1.5">
                          <span className="text-[10px] text-muted-foreground font-semibold uppercase">Email Address</span>
                          <span className="text-foreground break-all">{activeAccount.accountHolder.email}</span>
                        </div>
                      )}
                      {activeAccount.accountHolder.mobileNumber && (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-muted-foreground font-semibold uppercase">Mobile Number</span>
                          <span className="text-foreground font-mono">{activeAccount.accountHolder.mobileNumber}</span>
                        </div>
                      )}
                      {activeAccount.accountHolder.contactNumber && (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-muted-foreground font-semibold uppercase">Contact Number</span>
                          <span className="text-foreground font-mono">{activeAccount.accountHolder.contactNumber}</span>
                        </div>
                      )}
                      {activeAccount.accountHolder.dateOfBirth && (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-muted-foreground font-semibold uppercase">Date of Birth</span>
                          <span className="text-foreground">{formatDateToWords(activeAccount.accountHolder.dateOfBirth)}</span>
                        </div>
                      )}
                      {activeAccount.accountHolder.emiratesIdNumber && (
                        <div className="flex flex-col gap-0.5 col-span-2 border-t border-dashed pt-1.5 mt-1">
                          <span className="text-[10px] text-muted-foreground font-semibold uppercase">Emirates ID</span>
                          <div className="flex items-center justify-between text-foreground font-mono mt-0.5">
                            <span>{activeAccount.accountHolder.emiratesIdNumber}</span>
                            {activeAccount.accountHolder.emiratesIdExpiry && (
                              <span className="text-[10px] text-muted-foreground font-sans">Expires: {formatDateToWords(activeAccount.accountHolder.emiratesIdExpiry)}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-2">
                    <span className="text-xs text-muted-foreground">No linked staff member assigned</span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes Section */}
            {activeAccount?.notes && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Notes / Remarks</h3>
                <div className="bg-muted/30 p-3 rounded-lg border text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed max-h-[120px] overflow-y-auto font-sans">
                  {activeAccount.notes}
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-4 flex flex-col gap-1 text-[10px] text-muted-foreground font-mono">
            <span>Created At: {activeAccount?.createdAt ? new Date(activeAccount.createdAt).toLocaleString() : "—"}</span>
            <span>Updated At: {activeAccount?.updatedAt ? new Date(activeAccount.updatedAt).toLocaleString() : "—"}</span>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
