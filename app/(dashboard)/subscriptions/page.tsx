"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import {
  RiBookmarkLine,
  RiAddLine,
  RiArrowUpDownLine,
  RiCheckLine,
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

import { createSubscriptionSchema, type CreateSubscriptionInput } from "@/lib/validations/subscriptions";
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

import { type Subscription, getColumns } from "./columns";

interface BranchLookup {
  id: string;
  name: string;
  code: string | null;
  status: string;
}

interface ApiErrorResponse {
  error: string;
}

export default function SubscriptionsPage() {
  const { hasPermission } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [branches, setBranches] = useState<BranchLookup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [isBranchPopoverOpen, setIsBranchPopoverOpen] = useState<boolean>(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [subToDelete, setSubToDelete] = useState<Subscription | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateSubscriptionInput>({
    resolver: zodResolver(createSubscriptionSchema),
    defaultValues: {
      name: "",
      branchId: "",
      provider: "",
      accountEmail: "",
      accountUsername: "",
      accountPassword: "",
      startDate: "",
      expiryDate: "",
      amount: "",
      status: "ACTIVE",
      notes: "",
    },
  });

  const fetchData = async (): Promise<void> => {
    setLoading(true);
    try {
      const [subsRes, branchesRes] = await Promise.all([
        axios.get<Subscription[]>("/api/subscriptions"),
        axios.get<BranchLookup[]>("/api/branches"),
      ]);
      setSubscriptions(subsRes.data);
      setBranches(branchesRes.data.filter((b) => b.status !== "DELETED"));
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

  useEffect(() => {
    if (editingSub && isFormOpen) {
      reset({
        name: editingSub.name,
        branchId: editingSub.branchId,
        provider: editingSub.provider || "",
        accountEmail: editingSub.accountEmail || "",
        accountUsername: editingSub.accountUsername || "",
        accountPassword: editingSub.accountPassword || "",
        startDate: editingSub.startDate || "",
        expiryDate: editingSub.expiryDate || "",
        amount: editingSub.amount || "",
        status: editingSub.status,
        notes: editingSub.notes || "",
      });
    } else if (!isFormOpen) {
      reset({
        name: "",
        branchId: "",
        provider: "",
        accountEmail: "",
        accountUsername: "",
        accountPassword: "",
        startDate: "",
        expiryDate: "",
        amount: "",
        status: "ACTIVE",
        notes: "",
      });
    }
  }, [editingSub, isFormOpen, reset]);

  const openCreateDialog = (): void => {
    setEditingSub(null);
    setIsFormOpen(true);
  };

  const openEditDialog = (sub: Subscription): void => {
    setEditingSub(sub);
    setIsFormOpen(true);
  };

  const confirmDeleteSub = async (): Promise<void> => {
    if (!subToDelete) return;
    const sub = subToDelete;
    setSubToDelete(null);
    const toastId = toast.loading("Deleting subscription...");
    try {
      await axios.delete(`/api/subscriptions/${sub.id}`);
      toast.success("Subscription deleted successfully!", { id: toastId });
      fetchData();
    } catch (err: unknown) {
      const axiosError = err as AxiosError<ApiErrorResponse>;
      toast.error(axiosError.response?.data?.error || "Failed to delete subscription", { id: toastId });
    }
  };

  const onSubmit = async (data: CreateSubscriptionInput): Promise<void> => {
    setSubmitting(true);
    const toastId = toast.loading(editingSub ? "Updating subscription..." : "Creating subscription...");

    const payload = {
      ...data,
      provider: data.provider || null,
      accountEmail: data.accountEmail || null,
      accountUsername: data.accountUsername || null,
      accountPassword: data.accountPassword || null,
      startDate: data.startDate || null,
      expiryDate: data.expiryDate || null,
      amount: data.amount || null,
      notes: data.notes || null,
    };

    try {
      if (editingSub) {
        await axios.patch(`/api/subscriptions/${editingSub.id}`, payload);
        toast.success("Subscription updated successfully!", { id: toastId });
      } else {
        await axios.post("/api/subscriptions", payload);
        toast.success("Subscription created successfully!", { id: toastId });
      }
      setIsFormOpen(false);
      fetchData();
    } catch (err: unknown) {
      const axiosError = err as AxiosError<ApiErrorResponse>;
      toast.error(
        axiosError.response?.data?.error || "An error occurred while saving subscription",
        { id: toastId }
      );
    } finally {
      setSubmitting(false);
    }
  };

  const columns = useMemo(
    () =>
      getColumns({
        hasPermission,
        onEdit: openEditDialog,
        onDelete: setSubToDelete,
      }),
    [hasPermission]
  );

  if (!hasPermission("subscriptions", "view")) {
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
            <h1 className="text-2xl font-bold tracking-tight">Subscriptions</h1>
            <p className="text-sm text-muted-foreground">
              Manage software-as-a-service, domain names, hostings, and digital licenses details.
            </p>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={subscriptions}
          searchKey="name"
          searchPlaceholder="Search subscriptions..."
          isLoading={loading}
          emptyMessage="No subscriptions registered."
          headerAction={
            hasPermission("subscriptions", "create") ? (
              <Button onClick={openCreateDialog}>
                <RiAddLine className="size-4" data-icon="inline-start" />
                Add Subscription
              </Button>
            ) : undefined
          }
        />
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <RiBookmarkLine className="size-5 text-primary" />
              {editingSub ? "Edit Subscription" : "Add New Subscription"}
            </DialogTitle>
            <DialogDescription>
              Provide license details, associated credentials, pricing, and expiration settings.
            </DialogDescription>
          </DialogHeader>

          <form id="subscription-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name" className="text-sm font-semibold">Subscription Name</Label>
              <Input id="name" placeholder="e.g. Microsoft 365 Business" {...register("name")} aria-invalid={!!errors.name} />
              {errors.name && <p className="text-xs text-destructive font-medium">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="branchId" className="text-sm font-semibold">Branch Location</Label>
                <Controller
                  name="branchId"
                  control={control}
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
                              <span className="text-muted-foreground">Search and select branch...</span>
                            )}
                            <RiArrowUpDownLine className="ml-2 size-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Type to search branch..." />
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
                {errors.branchId && <p className="text-xs text-destructive font-medium">{errors.branchId.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="provider" className="text-sm font-semibold">Provider / Vendor (Optional)</Label>
                <Input id="provider" placeholder="e.g. Microsoft, GoDaddy" {...register("provider")} aria-invalid={!!errors.provider} />
                {errors.provider && <p className="text-xs text-destructive font-medium">{errors.provider.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="accountEmail" className="text-sm font-semibold">Account Email (Optional)</Label>
                <Input id="accountEmail" type="text" placeholder="e.g. admin@branch.com" {...register("accountEmail")} aria-invalid={!!errors.accountEmail} />
                {errors.accountEmail && <p className="text-xs text-destructive font-medium">{errors.accountEmail.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="accountUsername" className="text-sm font-semibold">Username (Optional)</Label>
                <Input id="accountUsername" placeholder="Username/ID" {...register("accountUsername")} aria-invalid={!!errors.accountUsername} />
                {errors.accountUsername && <p className="text-xs text-destructive font-medium">{errors.accountUsername.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="accountPassword" className="text-sm font-semibold">Password (Optional)</Label>
                <Input id="accountPassword" type="text" placeholder="Password value" {...register("accountPassword")} aria-invalid={!!errors.accountPassword} />
                {errors.accountPassword && <p className="text-xs text-destructive font-medium">{errors.accountPassword.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="startDate" className="text-sm font-semibold">Start Date (Optional)</Label>
                <Input id="startDate" type="date" {...register("startDate")} aria-invalid={!!errors.startDate} />
                {errors.startDate && <p className="text-xs text-destructive font-medium">{errors.startDate.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="expiryDate" className="text-sm font-semibold">Expiry Date (Optional)</Label>
                <Input id="expiryDate" type="date" {...register("expiryDate")} aria-invalid={!!errors.expiryDate} />
                {errors.expiryDate && <p className="text-xs text-destructive font-medium">{errors.expiryDate.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="amount" className="text-sm font-semibold">Amount / Cost (Optional)</Label>
                <Input id="amount" placeholder="e.g. 299.90" {...register("amount")} aria-invalid={!!errors.amount} />
                {errors.amount && <p className="text-xs text-destructive font-medium">{errors.amount.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="status" className="text-sm font-semibold">Status</Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="w-full h-10 border border-input bg-background font-medium text-sm rounded-md px-3">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="EXPIRED">Expired</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.status && <p className="text-xs text-destructive font-medium">{errors.status.message}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes" className="text-sm font-semibold">Notes / Description (Optional)</Label>
              <Textarea id="notes" placeholder="Any serial numbers, user limitations, renewal steps..." {...register("notes")} aria-invalid={!!errors.notes} rows={3} />
              {errors.notes && <p className="text-xs text-destructive font-medium">{errors.notes.message}</p>}
            </div>
          </form>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={submitting}>Cancel</Button>
            <Button form="subscription-form" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : editingSub ? "Save Changes" : "Create Subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!subToDelete} onOpenChange={(open) => !open && setSubToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the subscription registration for <strong>{subToDelete?.name}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSub} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
