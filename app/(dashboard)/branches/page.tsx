"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import {
  RiGitBranchLine,
  RiAddLine,
} from "@remixicon/react";

import { createBranchSchema, type CreateBranchInput } from "@/lib/validations/branches";
import { useAuth } from "@/components/auth-context";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

import { type Branch, getColumns } from "./columns";

interface ApiErrorResponse {
  error: string;
}

export default function BranchesPage() {
  const { hasPermission } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateBranchInput & { status?: "ACTIVE" | "INACTIVE" }>({
    resolver: zodResolver(createBranchSchema),
    defaultValues: {
      name: "",
      code: "",
      address: "",
      status: "ACTIVE",
    },
  });

  const fetchBranches = async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await axios.get<Branch[]>("/api/branches");
      setBranches(res.data);
    } catch (err: unknown) {
      console.error(err);
      const axiosError = err as AxiosError<ApiErrorResponse>;
      toast.error(axiosError.response?.data?.error || "Failed to load branches data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (editingBranch) {
      reset({
        name: editingBranch.name,
        code: editingBranch.code || "",
        address: editingBranch.address || "",
        status: editingBranch.status || "ACTIVE",
      });
    } else {
      reset({
        name: "",
        code: "",
        address: "",
        status: "ACTIVE",
      });
    }
  }, [editingBranch, isCreateOpen, reset]);

  const openCreateDialog = (): void => {
    setEditingBranch(null);
    setIsCreateOpen(true);
  };

  const openEditDialog = (branch: Branch): void => {
    setEditingBranch(branch);
    setIsCreateOpen(true);
  };

  const handleDeleteBranch = (branch: Branch): void => {
    setBranchToDelete(branch);
  };

  const confirmDeleteBranch = async (): Promise<void> => {
    if (!branchToDelete) return;
    const branch = branchToDelete;
    setBranchToDelete(null);
    const toastId = toast.loading("Deleting branch...");
    try {
      await axios.delete(`/api/branches/${branch.id}`);
      toast.success("Branch deleted successfully!", { id: toastId });
      fetchBranches();
    } catch (err: unknown) {
      const axiosError = err as AxiosError<ApiErrorResponse>;
      toast.error(axiosError.response?.data?.error || "Failed to delete branch", { id: toastId });
    }
  };

  const onSubmit = async (data: CreateBranchInput & { status?: "ACTIVE" | "INACTIVE" }): Promise<void> => {
    setSubmitting(true);
    const toastId = toast.loading(editingBranch ? "Updating branch..." : "Creating branch...");
    try {
      if (editingBranch) {
        await axios.patch(`/api/branches/${editingBranch.id}`, data);
        toast.success("Branch updated successfully!", { id: toastId });
      } else {
        await axios.post("/api/branches", data);
        toast.success("Branch created successfully!", { id: toastId });
      }
      setIsCreateOpen(false);
      reset({ name: "", code: "", address: "", status: "ACTIVE" });
      fetchBranches();
    } catch (err: unknown) {
      const axiosError = err as AxiosError<ApiErrorResponse>;
      toast.error(
        axiosError.response?.data?.error ||
          (editingBranch ? "Failed to update branch" : "Failed to create branch"),
        { id: toastId }
      );
    } finally {
      setSubmitting(false);
    }
  };

  const columns = useMemo(
    () => getColumns({ hasPermission, onEdit: openEditDialog, onDelete: handleDeleteBranch }),
    [hasPermission]
  );

  if (!hasPermission("branches", "view")) {
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
            <h1 className="text-2xl font-bold tracking-tight">Branches</h1>
            <p className="text-sm text-muted-foreground">
              Manage organization physical locations and retail branches.
            </p>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={branches}
          searchKey="name"
          searchPlaceholder="Search branches..."
          isLoading={loading}
          emptyMessage="No branches found."
          headerAction={
            hasPermission("branches", "create") ? (
              <Button onClick={openCreateDialog}>
                <RiAddLine data-icon="inline-start" />
                Add Branch
              </Button>
            ) : undefined
          }
        />
      </main>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <RiGitBranchLine className="size-5 text-primary" />
              {editingBranch ? "Edit Branch" : "Create New Branch"}
            </DialogTitle>
            <DialogDescription>
              {editingBranch
                ? "Update organization physical location details."
                : "Define a physical branch or location in the organization."}
            </DialogDescription>
          </DialogHeader>
          <form id="branch-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name" className="text-sm font-semibold">Branch Name</Label>
                <Input id="name" placeholder="e.g. Dubai Mall Outlet" {...register("name")} aria-invalid={!!errors.name} />
                {errors.name && <p className="text-xs text-destructive font-medium">{errors.name.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="code" className="text-sm font-semibold">Code (Optional)</Label>
                <Input id="code" placeholder="e.g. dxb-01" {...register("code")} aria-invalid={!!errors.code} />
                {errors.code && <p className="text-xs text-destructive font-medium">{errors.code.message}</p>}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address" className="text-sm font-semibold">Address (Optional)</Label>
              <Input id="address" placeholder="Full address of this location" {...register("address")} aria-invalid={!!errors.address} />
              {errors.address && <p className="text-xs text-destructive font-medium">{errors.address.message}</p>}
            </div>
            {editingBranch && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="status" className="text-sm font-semibold">Status</Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <SelectTrigger className="w-full h-10 border border-input bg-background font-medium text-sm rounded-md px-3">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}
          </form>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} disabled={submitting}>Cancel</Button>
              <Button form="branch-form" type="submit" disabled={submitting}>
                {submitting ? "Saving..." : editingBranch ? "Save Changes" : "Create Branch"}
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!branchToDelete} onOpenChange={(open: boolean) => !open && setBranchToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will soft-delete the branch <strong>{branchToDelete?.name}</strong>. It can be restored or managed in the database later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteBranch} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
