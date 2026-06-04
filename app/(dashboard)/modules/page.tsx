"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { toast } from "sonner";
import {
  RiCpuLine,
  RiAddLine,
} from "@remixicon/react";

import { createModuleSchema, type CreateModuleInput } from "@/lib/validations/modules";
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

import { type Module, getColumns } from "./columns";

export default function ModulesPage() {
  const { hasPermission } = useAuth();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<Module | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateModuleInput & { status?: string }>({
    resolver: zodResolver(createModuleSchema),
    defaultValues: { status: "ACTIVE" },
  });

  const fetchModules = async () => {
    setLoading(true);
    try {
      const modulesRes = await axios.get("/api/modules");
      setModules(modulesRes.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      console.error(err);
      toast.error(error.response?.data?.error || "Failed to load modules data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchModules(); }, []);

  useEffect(() => {
    if (editingModule) {
      reset({ name: editingModule.name, code: editingModule.code, description: editingModule.description || "", status: editingModule.status || "ACTIVE" });
    } else {
      reset({ name: "", code: "", description: "", status: "ACTIVE" });
    }
  }, [editingModule, isCreateOpen, reset]);

  const openCreateDialog = () => { setEditingModule(null); setIsCreateOpen(true); };
  const openEditDialog = (mod: Module) => { setEditingModule(mod); setIsCreateOpen(true); };
  const handleDeleteModule = (mod: Module) => { setModuleToDelete(mod); };

  const confirmDeleteModule = async () => {
    if (!moduleToDelete) return;
    const mod = moduleToDelete;
    setModuleToDelete(null);
    const toastId = toast.loading("Deleting module...");
    try {
      await axios.delete(`/api/modules/${mod.id}`);
      toast.success("Module deleted successfully!", { id: toastId });
      fetchModules();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || "Failed to delete module", { id: toastId });
    }
  };

  const onSubmit = async (data: CreateModuleInput & { status?: string }) => {
    setSubmitting(true);
    const toastId = toast.loading(editingModule ? "Updating module..." : "Creating module...");
    try {
      if (editingModule) {
        await axios.patch(`/api/modules/${editingModule.id}`, data);
        toast.success("Module updated successfully!", { id: toastId });
      } else {
        await axios.post("/api/modules", data);
        toast.success("Module created successfully!", { id: toastId });
      }
      setIsCreateOpen(false);
      reset({ name: "", code: "", description: "", status: "ACTIVE" });
      fetchModules();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || (editingModule ? "Failed to update module" : "Failed to create module"), { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const columns = useMemo(
    () => getColumns({ hasPermission, onEdit: openEditDialog, onDelete: handleDeleteModule }),
    [hasPermission]
  );

  return (
    <>
      <main className="flex-1 p-6 flex flex-col gap-6 bg-background/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">System Modules</h1>
            <p className="text-sm text-muted-foreground">
              Manage system capability modules, binding them to access keys and user privileges.
            </p>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={modules}
          searchKey="name"
          searchPlaceholder="Search modules..."
          isLoading={loading}
          emptyMessage="No modules found."
          headerAction={
            hasPermission("modules", "create") ? (
              <Button onClick={openCreateDialog}>
                <RiAddLine data-icon="inline-start" />
                Add Module
              </Button>
            ) : undefined
          }
        />
      </main>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <RiCpuLine className="size-5 text-primary" />
              {editingModule ? "Edit Module" : "Create New Module"}
            </DialogTitle>
            <DialogDescription>
              {editingModule ? "Update capability block details." : "Define a capability block of the IT Vault system."}
            </DialogDescription>
          </DialogHeader>
          <form id="module-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name" className="text-sm font-semibold">Module Name</Label>
                <Input id="name" placeholder="e.g. Asset Registry" {...register("name")} aria-invalid={!!errors.name} />
                {errors.name && <p className="text-xs text-destructive font-medium">{errors.name.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="code" className="text-sm font-semibold">Code (Unique Identifier)</Label>
                <Input id="code" placeholder="e.g. assets" {...register("code")} aria-invalid={!!errors.code} />
                {errors.code && <p className="text-xs text-destructive font-medium">{errors.code.message}</p>}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description" className="text-sm font-semibold">Description (Optional)</Label>
              <Input id="description" placeholder="Summary of this module's responsibilities" {...register("description")} />
            </div>
            {editingModule && (
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
              <Button form="module-form" type="submit" disabled={submitting}>
                {submitting ? "Saving..." : editingModule ? "Save Changes" : "Create Module"}
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!moduleToDelete} onOpenChange={(open) => !open && setModuleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the module <strong>{moduleToDelete?.name}</strong> and remove all its role bindings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteModule} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
