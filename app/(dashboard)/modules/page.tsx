"use client";

import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { toast } from "sonner";
import {
  RiCpuLine,
  RiAddLine,
  RiSearchLine,
  RiSettingsLine,
  RiDeleteBinLine,
  RiShieldKeyholeLine,
} from "@remixicon/react";

import { createModuleSchema, type CreateModuleInput } from "@/lib/validations/modules";
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

interface Module {
  id: string;
  name: string;
  code: string;
  description: string | null;
  rolesCount: number;
  permissions: {
    id: string;
    name: string;
    key: string;
    description: string | null;
  }[];
  createdAt: string;
}

interface SystemPermission {
  id: string;
  name: string;
  key: string;
}

export default function ModulesPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [systemPermissions, setSystemPermissions] = useState<SystemPermission[]>([]);
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
  } = useForm<CreateModuleInput>({
    resolver: zodResolver(createModuleSchema),
    defaultValues: {
      permissionIds: [],
    },
  });

  const fetchModulesAndPermissions = async () => {
    setLoading(true);
    try {
      const [modulesRes, permissionsRes] = await Promise.all([
        axios.get("/api/modules"),
        axios.get("/api/permissions"),
      ]);
      setModules(modulesRes.data);
      setSystemPermissions(permissionsRes.data);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to load modules and permissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModulesAndPermissions();
  }, []);

  const onSubmit = async (data: CreateModuleInput) => {
    setSubmitting(true);
    const toastId = toast.loading("Creating module...");
    try {
      await axios.post("/api/modules", data);
      toast.success("Module created successfully!", { id: toastId });
      setIsCreateOpen(false);
      reset({
        name: "",
        code: "",
        description: "",
        permissionIds: [],
      });
      fetchModulesAndPermissions();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to create module", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredModules = modules.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.code.toLowerCase().includes(search.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(search.toLowerCase()))
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
                    <RiCpuLine className="size-4 text-muted-foreground" />
                    Modules Administration
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <main className="flex-1 p-6 space-y-6 bg-background/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">System Modules</h1>
              <p className="text-sm text-muted-foreground">
                Manage system capability modules, binding them to access keys and user privileges.
              </p>
            </div>
            <Button onClick={() => setIsCreateOpen(true)} className="sm:self-start">
              <RiAddLine className="mr-1.5 size-4" data-icon="inline-start" />
              Add Module
            </Button>
          </div>

          <div className="flex items-center gap-2 max-w-sm">
            <div className="relative flex-1">
              <RiSearchLine className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search modules..."
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
                  <TableHead className="w-[180px]">Module Name</TableHead>
                  <TableHead className="w-[150px]">Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[300px]">Linked Permissions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RiSettingsLine className="size-8 animate-spin text-primary" />
                        <span>Loading modules...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredModules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                      No modules found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredModules.map((mod) => (
                    <TableRow key={mod.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-semibold text-foreground">
                        {mod.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-xs font-semibold px-2 py-0.5 rounded border">
                          {mod.code}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {mod.description || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {mod.permissions.length === 0 ? (
                            <span className="text-xs text-muted-foreground">None</span>
                          ) : (
                            mod.permissions.map((perm) => (
                              <Badge key={perm.id} variant="outline" className="text-[10px] py-0 px-1.5 flex items-center gap-0.5 font-medium">
                                <RiShieldKeyholeLine className="size-3 text-muted-foreground" />
                                {perm.name}
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
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-1.5">
                <RiCpuLine className="size-5 text-primary" />
                Create New Module
              </DialogTitle>
              <DialogDescription>
                Define a capability block of the IT Vault system and map permissions under it.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm font-semibold">
                    Module Name
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g. Asset Registry"
                    {...register("name")}
                    aria-invalid={!!errors.name}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive font-medium">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="code" className="text-sm font-semibold">
                    Code (Unique Identifier)
                  </Label>
                  <Input
                    id="code"
                    placeholder="e.g. assets"
                    {...register("code")}
                    aria-invalid={!!errors.code}
                  />
                  {errors.code && (
                    <p className="text-xs text-destructive font-medium">{errors.code.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-sm font-semibold">
                  Description (Optional)
                </Label>
                <Input
                  id="description"
                  placeholder="Summary of this module's responsibilities"
                  {...register("description")}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  Associate Permissions
                </Label>
                <div className="border rounded-lg p-3 max-h-[160px] overflow-y-auto bg-muted/20 space-y-2">
                  {systemPermissions.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      No permissions available to link. Create one first!
                    </p>
                  ) : (
                    <Controller
                      name="permissionIds"
                      control={control}
                      render={({ field }) => {
                        const selectedValues = field.value || [];
                        return (
                          <div className="grid grid-cols-1 gap-2">
                            {systemPermissions.map((perm) => {
                              const isChecked = selectedValues.includes(perm.id);
                              return (
                                <label
                                  key={perm.id}
                                  className="flex items-center gap-2 p-1.5 hover:bg-muted/50 rounded cursor-pointer transition-colors text-xs font-medium"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      if (isChecked) {
                                        field.onChange(selectedValues.filter((id) => id !== perm.id));
                                      } else {
                                        field.onChange([...selectedValues, perm.id]);
                                      }
                                    }}
                                    className="rounded border-border text-primary focus:ring-primary size-4"
                                  />
                                  <span>
                                    {perm.name} <code className="text-[10px] text-muted-foreground">({perm.key})</code>
                                  </span>
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
                  {submitting ? "Saving..." : "Create Module"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}
