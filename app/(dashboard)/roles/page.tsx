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
} from "@remixicon/react";

import { createRoleSchema, type CreateRoleInput } from "@/lib/validations/roles";
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
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateRoleInput>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      permissionIds: [],
      moduleIds: [],
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

  const onSubmit = async (data: CreateRoleInput) => {
    setSubmitting(true);
    const toastId = toast.loading("Creating role...");
    try {
      await axios.post("/api/roles", data);
      toast.success("Role created successfully!", { id: toastId });
      setIsCreateOpen(false);
      reset({
        name: "",
        description: "",
        permissionIds: [],
        moduleIds: [],
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to create role", { id: toastId });
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
            <Button onClick={() => setIsCreateOpen(true)} className="sm:self-start">
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
                  <TableHead className="w-[180px]">Role Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px] text-center">Users</TableHead>
                  <TableHead className="w-[200px]">Modules</TableHead>
                  <TableHead className="w-[250px]">Permissions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RiSettingsLine className="size-8 animate-spin text-primary" />
                        <span>Loading security roles...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredRoles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
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
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {role.permissions.length === 0 ? (
                            <span className="text-xs text-muted-foreground">None</span>
                          ) : (
                            role.permissions.map((p) => (
                              <Badge key={p.id} variant="outline" className="text-[10px] py-0 px-1.5 flex items-center gap-0.5">
                                <RiShieldKeyholeLine className="size-3 text-muted-foreground" />
                                {p.name}
                              </Badge>
                            ))
                          )}
                        </div>
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
                Create Security Role
              </DialogTitle>
              <DialogDescription>
                Establish a new role and allocate functional modules & access privileges.
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1">
                    <RiCpuLine className="size-4 text-muted-foreground" />
                    Link Modules
                  </Label>
                  <div className="border rounded-lg p-3 h-[180px] overflow-y-auto bg-muted/20 space-y-2">
                    {modules.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No modules found</p>
                    ) : (
                      <Controller
                        name="moduleIds"
                        control={control}
                        render={({ field }) => {
                          const selected = field.value || [];
                          return (
                            <div className="space-y-2">
                              {modules.map((m) => {
                                const isChecked = selected.includes(m.id);
                                return (
                                  <label key={m.id} className="flex items-center gap-2 p-1 hover:bg-muted/50 rounded cursor-pointer text-xs font-medium">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        if (isChecked) {
                                          field.onChange(selected.filter((id) => id !== m.id));
                                        } else {
                                          field.onChange([...selected, m.id]);
                                        }
                                      }}
                                      className="rounded border-border text-primary size-4"
                                    />
                                    <span>{m.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          );
                        }}
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1">
                    <RiShieldKeyholeLine className="size-4 text-muted-foreground" />
                    Permissions
                  </Label>
                  <div className="border rounded-lg p-3 h-[180px] overflow-y-auto bg-muted/20 space-y-2">
                    {permissions.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No permissions found</p>
                    ) : (
                      <Controller
                        name="permissionIds"
                        control={control}
                        render={({ field }) => {
                          const selected = field.value || [];
                          return (
                            <div className="space-y-2">
                              {permissions.map((p) => {
                                const isChecked = selected.includes(p.id);
                                return (
                                  <label key={p.id} className="flex items-center gap-2 p-1 hover:bg-muted/50 rounded cursor-pointer text-xs font-medium">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        if (isChecked) {
                                          field.onChange(selected.filter((id) => id !== p.id));
                                        } else {
                                          field.onChange([...selected, p.id]);
                                        }
                                      }}
                                      className="rounded border-border text-primary size-4"
                                    />
                                    <span>{p.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          );
                        }}
                      />
                    )}
                  </div>
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
                  {submitting ? "Saving..." : "Create Role"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}
