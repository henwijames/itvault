"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { toast } from "sonner";
import {
  RiUserLine,
  RiAddLine,
} from "@remixicon/react";

import { createUserSchema, updateUserSchema, type CreateUserInput, type UpdateUserInput } from "@/lib/validations/users";
import { useAuth } from "@/components/auth-context";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

import { type User, getColumns } from "./columns";

interface AvailableRole {
  id: string;
  name: string;
}

export default function UsersPage() {
  const { hasPermission, refreshUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const createForm = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema) as any,
    defaultValues: { name: "", email: "", password: "", status: "ACTIVE", roleIds: [] },
  });

  const updateForm = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema) as any,
  });

  const activeForm = (editingUser ? updateForm : createForm) as ReturnType<typeof useForm<CreateUserInput>>;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        axios.get("/api/users"),
        (hasPermission("roles", "view") || hasPermission("users", "create") || hasPermission("users", "edit"))
          ? axios.get("/api/roles")
          : Promise.resolve({ data: [] }),
      ]);
      setUsers(usersRes.data);
      setAvailableRoles(rolesRes.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      console.error(err);
      toast.error(error.response?.data?.error || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (editingUser) {
      updateForm.reset({ name: editingUser.name, email: editingUser.email, status: editingUser.status, roleIds: editingUser.roles.map((r) => r.id), password: "" });
    } else {
      createForm.reset({ name: "", email: "", password: "", status: "ACTIVE", roleIds: [] });
    }
  }, [editingUser, isDialogOpen]);

  const openCreateDialog = () => { setEditingUser(null); setIsDialogOpen(true); };
  const openEditDialog = (user: User) => { setEditingUser(user); setIsDialogOpen(true); };
  const handleDeleteUser = (user: User) => { setUserToDelete(user); };

  const onSubmit = async (data: CreateUserInput | UpdateUserInput) => {
    setSubmitting(true);
    const toastId = toast.loading(editingUser ? "Updating user..." : "Creating user...");
    try {
      if (editingUser) {
        const updateData = { ...data };
        if (!(updateData as UpdateUserInput).password) {
          delete (updateData as UpdateUserInput).password;
        }
        await axios.patch(`/api/users/${editingUser.id}`, updateData);
        toast.success("User updated successfully!", { id: toastId });
      } else {
        await axios.post("/api/users", data);
        toast.success("User created successfully!", { id: toastId });
      }
      setIsDialogOpen(false);
      await fetchData();
      await refreshUser();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || "An error occurred", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    const user = userToDelete;
    setUserToDelete(null);
    const toastId = toast.loading("Deleting user...");
    try {
      await axios.delete(`/api/users/${user.id}`);
      toast.success("User deleted successfully!", { id: toastId });
      fetchData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || "Failed to delete user", { id: toastId });
    }
  };

  const columns = useMemo(
    () => getColumns({ hasPermission, onEdit: openEditDialog, onDelete: handleDeleteUser }),
    [hasPermission]
  );

  return (
    <>
      <main className="flex-1 p-6 flex flex-col gap-6 bg-background/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">System Users</h1>
            <p className="text-sm text-muted-foreground">
              Manage your organization users, statuses, and role privileges.
            </p>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={users}
          searchKey="name"
          searchPlaceholder="Search users by name..."
          isLoading={loading}
          emptyMessage="No users found."
          headerAction={
            hasPermission("users", "create") ? (
              <Button onClick={openCreateDialog}>
                <RiAddLine data-icon="inline-start" />
                Add User
              </Button>
            ) : undefined
          }
        />
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

          <form id="user-form" onSubmit={activeForm.handleSubmit(onSubmit)} className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name" className="text-sm font-semibold">Full Name</Label>
              <Input id="name" placeholder="e.g. John Doe" {...activeForm.register("name")} aria-invalid={!!activeForm.formState.errors.name} />
              {activeForm.formState.errors.name && <p className="text-xs text-destructive font-medium">{activeForm.formState.errors.name.message as string}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-sm font-semibold">Email Address</Label>
              <Input id="email" type="email" placeholder="e.g. jdoe@itvault.com" {...activeForm.register("email")} aria-invalid={!!activeForm.formState.errors.email} />
              {activeForm.formState.errors.email && <p className="text-xs text-destructive font-medium">{activeForm.formState.errors.email.message as string}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-sm font-semibold">
                Password {editingUser && <span className="text-xs text-muted-foreground font-normal">(Leave blank to keep current)</span>}
              </Label>
              <Input id="password" type="password" placeholder={editingUser ? "••••••••" : "Require strong password"} {...activeForm.register("password")} aria-invalid={!!activeForm.formState.errors.password} />
              {activeForm.formState.errors.password && <p className="text-xs text-destructive font-medium">{activeForm.formState.errors.password.message as string}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="status" className="text-sm font-semibold">Status</Label>
                <Controller
                  name="status"
                  control={activeForm.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <SelectTrigger className="w-full h-10 border border-input bg-background font-medium text-sm rounded-md px-3">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                        <SelectItem value="SUSPENDED">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-semibold">Assign Roles</Label>
                <div className="border rounded-lg p-2 max-h-[100px] overflow-y-auto bg-muted/20 flex flex-col gap-1">
                  {availableRoles.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">No roles found</p>
                  ) : (
                    <Controller
                      name="roleIds"
                      control={activeForm.control}
                      render={({ field }) => {
                        const selected: string[] = field.value || [];
                        return (
                          <div className="flex flex-col gap-1">
                            {availableRoles.map((r) => {
                              const isChecked = selected.includes(r.id);
                              return (
                                <label key={r.id} className="flex items-center gap-1.5 p-0.5 hover:bg-muted/50 rounded cursor-pointer text-xs font-semibold">
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        field.onChange([...selected, r.id]);
                                      } else {
                                        field.onChange(selected.filter((id: string) => id !== r.id));
                                      }
                                    }}
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
          </form>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={submitting}>Cancel</Button>
              <Button form="user-form" type="submit" disabled={submitting}>
                {submitting ? "Saving..." : editingUser ? "Save Changes" : "Create User"}
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account for <strong>{userToDelete?.name}</strong> and remove their data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteUser} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
