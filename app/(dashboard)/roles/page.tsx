"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { toast } from "sonner";
import {
  RiShieldLine,
  RiAddLine,
  RiShieldKeyholeLine,
} from "@remixicon/react";

import { createRoleSchema, type CreateRoleInput } from "@/lib/validations/roles";
import { useAuth } from "@/components/auth-context";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

import { type Role, getColumns } from "./columns";

interface PermissionItem {
  id: string;
  name: string;
  key: string;
  module_id: string | null;
}

interface ModuleItem {
  id: string;
  name: string;
  code: string;
}

interface RoleModulePermission {
  moduleId: string;
  permissionId: string;
}

export default function RolesPage() {
  const { hasPermission, refreshUser } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateRoleInput>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: { roleModulePermissions: [] },
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, permissionsRes, modulesRes] = await Promise.all([
        axios.get("/api/roles"),
        hasPermission("permissions", "view") ? axios.get("/api/permissions") : Promise.resolve({ data: [] }),
        hasPermission("modules", "view") ? axios.get("/api/modules") : Promise.resolve({ data: [] }),
      ]);
      setRoles(rolesRes.data);
      setPermissions(permissionsRes.data);
      setModules(modulesRes.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      console.error(err);
      toast.error(error.response?.data?.error || "Failed to load roles configuration data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (editingRole) {
      reset({
        name: editingRole.name,
        description: editingRole.description || "",
        roleModulePermissions: editingRole.roleModulePermissions?.map((rmp) => ({
          moduleId: rmp.moduleId,
          permissionId: rmp.permissionId,
        })) || [],
      });
    } else {
      reset({ name: "", description: "", roleModulePermissions: [] });
    }
  }, [editingRole, isCreateOpen, reset]);

  const openCreateDialog = () => { setEditingRole(null); setIsCreateOpen(true); };
  const openEditDialog = (role: Role) => { setEditingRole(role); setIsCreateOpen(true); };
  const handleDeleteRole = (role: Role) => { setRoleToDelete(role); };

  const confirmDeleteRole = async () => {
    if (!roleToDelete) return;
    const role = roleToDelete;
    setRoleToDelete(null);
    const toastId = toast.loading("Deleting role...");
    try {
      await axios.delete(`/api/roles/${role.id}`);
      toast.success("Role deleted successfully!", { id: toastId });
      fetchData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || "Failed to delete role", { id: toastId });
    }
  };

  const onSubmit = async (data: CreateRoleInput) => {
    setSubmitting(true);
    const toastId = toast.loading(editingRole ? "Updating role..." : "Creating role...");
    try {
      if (editingRole) {
        await axios.put(`/api/roles/${editingRole.id}`, data);
        toast.success("Role updated successfully!", { id: toastId });
      } else {
        await axios.post("/api/roles", data);
        toast.success("Role created successfully!", { id: toastId });
      }
      setIsCreateOpen(false);
      reset({ name: "", description: "", roleModulePermissions: [] });
      await fetchData();
      await refreshUser();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || (editingRole ? "Failed to update role" : "Failed to create role"), { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const columns = useMemo(
    () => getColumns({ hasPermission, onEdit: openEditDialog, onDelete: handleDeleteRole }),
    [hasPermission]
  );

  return (
    <>
      <main className="flex-1 p-6 flex flex-col gap-6 bg-background/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Security Roles</h1>
            <p className="text-sm text-muted-foreground">
              Manage roles and define access permissions on specific modules.
            </p>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={roles}
          searchKey="name"
          searchPlaceholder="Search roles..."
          isLoading={loading}
          emptyMessage="No roles found."
          headerAction={
            hasPermission("roles", "create") ? (
              <Button onClick={openCreateDialog}>
                <RiAddLine data-icon="inline-start" />
                Add Role
              </Button>
            ) : undefined
          }
        />
      </main>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] ">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <RiShieldLine className="size-5 text-primary" />
              {editingRole ? "Edit Security Role" : "Create Security Role"}
            </DialogTitle>
            <DialogDescription>
              {editingRole
                ? "Modify structural capabilities and access bindings for this security role."
                : "Establish a new role and allocate functional modules & access privileges."}
            </DialogDescription>
          </DialogHeader>
          <form id="role-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name" className="text-sm font-semibold">Role Name</Label>
              <Input id="name" placeholder="e.g. System Administrator" {...register("name")} aria-invalid={!!errors.name} />
              {errors.name && <p className="text-xs text-destructive font-medium">{errors.name.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description" className="text-sm font-semibold">Description (Optional)</Label>
              <Input id="description" placeholder="e.g. Full system operations and access controls" {...register("description")} />
            </div>
            <div className="flex flex-col gap-3">
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                <RiShieldKeyholeLine className="size-4 text-primary" />
                Access Control (Modules & Permissions)
              </Label>
              <div className="border rounded-lg p-3 bg-muted/20 flex flex-col gap-3 max-h-[300px] overflow-y-auto">
                {modules.length === 0 && permissions.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No modules or permissions found</p>
                ) : (
                  <Controller
                    name="roleModulePermissions"
                    control={control}
                    render={({ field }) => {
                      const value: RoleModulePermission[] = field.value || [];
                      return (
                        <div className="flex flex-col gap-3">
                          {modules.map((m) => {
                            const selectedForThisModule = value.filter((item) => item.moduleId === m.id);
                            const isModuleAllChecked = permissions.length > 0 && selectedForThisModule.length === permissions.length;
                            return (
                              <div key={m.id} className="border rounded-lg p-3 bg-background/50 flex flex-col gap-2">
                                <label className="flex items-center gap-2 font-bold text-xs text-foreground cursor-pointer">
                                  <Checkbox
                                    checked={isModuleAllChecked}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        const otherModules = value.filter((item) => item.moduleId !== m.id);
                                        const newItems = permissions.map((p) => ({ moduleId: m.id, permissionId: p.id }));
                                        field.onChange([...otherModules, ...newItems]);
                                      } else {
                                        field.onChange(value.filter((item) => item.moduleId !== m.id));
                                      }
                                    }}
                                  />
                                  <span>{m.name} Module</span>
                                </label>
                                {permissions.length > 0 ? (
                                  <div className="pl-6 grid grid-cols-2 gap-2 pt-2 border-t border-border/40 mt-1.5">
                                    {permissions.map((p) => {
                                      const isPermChecked = value.some((item) => item.moduleId === m.id && item.permissionId === p.id);
                                      return (
                                        <label key={p.id} className="flex items-center gap-2 p-1 rounded cursor-pointer text-xs font-medium transition-colors hover:bg-muted/60">
                                          <Checkbox
                                            checked={isPermChecked}
                                            onCheckedChange={(checked) => {
                                              if (checked) {
                                                field.onChange([...value, { moduleId: m.id, permissionId: p.id }]);
                                              } else {
                                                field.onChange(value.filter((item) => !(item.moduleId === m.id && item.permissionId === p.id)));
                                              }
                                            }}
                                          />
                                          <span>{p.name}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-muted-foreground pl-6 italic">No global permissions defined</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    }}
                  />
                )}
              </div>
            </div>
          </form>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} disabled={submitting}>Cancel</Button>
              <Button form="role-form" type="submit" disabled={submitting}>
                {submitting ? "Saving..." : editingRole ? "Save Changes" : "Create Role"}
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!roleToDelete} onOpenChange={(open) => !open && setRoleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the security role <strong>{roleToDelete?.name}</strong> and remove all its permission mappings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteRole} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
