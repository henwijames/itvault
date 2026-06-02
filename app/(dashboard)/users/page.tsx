"use client";

import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { toast } from "sonner";
import {
  RiUserLine,
  RiAddLine,
  RiSearchLine,
  RiSettingsLine,
  RiEditLine,
  RiDeleteBinLine,
  RiShieldLine,
  RiMore2Fill,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiForbidLine,
} from "@remixicon/react";

import { createUserSchema, updateUserSchema, type CreateUserInput, type UpdateUserInput } from "@/lib/validations/users";
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

interface UserRole {
  id: string;
  name: string;
  description: string | null;
}

interface User {
  id: string;
  name: string;
  email: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  roles: UserRole[];
  createdAt: string;
}

interface AvailableRole {
  id: string;
  name: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form logic for Create User
  const createForm = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema) as any,
    defaultValues: {
      name: "",
      email: "",
      password: "",
      status: "ACTIVE",
      roleIds: [],
    },
  });

  // Form logic for Update User
  const updateForm = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema) as any,
  });

  const activeForm = (editingUser ? updateForm : createForm) as any;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        axios.get("/api/users"),
        axios.get("/api/roles"),
      ]);
      setUsers(usersRes.data);
      setAvailableRoles(rolesRes.data);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (editingUser) {
      updateForm.reset({
        name: editingUser.name,
        email: editingUser.email,
        status: editingUser.status,
        roleIds: editingUser.roles.map((r) => r.id),
        password: "",
      });
    } else {
      createForm.reset({
        name: "",
        email: "",
        password: "",
        status: "ACTIVE",
        roleIds: [],
      });
    }
  }, [editingUser, isDialogOpen]);

  const openCreateDialog = () => {
    setEditingUser(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: any) => {
    setSubmitting(true);
    const toastId = toast.loading(editingUser ? "Updating user..." : "Creating user...");
    try {
      if (editingUser) {
        // If password is not filled in update, remove it
        if (!data.password) {
          delete data.password;
        }
        await axios.patch(`/api/users/${editingUser.id}`, data);
        toast.success("User updated successfully!", { id: toastId });
      } else {
        await axios.post("/api/users", data);
        toast.success("User created successfully!", { id: toastId });
      }
      setIsDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "An error occurred", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Are you sure you want to delete ${user.name}?`)) return;
    const toastId = toast.loading("Deleting user...");
    try {
      await axios.delete(`/api/users/${user.id}`);
      toast.success("User deleted successfully!", { id: toastId });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to delete user", { id: toastId });
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 flex items-center gap-1 font-semibold text-xs py-0.5">
            <RiCheckboxCircleLine className="size-3 text-emerald-600" />
            Active
          </Badge>
        );
      case "SUSPENDED":
        return (
          <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 flex items-center gap-1 font-semibold text-xs py-0.5">
            <RiForbidLine className="size-3 text-amber-600" />
            Suspended
          </Badge>
        );
      case "INACTIVE":
        return (
          <Badge variant="outline" className="text-rose-700 bg-rose-50 border-rose-200 flex items-center gap-1 font-semibold text-xs py-0.5">
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
                    <RiUserLine className="size-4 text-muted-foreground" />
                    Users Administration
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <main className="flex-1 p-6 space-y-6 bg-background/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">System Users</h1>
              <p className="text-sm text-muted-foreground">
                Manage your organization users, statuses, and role privileges.
              </p>
            </div>
            <Button onClick={openCreateDialog} className="sm:self-start">
              <RiAddLine className="mr-1.5 size-4" data-icon="inline-start" />
              Add User
            </Button>
          </div>

          <div className="flex items-center gap-2 max-w-sm">
            <div className="relative flex-1">
              <RiSearchLine className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
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
                  <TableHead className="w-[200px]">Full Name</TableHead>
                  <TableHead>Email Address</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[250px]">Roles</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RiSettingsLine className="size-8 animate-spin text-primary" />
                        <span>Loading organization users...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-semibold text-foreground">
                        {user.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm font-medium">
                        {user.email}
                      </TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.length === 0 ? (
                            <span className="text-xs text-muted-foreground font-medium">None</span>
                          ) : (
                            user.roles.map((r) => (
                              <Badge key={r.id} variant="secondary" className="text-[10px] py-0 px-1.5 flex items-center gap-0.5 border">
                                <RiShieldLine className="size-3 text-muted-foreground" />
                                {r.name}
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
                          <DropdownMenuContent align="end" className="w-[140px]">
                            <DropdownMenuItem onClick={() => openEditDialog(user)} className="cursor-pointer gap-2">
                              <RiEditLine className="size-4 text-muted-foreground" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteUser(user)} className="text-destructive cursor-pointer gap-2 focus:bg-destructive/10 focus:text-destructive">
                              <RiDeleteBinLine className="size-4" />
                              Delete User
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

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-1.5">
                <RiUserLine className="size-5 text-primary" />
                {editingUser ? "Edit User Administration" : "Create New User"}
              </DialogTitle>
              <DialogDescription>
                {editingUser
                  ? "Modify organization privileges and state for this active user account."
                  : "Input user authentication details and assign initial security roles."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={activeForm.handleSubmit(onSubmit)} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-semibold">
                  Full Name
                </Label>
                <Input
                  id="name"
                  placeholder="e.g. John Doe"
                  {...activeForm.register("name")}
                  aria-invalid={!!activeForm.formState.errors.name}
                />
                {activeForm.formState.errors.name && (
                  <p className="text-xs text-destructive font-medium">
                    {activeForm.formState.errors.name.message as string}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-semibold">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g. jdoe@itvault.com"
                  {...activeForm.register("email")}
                  aria-invalid={!!activeForm.formState.errors.email}
                />
                {activeForm.formState.errors.email && (
                  <p className="text-xs text-destructive font-medium">
                    {activeForm.formState.errors.email.message as string}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-semibold">
                  Password {editingUser && <span className="text-xs text-muted-foreground font-normal">(Leave blank to keep current)</span>}
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={editingUser ? "••••••••" : "Require strong password"}
                  {...activeForm.register("password")}
                  aria-invalid={!!activeForm.formState.errors.password}
                />
                {activeForm.formState.errors.password && (
                  <p className="text-xs text-destructive font-medium">
                    {activeForm.formState.errors.password.message as string}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="status" className="text-sm font-semibold">
                    Status
                  </Label>
                  <Controller
                    name="status"
                    control={activeForm.control}
                    render={({ field }) => (
                      <select
                        id="status"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-medium"
                        {...field}
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                        <option value="SUSPENDED">Suspended</option>
                      </select>
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Assign Roles</Label>
                  <div className="border rounded-lg p-2 max-h-[100px] overflow-y-auto bg-muted/20 space-y-1">
                    {availableRoles.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">No roles found</p>
                    ) : (
                      <Controller
                        name="roleIds"
                        control={activeForm.control}
                        render={({ field }) => {
                          const selected = field.value || [];
                          return (
                            <div className="space-y-1">
                              {availableRoles.map((r) => {
                                const isChecked = selected.includes(r.id);
                                return (
                                  <label key={r.id} className="flex items-center gap-1.5 p-0.5 hover:bg-muted/50 rounded cursor-pointer text-xs font-semibold">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        if (isChecked) {
                                          field.onChange(selected.filter((id: string) => id !== r.id));
                                        } else {
                                          field.onChange([...selected, r.id]);
                                        }
                                      }}
                                      className="rounded border-border text-primary size-3.5"
                                    />
                                    <span>{r.name}</span>
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
                  onClick={() => setIsDialogOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : editingUser ? "Save Changes" : "Create User"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}
