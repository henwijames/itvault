"use client";

import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { toast } from "sonner";
import {
  RiShieldKeyholeLine,
  RiAddLine,
  RiSearchLine,
  RiSettingsLine,
  RiEyeLine,
  RiDeleteBinLine,
  RiEditLine,
  RiMore2Fill,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
} from "@remixicon/react";

import { createPermissionSchema, type CreatePermissionInput } from "@/lib/validations/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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


interface Permission {
  id: string;
  name: string;
  key: string;
  description: string | null;
  status: "ACTIVE" | "INACTIVE";
  created_at: string;
}

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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
    defaultValues: {
      name: "",
      key: "",
      description: "",
      status: "ACTIVE",
    },
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const permissionsRes = await axios.get("/api/permissions");
      
      let permsData = [];
      if (Array.isArray(permissionsRes.data)) {
        permsData = permissionsRes.data;
      } else if (permissionsRes.data && Array.isArray(permissionsRes.data.permissions)) {
        permsData = permissionsRes.data.permissions;
      }
      setPermissions(permsData);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to load permissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (editingPermission) {
      reset({
        name: editingPermission.name,
        key: editingPermission.key,
        description: editingPermission.description || "",
        status: editingPermission.status || "ACTIVE",
      });
    } else {
      reset({
        name: "",
        key: "",
        description: "",
        status: "ACTIVE",
      });
    }
  }, [editingPermission, isCreateOpen]);

  const openCreateDialog = () => {
    setEditingPermission(null);
    setIsCreateOpen(true);
  };

  const openEditDialog = (perm: Permission) => {
    setEditingPermission(perm);
    setIsCreateOpen(true);
  };

  const handleDeletePermission = (perm: Permission) => {
    setPermissionToDelete(perm);
  };

  const confirmDeletePermission = async () => {
    if (!permissionToDelete) return;
    const perm = permissionToDelete;
    setPermissionToDelete(null);
    const toastId = toast.loading("Deleting permission...");
    try {
      await axios.delete(`/api/permissions/${perm.id}`);
      toast.success("Permission deleted successfully!", { id: toastId });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to delete permission", { id: toastId });
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
    } catch (err: any) {
      toast.error(err.response?.data?.error || (editingPermission ? "Failed to update permission" : "Failed to create permission"), { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPermissions = permissions.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.key.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 flex items-center gap-1 font-semibold text-xs py-0.5 w-fit">
            <RiCheckboxCircleLine className="size-3 text-emerald-600" />
            Active
          </Badge>
        );
      case "INACTIVE":
        return (
          <Badge variant="outline" className="text-rose-700 bg-rose-50 border-rose-200 flex items-center gap-1 font-semibold text-xs py-0.5 w-fit">
            <RiCloseCircleLine className="size-3 text-rose-600" />
            Inactive
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

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
                    <RiShieldKeyholeLine className="size-4 text-muted-foreground" />
                    Permissions Management
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <main className="flex-1 p-6 space-y-6 bg-background/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Permissions</h1>
              <p className="text-sm text-muted-foreground">
                Manage system-wide permissions used to enforce functional RBAC security.
              </p>
            </div>
            <Button onClick={openCreateDialog} className="sm:self-start">
              <RiAddLine className="mr-1.5 size-4" data-icon="inline-start" />
              Add Permission
            </Button>
          </div>

          <div className="flex items-center gap-2 max-w-sm">
            <div className="relative flex-1">
              <RiSearchLine className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search permissions..."
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
                  <TableHead className="w-[200px]">Name</TableHead>
                  <TableHead className="w-[200px]">System Key</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RiSettingsLine className="size-8 animate-spin text-primary" />
                        <span>Loading permissions...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredPermissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No permissions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPermissions.map((permission) => (
                    <TableRow key={permission.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-semibold text-foreground">
                        {permission.name}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono text-primary font-medium border border-border">
                          {permission.key}
                        </code>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {permission.description || "—"}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(permission.status)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs font-semibold">
                          System
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="size-8 p-0">
                              <span className="sr-only">Open Menu</span>
                              <RiMore2Fill className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[140px]">
                            <DropdownMenuItem onClick={() => openEditDialog(permission)} className="cursor-pointer gap-2">
                              <RiEditLine className="size-4 text-muted-foreground" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeletePermission(permission)} className="text-destructive cursor-pointer gap-2 focus:bg-destructive/10 focus:text-destructive">
                              <RiDeleteBinLine className="size-4" />
                              Delete Perm
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
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-semibold">
                  Permission Name
                </Label>
                <Input
                  id="name"
                  placeholder="e.g. View Documents"
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
                  placeholder="Give a short summary of this permission's scope"
                  {...register("description")}
                />
              </div>

              {editingPermission && (
                <div className="space-y-1.5">
                  <Label htmlFor="status" className="text-sm font-semibold">
                    Status
                  </Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
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
                  {submitting ? "Saving..." : editingPermission ? "Save Changes" : "Create Permission"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!permissionToDelete} onOpenChange={(open) => !open && setPermissionToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the permission{" "}
                <strong>{permissionToDelete?.name}</strong> (<code>{permissionToDelete?.key}</code>) and remove all its role bindings.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeletePermission}
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
