"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { toast } from "sonner";
import {
  RiShieldKeyholeLine,
  RiAddLine,
} from "@remixicon/react";

import { createPermissionSchema, type CreatePermissionInput } from "@/lib/validations/permissions";
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

import { type Permission, getColumns } from "./columns";

export default function PermissionsPage() {
  const { hasPermission } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [permissionToDelete, setPermissionToDelete] = useState<Permission | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreatePermissionInput & { status?: string }>({
    resolver: zodResolver(createPermissionSchema),
    defaultValues: { name: "", key: "", description: "", status: "ACTIVE" },
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const permissionsRes = await axios.get("/api/permissions");
      let permsData: Permission[] = [];
      if (Array.isArray(permissionsRes.data)) {
        permsData = permissionsRes.data;
      } else if (permissionsRes.data && Array.isArray(permissionsRes.data.permissions)) {
        permsData = permissionsRes.data.permissions;
      }
      setPermissions(permsData);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      console.error(err);
      toast.error(error.response?.data?.error || "Failed to load permissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (editingPermission) {
      reset({ name: editingPermission.name, key: editingPermission.key, description: editingPermission.description || "", status: editingPermission.status || "ACTIVE" });
    } else {
      reset({ name: "", key: "", description: "", status: "ACTIVE" });
    }
  }, [editingPermission, isCreateOpen, reset]);

  const openCreateDialog = () => { setEditingPermission(null); setIsCreateOpen(true); };
  const openEditDialog = (perm: Permission) => { setEditingPermission(perm); setIsCreateOpen(true); };
  const handleDeletePermission = (perm: Permission) => { setPermissionToDelete(perm); };

  const confirmDeletePermission = async () => {
    if (!permissionToDelete) return;
    const perm = permissionToDelete;
    setPermissionToDelete(null);
    const toastId = toast.loading("Deleting permission...");
    try {
      await axios.delete(`/api/permissions/${perm.id}`);
      toast.success("Permission deleted successfully!", { id: toastId });
      fetchData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || "Failed to delete permission", { id: toastId });
    }
  };

  const onSubmit = async (data: CreatePermissionInput & { status?: string }) => {
    setSubmitting(true);
    const toastId = toast.loading(editingPermission ? "Updating permission..." : "Creating permission...");
    try {
      if (editingPermission) {
        await axios.patch(`/api/permissions/${editingPermission.id}`, data);
        toast.success("Permission updated successfully!", { id: toastId });
      } else {
        await axios.post("/api/permissions", data);
        toast.success("Permission created successfully!", { id: toastId });
      }
      setIsCreateOpen(false);
      reset();
      fetchData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || (editingPermission ? "Failed to update permission" : "Failed to create permission"), { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const columns = useMemo(
    () => getColumns({ hasPermission, onEdit: openEditDialog, onDelete: handleDeletePermission }),
    [hasPermission]
  );

  return (
    <>
      <main className="flex-1 p-6 flex flex-col gap-6 bg-background/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Permissions</h1>
            <p className="text-sm text-muted-foreground">
              Manage system-wide permissions used to enforce functional RBAC security.
            </p>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={permissions}
          searchKey="name"
          searchPlaceholder="Search permissions..."
          isLoading={loading}
          emptyMessage="No permissions found."
          headerAction={
            hasPermission("permissions", "create") ? (
              <Button onClick={openCreateDialog}>
                <RiAddLine data-icon="inline-start" />
                Add Permission
              </Button>
            ) : undefined
          }
        />
      </main>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <RiShieldKeyholeLine className="size-5 text-primary" />
              {editingPermission ? "Edit Permission" : "Create New Permission"}
            </DialogTitle>
            <DialogDescription>
              {editingPermission
                ? "Update permission details and secure system access rules."
                : "Define a new permission key to secure system endpoints and UI menus."}
            </DialogDescription>
          </DialogHeader>
          <form id="permission-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name" className="text-sm font-semibold">Permission Name</Label>
              <Input id="name" placeholder="e.g. View Documents" {...register("name")} aria-invalid={!!errors.name} />
              {errors.name && <p className="text-xs text-destructive font-medium">{errors.name.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description" className="text-sm font-semibold">Description (Optional)</Label>
              <Input id="description" placeholder="Give a short summary of this permission's scope" {...register("description")} />
            </div>
            {editingPermission && (
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} disabled={submitting}>Cancel</Button>
              <Button form="permission-form" type="submit" disabled={submitting}>
                {submitting ? "Saving..." : editingPermission ? "Save Changes" : "Create Permission"}
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!permissionToDelete} onOpenChange={(open) => !open && setPermissionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the permission <strong>{permissionToDelete?.name}</strong> (<code>{permissionToDelete?.key}</code>) and remove all its role bindings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePermission} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
