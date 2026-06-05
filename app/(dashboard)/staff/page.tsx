"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import {
  RiUserStarLine,
  RiAddLine,
} from "@remixicon/react";

import { createStaffSchema, type CreateStaffInput } from "@/lib/validations/staff";
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

import { type Staff, getColumns } from "./columns";

interface BranchLookup {
  id: string;
  name: string;
  code: string | null;
  status: string;
}

interface UserLookup {
  id: string;
  name: string;
  email: string;
  staff: { id: string } | null;
}

interface ApiErrorResponse {
  error: string;
}

interface StaffFormValues {
  firstName: string;
  lastName: string;
  branchId: string;
  userId?: string | null;
  email?: string | null;
  mobileNumber?: string | null;
  contactNumber?: string | null;
  dateOfBirth?: string | null;
  emiratesIdNumber?: string | null;
  emiratesIdExpiry?: string | null;
  position?: string | null;
  isActive?: boolean;
}

export default function StaffPage() {
  const { hasPermission } = useAuth();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [branches, setBranches] = useState<BranchLookup[]>([]);
  const [users, setUsers] = useState<UserLookup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<StaffFormValues>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      branchId: "",
      userId: "",
      email: "",
      mobileNumber: "",
      contactNumber: "",
      dateOfBirth: "",
      emiratesIdNumber: "",
      emiratesIdExpiry: "",
      position: "",
      isActive: true,
    },
  });

  const fetchData = async (): Promise<void> => {
    setLoading(true);
    try {
      const [staffRes, branchesRes, usersRes] = await Promise.all([
        axios.get<Staff[]>("/api/staff"),
        axios.get<BranchLookup[]>("/api/branches"),
        hasPermission("users", "view") ? axios.get<UserLookup[]>("/api/users") : Promise.resolve({ data: [] }),
      ]);
      setStaffList(staffRes.data);
      // Filter out deleted branches
      setBranches(branchesRes.data.filter((b) => b.status !== "DELETED"));
      setUsers(usersRes.data);
    } catch (err: unknown) {
      console.error(err);
      const axiosError = err as AxiosError<ApiErrorResponse>;
      toast.error(axiosError.response?.data?.error || "Failed to load staff data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (editingStaff) {
      reset({
        firstName: editingStaff.firstName,
        lastName: editingStaff.lastName,
        branchId: editingStaff.branchId,
        userId: editingStaff.userId || "",
        email: editingStaff.email || "",
        mobileNumber: editingStaff.mobileNumber || "",
        contactNumber: editingStaff.contactNumber || "",
        dateOfBirth: editingStaff.dateOfBirth || "",
        emiratesIdNumber: editingStaff.emiratesIdNumber || "",
        emiratesIdExpiry: editingStaff.emiratesIdExpiry || "",
        position: editingStaff.position || "",
        isActive: editingStaff.isActive,
      });
    } else {
      reset({
        firstName: "",
        lastName: "",
        branchId: "",
        userId: "",
        email: "",
        mobileNumber: "",
        contactNumber: "",
        dateOfBirth: "",
        emiratesIdNumber: "",
        emiratesIdExpiry: "",
        position: "",
        isActive: true,
      });
    }
  }, [editingStaff, isCreateOpen, reset]);

  const openCreateDialog = (): void => {
    setEditingStaff(null);
    setIsCreateOpen(true);
  };

  const openEditDialog = (staff: Staff): void => {
    setEditingStaff(staff);
    setIsCreateOpen(true);
  };

  const handleDeleteStaff = (staff: Staff): void => {
    setStaffToDelete(staff);
  };

  const confirmDeleteStaff = async (): Promise<void> => {
    if (!staffToDelete) return;
    const staff = staffToDelete;
    setStaffToDelete(null);
    const toastId = toast.loading("Deleting staff member...");
    try {
      await axios.delete(`/api/staff/${staff.id}`);
      toast.success("Staff member deleted successfully!", { id: toastId });
      fetchData();
    } catch (err: unknown) {
      const axiosError = err as AxiosError<ApiErrorResponse>;
      toast.error(axiosError.response?.data?.error || "Failed to delete staff member", { id: toastId });
    }
  };

  const onSubmit = async (data: StaffFormValues): Promise<void> => {
    setSubmitting(true);
    const toastId = toast.loading(editingStaff ? "Updating staff details..." : "Creating staff member...");
    
    // Normalize empty strings to null or undefined
    const payload = {
      ...data,
      userId: data.userId || null,
      email: data.email || null,
      mobileNumber: data.mobileNumber || null,
      contactNumber: data.contactNumber || null,
      dateOfBirth: data.dateOfBirth || null,
      emiratesIdNumber: data.emiratesIdNumber || null,
      emiratesIdExpiry: data.emiratesIdExpiry || null,
      position: data.position || null,
    };

    try {
      if (editingStaff) {
        await axios.patch(`/api/staff/${editingStaff.id}`, payload);
        toast.success("Staff member updated successfully!", { id: toastId });
      } else {
        await axios.post("/api/staff", payload);
        toast.success("Staff member created successfully!", { id: toastId });
      }
      setIsCreateOpen(false);
      fetchData();
    } catch (err: unknown) {
      const axiosError = err as AxiosError<ApiErrorResponse>;
      toast.error(
        axiosError.response?.data?.error ||
          (editingStaff ? "Failed to update staff details" : "Failed to create staff member"),
        { id: toastId }
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Filter login users that are not assigned to other staff members
  // (but keep the currently assigned user visible in the dropdown if editing)
  const availableUsers = useMemo(() => {
    return users.filter((u) => {
      if (editingStaff && editingStaff.userId === u.id) {
        return true;
      }
      return !u.staff;
    });
  }, [users, editingStaff]);

  const columns = useMemo(
    () => getColumns({ hasPermission, onEdit: openEditDialog, onDelete: handleDeleteStaff }),
    [hasPermission]
  );

  if (!hasPermission("staff", "view")) {
    return (
      <main className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center flex flex-col gap-2">
          <h1 className="text-xl font-bold text-destructive">Access Denied</h1>
          <p className="text-sm text-muted-foreground">
            You do not have permission to view this page.
          </p>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="flex-1 p-6 flex flex-col gap-6 bg-background/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Staff Management</h1>
            <p className="text-sm text-muted-foreground">
              Manage employees details, assign to physical branches, and associate with login accounts.
            </p>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={staffList}
          searchKey="name"
          searchPlaceholder="Search staff by name..."
          isLoading={loading}
          emptyMessage="No staff members found."
          headerAction={
            hasPermission("staff", "create") ? (
              <Button onClick={openCreateDialog}>
                <RiAddLine data-icon="inline-start" />
                Add Staff Member
              </Button>
            ) : undefined
          }
        />
      </main>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <RiUserStarLine className="size-5 text-primary" />
              {editingStaff ? "Edit Staff Details" : "Add New Staff Member"}
            </DialogTitle>
            <DialogDescription>
              {editingStaff
                ? "Modify staff member attributes, branch designation, or active status."
                : "Register a new staff member in the system."}
            </DialogDescription>
          </DialogHeader>
          <form id="staff-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="firstName" className="text-sm font-semibold">First Name</Label>
                <Input id="firstName" placeholder="e.g. John" {...register("firstName")} aria-invalid={!!errors.firstName} />
                {errors.firstName && <p className="text-xs text-destructive font-medium">{errors.firstName.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lastName" className="text-sm font-semibold">Last Name</Label>
                <Input id="lastName" placeholder="e.g. Doe" {...register("lastName")} aria-invalid={!!errors.lastName} />
                {errors.lastName && <p className="text-xs text-destructive font-medium">{errors.lastName.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="branchId" className="text-sm font-semibold">Branch Location</Label>
                <Controller
                  name="branchId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="w-full h-10 border border-input bg-background font-medium text-sm rounded-md px-3">
                        <SelectValue placeholder="Select Branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name} {b.code ? `(${b.code})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.branchId && <p className="text-xs text-destructive font-medium">{errors.branchId.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="userId" className="text-sm font-semibold">Login Account (Optional)</Label>
                <Controller
                  name="userId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || "none"}>
                      <SelectTrigger className="w-full h-10 border border-input bg-background font-medium text-sm rounded-md px-3">
                        <SelectValue placeholder="No Associated Login" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No login account</SelectItem>
                        {availableUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name} ({u.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.userId && <p className="text-xs text-destructive font-medium">{errors.userId.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="position" className="text-sm font-semibold">Position/Role (Optional)</Label>
                <Input id="position" placeholder="e.g. System Administrator" {...register("position")} aria-invalid={!!errors.position} />
                {errors.position && <p className="text-xs text-destructive font-medium">{errors.position.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="text-sm font-semibold">Email Address (Optional)</Label>
                <Input id="email" type="email" placeholder="e.g. john.doe@company.com" {...register("email")} aria-invalid={!!errors.email} />
                {errors.email && <p className="text-xs text-destructive font-medium">{errors.email.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mobileNumber" className="text-sm font-semibold">Mobile Number (Optional)</Label>
                <Input id="mobileNumber" placeholder="e.g. +971 50 123 4567" {...register("mobileNumber")} aria-invalid={!!errors.mobileNumber} />
                {errors.mobileNumber && <p className="text-xs text-destructive font-medium">{errors.mobileNumber.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contactNumber" className="text-sm font-semibold">Contact Number (Optional)</Label>
                <Input id="contactNumber" placeholder="e.g. +971 4 123 4567" {...register("contactNumber")} aria-invalid={!!errors.contactNumber} />
                {errors.contactNumber && <p className="text-xs text-destructive font-medium">{errors.contactNumber.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="emiratesIdNumber" className="text-sm font-semibold">Emirates ID (Optional)</Label>
                <Input id="emiratesIdNumber" placeholder="e.g. 784-1990-1234567-1" {...register("emiratesIdNumber")} aria-invalid={!!errors.emiratesIdNumber} />
                {errors.emiratesIdNumber && <p className="text-xs text-destructive font-medium">{errors.emiratesIdNumber.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="emiratesIdExpiry" className="text-sm font-semibold">Emirates ID Expiry (Optional)</Label>
                <Input id="emiratesIdExpiry" type="date" {...register("emiratesIdExpiry")} aria-invalid={!!errors.emiratesIdExpiry} />
                {errors.emiratesIdExpiry && <p className="text-xs text-destructive font-medium">{errors.emiratesIdExpiry.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dateOfBirth" className="text-sm font-semibold">Date of Birth (Optional)</Label>
                <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} aria-invalid={!!errors.dateOfBirth} />
                {errors.dateOfBirth && <p className="text-xs text-destructive font-medium">{errors.dateOfBirth.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="isActive" className="text-sm font-semibold">Status</Label>
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={(val) => field.onChange(val === "true")}
                      value={field.value ? "true" : "false"}
                    >
                      <SelectTrigger className="w-full h-10 border border-input bg-background font-medium text-sm rounded-md px-3">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Active</SelectItem>
                        <SelectItem value="false">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </form>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} disabled={submitting}>Cancel</Button>
            <Button form="staff-form" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : editingStaff ? "Save Changes" : "Create Staff"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!staffToDelete} onOpenChange={(open: boolean) => !open && setStaffToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete staff member <strong>{staffToDelete?.firstName} {staffToDelete?.lastName}</strong>.
              This cannot be undone unless they have active ticket references, in which case deletion is blocked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteStaff} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
