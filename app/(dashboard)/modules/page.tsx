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
  RiEditLine,
  RiMore2Fill,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
} from "@remixicon/react";

import { createModuleSchema, type CreateModuleInput } from "@/lib/validations/modules";
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


interface Module {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: "ACTIVE" | "INACTIVE";
  rolesCount: number;
  createdAt: string;
}



export default function ModulesPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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
    defaultValues: {
      status: "ACTIVE",
    },
  });

  const fetchModules = async () => {
    setLoading(true);
    try {
      const modulesRes = await axios.get("/api/modules");
      setModules(modulesRes.data);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to load modules data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  useEffect(() => {
    if (editingModule) {
      reset({
        name: editingModule.name,
        code: editingModule.code,
        description: editingModule.description || "",
        status: editingModule.status || "ACTIVE",
      });
    } else {
      reset({
        name: "",
        code: "",
        description: "",
        status: "ACTIVE",
      });
    }
  }, [editingModule, isCreateOpen]);

  const openCreateDialog = () => {
    setEditingModule(null);
    setIsCreateOpen(true);
  };

  const openEditDialog = (mod: Module) => {
    setEditingModule(mod);
    setIsCreateOpen(true);
  };

  const handleDeleteModule = (mod: Module) => {
    setModuleToDelete(mod);
  };

  const confirmDeleteModule = async () => {
    if (!moduleToDelete) return;
    const mod = moduleToDelete;
    setModuleToDelete(null);
    const toastId = toast.loading("Deleting module...");
    try {
      await axios.delete(`/api/modules/${mod.id}`);
      toast.success("Module deleted successfully!", { id: toastId });
      fetchModules();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to delete module", { id: toastId });
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
      reset({
        name: "",
        code: "",
        description: "",
        status: "ACTIVE",
      });
      fetchModules();
    } catch (err: any) {
      toast.error(err.response?.data?.error || (editingModule ? "Failed to update module" : "Failed to create module"), { id: toastId });
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
            <Button onClick={openCreateDialog} className="sm:self-start">
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
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RiSettingsLine className="size-8 animate-spin text-primary" />
                        <span>Loading modules...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredModules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
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
                        {getStatusBadge(mod.status)}
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
                            <DropdownMenuItem onClick={() => openEditDialog(mod)} className="cursor-pointer gap-2">
                              <RiEditLine className="size-4 text-muted-foreground" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteModule(mod)} className="text-destructive cursor-pointer gap-2 focus:bg-destructive/10 focus:text-destructive">
                              <RiDeleteBinLine className="size-4" />
                              Delete Module
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
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-1.5">
                <RiCpuLine className="size-5 text-primary" />
                {editingModule ? "Edit Module" : "Create New Module"}
              </DialogTitle>
              <DialogDescription>
                {editingModule
                  ? "Update capability block details."
                  : "Define a capability block of the IT Vault system."}
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

              {editingModule && (
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
                  {submitting ? "Saving..." : editingModule ? "Save Changes" : "Create Module"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!moduleToDelete} onOpenChange={(open) => !open && setModuleToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the module{" "}
                <strong>{moduleToDelete?.name}</strong> and remove all its role bindings.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteModule}
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
