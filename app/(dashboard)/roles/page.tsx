"use client";

import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { toast } from "sonner";
import {
  RiShieldLine,
  RiAddLine,
  RiSearchLine,
  RiSettingsLine,
  RiCpuLine,
  RiShieldKeyholeLine,
  RiEditLine,
  RiDeleteBinLine,
  RiMore2Fill,
} from "@remixicon/react";

import { createRoleSchema, type CreateRoleInput } from "@/lib/validations/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
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


interface Role {
  id: string;
  name: string;
  description: string | null;
  userCount: number;
  permissions: {
    id: string;
    name: string;
    key: string;
  }[];
  modules: {
    id: string;
    name: string;
    code: string;
  }[];
  createdAt: string;
}

interface Permission {
  id: string;
  name: string;
  key: string;
  module_id: string | null;
}

interface Module {
  id: string;
  name: string;
  code: string;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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
    defaultValues: {
      roleModulePermissions: [],
    },
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, permissionsRes, modulesRes] = await Promise.all([
        axios.get("/api/roles"),
        axios.get("/api/permissions"),
        axios.get("/api/modules"),
      ]);
      setRoles(rolesRes.data);
      setPermissions(permissionsRes.data);
      setModules(modulesRes.data);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to load roles configuration data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (editingRole) {
      reset({
        name: editingRole.name,
        description: editingRole.description || "",
        roleModulePermissions: (editingRole as any).roleModulePermissions?.map((rmp: any) => ({
          moduleId: rmp.moduleId,
          permissionId: rmp.permissionId,
        })) || [],
      });
    } else {
      reset({
        name: "",
        description: "",
        roleModulePermissions: [],
      });
    }
  }, [editingRole, isCreateOpen]);

  const openCreateDialog = () => {
    setEditingRole(null);
    setIsCreateOpen(true);
  };

  const openEditDialog = (role: Role) => {
    setEditingRole(role);
    setIsCreateOpen(true);
  };

  const handleDeleteRole = (role: Role) => {
    setRoleToDelete(role);
  };

  const confirmDeleteRole = async () => {
    if (!roleToDelete) return;
    const role = roleToDelete;
    setRoleToDelete(null);
    const toastId = toast.loading("Deleting role...");
    try {
      await axios.delete(`/api/roles/${role.id}`);
      toast.success("Role deleted successfully!", { id: toastId });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to delete role", { id: toastId });
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
      reset({
        name: "",
        description: "",
        roleModulePermissions: [],
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || (editingRole ? "Failed to update role" : "Failed to create role"), { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRoles = roles.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold text-foreground flex items-center gap-1.5">
                    <RiShieldLine className="size-4 text-muted-foreground" />
                    Roles Administration
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <main className="flex-1 p-6 space-y-6 bg-background/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Security Roles</h1>
              <p className="text-sm text-muted-foreground">
                Manage roles and define access permissions on specific modules.
              </p>
            </div>
            <Button onClick={openCreateDialog} className="sm:self-start">
              <RiAddLine className="mr-1.5 size-4" data-icon="inline-start" />
              Add Role
            </Button>
          </div>

          <div className="flex items-center gap-2 max-w-sm">
            <div className="relative flex-1">
              <RiSearchLine className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search roles..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Role Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Users</TableHead>
                  <TableHead>Modules</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RiSettingsLine className="size-8 animate-spin text-primary" />
                        <span>Loading security roles...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredRoles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No roles found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRoles.map((role) => (
                    <TableRow key={role.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-semibold text-foreground">
                        {role.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {role.description || "—"}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-sm">
                        {role.userCount}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {role.modules.length === 0 ? (
                            <span className="text-xs text-muted-foreground">None</span>
                          ) : (
                            role.modules.map((m) => (
                              <Badge key={m.id} variant="secondary" className="text-[10px] py-0 px-1.5 flex items-center gap-0.5 border">
                                <RiCpuLine className="size-3 text-muted-foreground" />
                                {m.name}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="size-8 p-0">
                              <span className="sr-only">Open Menu</span>
                              <RiMore2Fill className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-35">
                            <DropdownMenuItem onClick={() => openEditDialog(role)} className="cursor-pointer gap-2">
                              <RiEditLine className="size-4 text-muted-foreground" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteRole(role)} className="text-destructive cursor-pointer gap-2 focus:bg-destructive/10 focus:text-destructive">
                              <RiDeleteBinLine className="size-4" />
                              Delete Role
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </main>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
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
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-semibold">
                  Role Name
                </Label>
                <Input
                  id="name"
                  placeholder="e.g. System Administrator"
                  {...register("name")}
                  aria-invalid={!!errors.name}
                />
                {errors.name && (
                  <p className="text-xs text-destructive font-medium">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-sm font-semibold">
                  Description (Optional)
                </Label>
                <Input
                  id="description"
                  placeholder="e.g. Full system operations and access controls"
                  {...register("description")}
                />
              </div>              <div className="space-y-3">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <RiShieldKeyholeLine className="size-4 text-primary" />
                  Access Control (Modules & Permissions)
                </Label>
                <div className="border rounded-lg p-3 bg-muted/20 space-y-3 max-h-[300px] overflow-y-auto">
                  {modules.length === 0 && permissions.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No modules or permissions found</p>
                  ) : (
                    <Controller
                      name="roleModulePermissions"
                      control={control}
                      render={({ field }) => {
                        const value = field.value || [];

                        return (
                          <div className="space-y-3">
                            {modules.map((m) => {
                              const selectedForThisModule = value.filter((item: any) => item.moduleId === m.id);
                              const isModuleAllChecked = permissions.length > 0 && selectedForThisModule.length === permissions.length;

                              return (
                                <div key={m.id} className="border rounded-lg p-3 bg-background/50 space-y-2">
                                  <label className="flex items-center gap-2 font-bold text-xs text-foreground cursor-pointer">
                                    <Checkbox
                                      checked={isModuleAllChecked}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          const otherModules = value.filter((item: any) => item.moduleId !== m.id);
                                          const newItems = permissions.map((p) => ({
                                            moduleId: m.id,
                                            permissionId: p.id,
                                          }));
                                          field.onChange([...otherModules, ...newItems]);
                                        } else {
                                          field.onChange(value.filter((item: any) => item.moduleId !== m.id));
                                        }
                                      }}
                                    />
                                    <span>{m.name} Module</span>
                                  </label>

                                  {permissions.length > 0 ? (
                                    <div className="pl-6 grid grid-cols-2 gap-2 pt-2 border-t border-border/40 mt-1.5">
                                      {permissions.map((p) => {
                                        const isPermChecked = value.some(
                                          (item: any) => item.moduleId === m.id && item.permissionId === p.id
                                        );
                                        return (
                                          <label
                                            key={p.id}
                                            className="flex items-center gap-2 p-1 rounded cursor-pointer text-xs font-medium transition-colors hover:bg-muted/60"
                                          >
                                            <Checkbox
                                              checked={isPermChecked}
                                              onCheckedChange={(checked) => {
                                                if (checked) {
                                                  field.onChange([...value, { moduleId: m.id, permissionId: p.id }]);
                                                } else {
                                                  field.onChange(
                                                    value.filter(
                                                      (item: any) =>
                                                        !(item.moduleId === m.id && item.permissionId === p.id)
                                                    )
                                                  );
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

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : editingRole ? "Save Changes" : "Create Role"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!roleToDelete} onOpenChange={(open) => !open && setRoleToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the security role{" "}
                <strong>{roleToDelete?.name}</strong> and remove all its permission mappings.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteRole}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarInset>
    </SidebarProvider>
  );
}
