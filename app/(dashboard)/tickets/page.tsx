"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import {
  RiAddLine,
  RiArrowUpDownLine,
  RiCheckLine,
  RiTicketLine,
  RiSettingsLine,
  RiEditLine,
  RiDeleteBinLine,
  RiMore2Fill,
  RiBookOpenLine,
} from "@remixicon/react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import { createTicketSchema, type CreateTicketInput } from "@/lib/validations/tickets";
import { createCategorySchema, type CreateCategoryInput } from "@/lib/validations/categories";
import { useAuth } from "@/components/auth-context";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { type Ticket, getColumns as getTicketColumns } from "./columns";

interface BranchLookup {
  id: string;
  name: string;
  code: string | null;
  status: string;
}

interface StaffLookup {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  branchId: string;
  isActive: boolean;
}

interface CategoryLookup {
  id: string;
  name: string;
  description: string | null;
}

interface UserLookup {
  id: string;
  name: string;
  email: string;
}

interface ApiErrorResponse {
  error: string;
}

export default function TicketsPage() {
  const router = useRouter();
  const { hasPermission, user } = useAuth();
  const [activeTab, setActiveTab] = useState<"tickets" | "categories">("tickets");

  // Core Lists
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [branches, setBranches] = useState<BranchLookup[]>([]);
  const [staff, setStaff] = useState<StaffLookup[]>([]);
  const [categories, setCategories] = useState<CategoryLookup[]>([]);
  const [usersList, setUsersList] = useState<UserLookup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Ticket Modal States
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [isBranchPopoverOpen, setIsBranchPopoverOpen] = useState<boolean>(false);
  const [isStaffPopoverOpen, setIsStaffPopoverOpen] = useState<boolean>(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);

  // Category Modal States
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<CategoryLookup | null>(null);
  const [categorySubmitting, setCategorySubmitting] = useState<boolean>(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryLookup | null>(null);

  // Forms
  const ticketForm = useForm<CreateTicketInput>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      title: "",
      description: "",
      branchId: "",
      staffId: "",
      categoryId: "",
      assignedToId: "",
      status: "OPEN",
      priority: "MEDIUM",
      responseDueAt: "",
    },
  });

  const categoryForm = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const selectedBranchId = ticketForm.watch("branchId");

  const filteredStaff = useMemo(() => {
    if (!selectedBranchId) return [];
    return staff.filter((s) => s.branchId === selectedBranchId && s.isActive);
  }, [selectedBranchId, staff]);

  const fetchData = async (): Promise<void> => {
    setLoading(true);
    try {
      const [ticketsRes, branchesRes, staffRes, categoriesRes] = await Promise.all([
        axios.get<Ticket[]>("/api/tickets"),
        axios.get<BranchLookup[]>("/api/branches"),
        axios.get<StaffLookup[]>("/api/staff"),
        axios.get<CategoryLookup[]>("/api/ticket-categories"),
      ]);

      setTickets(ticketsRes.data);
      setBranches(branchesRes.data.filter((b) => b.status !== "DELETED"));
      setStaff(staffRes.data);
      setCategories(categoriesRes.data);

      try {
        const usersRes = await axios.get<UserLookup[]>("/api/users");
        setUsersList(usersRes.data);
      } catch (uErr) {
        console.warn("Failed to fetch users list (likely due to permissions):", uErr);
        if (user) {
          setUsersList([{ id: user.id, name: user.name, email: user.email }]);
        }
      }
    } catch (err: unknown) {
      console.error(err);
      const axiosError = err as AxiosError<ApiErrorResponse>;
      toast.error(axiosError.response?.data?.error || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Handle Edit/Reset ticket form
  useEffect(() => {
    if (editingTicket && isFormOpen) {
      ticketForm.reset({
        title: editingTicket.title,
        description: editingTicket.description,
        branchId: editingTicket.branchId,
        staffId: editingTicket.staffId || "",
        categoryId: editingTicket.categoryId || "",
        assignedToId: editingTicket.assignedToId || "",
        status: editingTicket.status,
        priority: editingTicket.priority,
        responseDueAt: editingTicket.responseDueAt || "",
      });
    } else if (!isFormOpen) {
      ticketForm.reset({
        title: "",
        description: "",
        branchId: "",
        staffId: "",
        categoryId: "",
        assignedToId: "",
        status: "OPEN",
        priority: "MEDIUM",
        responseDueAt: "",
      });
    }
  }, [editingTicket, isFormOpen, ticketForm]);

  // Handle Edit/Reset category form
  useEffect(() => {
    if (editingCategory && isCategoryFormOpen) {
      categoryForm.reset({
        name: editingCategory.name,
        description: editingCategory.description || "",
      });
    } else if (!isCategoryFormOpen) {
      categoryForm.reset({
        name: "",
        description: "",
      });
    }
  }, [editingCategory, isCategoryFormOpen, categoryForm]);

  // ticket handlers
  const openCreateDialog = (): void => {
    setEditingTicket(null);
    setIsFormOpen(true);
  };

  const openEditDialog = (t: Ticket): void => {
    setEditingTicket(t);
    setIsFormOpen(true);
  };

  const openViewDetails = (t: Ticket): void => {
    router.push(`/tickets/${t.id}`);
  };

  const confirmDeleteTicket = async (): Promise<void> => {
    if (!ticketToDelete) return;
    const ticket = ticketToDelete;
    setTicketToDelete(null);
    const toastId = toast.loading(`Deleting ticket ${ticket.ticketNumber}...`);
    try {
      await axios.delete(`/api/tickets/${ticket.id}`);
      toast.success("Ticket deleted successfully!", { id: toastId });
      fetchData();
    } catch (err: unknown) {
      const axiosError = err as AxiosError<ApiErrorResponse>;
      toast.error(axiosError.response?.data?.error || "Failed to delete ticket", { id: toastId });
    }
  };

  const onSubmitTicket = async (data: CreateTicketInput): Promise<void> => {
    setSubmitting(true);
    const toastId = toast.loading(editingTicket ? "Updating ticket..." : "Creating ticket...");

    const payload = {
      ...data,
      staffId: data.staffId || null,
      categoryId: data.categoryId || null,
      assignedToId: data.assignedToId || null,
      responseDueAt: data.responseDueAt || null,
    };

    try {
      if (editingTicket) {
        await axios.patch(`/api/tickets/${editingTicket.id}`, payload);
        toast.success("Ticket updated successfully!", { id: toastId });
      } else {
        await axios.post("/api/tickets", payload);
        toast.success("Ticket created successfully!", { id: toastId });
      }
      setIsFormOpen(false);
      fetchData();
    } catch (err: unknown) {
      const axiosError = err as AxiosError<ApiErrorResponse>;
      toast.error(
        axiosError.response?.data?.error || "An error occurred while saving the ticket",
        { id: toastId }
      );
    } finally {
      setSubmitting(false);
    }
  };

  // category handlers
  const openCreateCategoryDialog = (): void => {
    setEditingCategory(null);
    setIsCategoryFormOpen(true);
  };

  const openEditCategoryDialog = (cat: CategoryLookup): void => {
    setEditingCategory(cat);
    setIsCategoryFormOpen(true);
  };

  const confirmDeleteCategory = async (): Promise<void> => {
    if (!categoryToDelete) return;
    const cat = categoryToDelete;
    setCategoryToDelete(null);
    const toastId = toast.loading(`Deleting category ${cat.name}...`);
    try {
      await axios.delete(`/api/ticket-categories/${cat.id}`);
      toast.success("Category deleted successfully!", { id: toastId });
      fetchData();
    } catch (err: unknown) {
      const axiosError = err as AxiosError<ApiErrorResponse>;
      toast.error(axiosError.response?.data?.error || "Failed to delete category", { id: toastId });
    }
  };

  const onSubmitCategory = async (data: CreateCategoryInput): Promise<void> => {
    setCategorySubmitting(true);
    const toastId = toast.loading(editingCategory ? "Updating category..." : "Creating category...");
    const payload = {
      ...data,
      description: data.description || null,
    };

    try {
      if (editingCategory) {
        await axios.patch(`/api/ticket-categories/${editingCategory.id}`, payload);
        toast.success("Category updated successfully!", { id: toastId });
      } else {
        await axios.post("/api/ticket-categories", payload);
        toast.success("Category created successfully!", { id: toastId });
      }
      setIsCategoryFormOpen(false);
      fetchData();
    } catch (err: unknown) {
      const axiosError = err as AxiosError<ApiErrorResponse>;
      toast.error(
        axiosError.response?.data?.error || "An error occurred while saving category",
        { id: toastId }
      );
    } finally {
      setCategorySubmitting(false);
    }
  };

  const ticketColumns = useMemo(
    () =>
      getTicketColumns({
        hasPermission,
        onViewDetails: openViewDetails,
        onEdit: openEditDialog,
        onDelete: setTicketToDelete,
      }),
    [hasPermission]
  );

  const categoryColumns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Category Name",
        cell: ({ row }: any) => <span className="font-semibold text-foreground">{row.original.name}</span>,
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }: any) => (
          <span className="text-muted-foreground text-sm font-medium">
            {row.original.description || <span className="italic text-xs text-muted-foreground/60">No description</span>}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="text-right block">Actions</span>,
        cell: ({ row }: any) => {
          const cat = row.original;
          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="size-8 p-0">
                    <span className="sr-only">Open Menu</span>
                    <RiMore2Fill className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[140px]">
                  {hasPermission("tickets", "edit") && (
                    <DropdownMenuItem onClick={() => openEditCategoryDialog(cat)} className="cursor-pointer gap-2">
                      <RiEditLine className="size-4 text-muted-foreground" />
                      Edit Details
                    </DropdownMenuItem>
                  )}
                  {hasPermission("tickets", "delete") && (
                    <DropdownMenuItem
                      onClick={() => setCategoryToDelete(cat)}
                      className="text-destructive cursor-pointer gap-2 focus:bg-destructive/10 focus:text-destructive"
                    >
                      <RiDeleteBinLine className="size-4" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
        size: 80,
      },
    ],
    [hasPermission]
  );

  if (!hasPermission("tickets", "view")) {
    return (
      <main className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center flex flex-col gap-2">
          <h1 className="text-xl font-bold text-destructive">Access Denied</h1>
          <p className="text-sm text-muted-foreground">
            You do not have permission to view tickets.
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
            <h1 className="text-2xl font-bold tracking-tight">IT Support Desk</h1>
            <p className="text-sm text-muted-foreground">
              Manage IT support tickets, priorities, response targets, and classifications.
            </p>
          </div>
        </div>

        {/* Tab switch control */}
        <div className="flex border-b border-muted">
          <button
            onClick={() => setActiveTab("tickets")}
            className={cn(
              "px-5 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5",
              activeTab === "tickets"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <RiTicketLine className="size-4" />
            All Tickets
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={cn(
              "px-5 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5",
              activeTab === "categories"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <RiBookOpenLine className="size-4" />
            Categories
          </button>
        </div>

        {activeTab === "tickets" ? (
          <DataTable
            columns={ticketColumns}
            data={tickets}
            searchKey="title"
            searchPlaceholder="Search tickets by subject..."
            isLoading={loading}
            emptyMessage="No tickets registered."
            headerAction={
              hasPermission("tickets", "create") ? (
                <Button onClick={openCreateDialog}>
                  <RiAddLine className="size-4" data-icon="inline-start" />
                  Create Ticket
                </Button>
              ) : undefined
            }
          />
        ) : (
          <DataTable
            columns={categoryColumns}
            data={categories}
            searchKey="name"
            searchPlaceholder="Search categories..."
            isLoading={loading}
            emptyMessage="No ticket categories registered."
            headerAction={
              hasPermission("tickets", "create") ? (
                <Button onClick={openCreateCategoryDialog}>
                  <RiAddLine className="size-4" data-icon="inline-start" />
                  Add Category
                </Button>
              ) : undefined
            }
          />
        )}
      </main>

      {/* Ticket Create / Edit Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <RiTicketLine className="size-5 text-primary" />
              {editingTicket ? "Edit Ticket Details" : "Create Support Ticket"}
            </DialogTitle>
            <DialogDescription>
              Submit an IT support ticket, specify priority levels, assignee, and customer.
            </DialogDescription>
          </DialogHeader>

          <form id="ticket-form" onSubmit={ticketForm.handleSubmit(onSubmitTicket)} className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title" className="text-sm font-semibold">Subject / Title</Label>
              <Input id="title" placeholder="e.g. Printer offline in second floor office" {...ticketForm.register("title")} aria-invalid={!!ticketForm.formState.errors.title} />
              {ticketForm.formState.errors.title && <p className="text-xs text-destructive font-medium">{ticketForm.formState.errors.title.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
              <Textarea id="description" placeholder="Provide full details of the issue or request..." {...ticketForm.register("description")} aria-invalid={!!ticketForm.formState.errors.description} rows={4} />
              {ticketForm.formState.errors.description && <p className="text-xs text-destructive font-medium">{ticketForm.formState.errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="branchId" className="text-sm font-semibold">Branch Location</Label>
                <Controller
                  name="branchId"
                  control={ticketForm.control}
                  render={({ field }) => {
                    const selectedBranch = branches.find((b) => b.id === field.value);
                    return (
                      <Popover open={isBranchPopoverOpen} onOpenChange={setIsBranchPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full h-10 justify-between text-left font-medium text-sm rounded-md border border-input bg-background px-3 hover:bg-background/80"
                          >
                            {selectedBranch ? (
                              <span>
                                {selectedBranch.name} {selectedBranch.code ? `(${selectedBranch.code})` : ""}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Select branch...</span>
                            )}
                            <RiArrowUpDownLine className="ml-2 size-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search branch..." />
                            <CommandList>
                              <CommandEmpty>No branch found.</CommandEmpty>
                              <CommandGroup>
                                {branches.map((b) => (
                                  <CommandItem
                                    key={b.id}
                                    value={b.name + (b.code ? ` ${b.code}` : "")}
                                    onSelect={() => {
                                      field.onChange(b.id);
                                      setIsBranchPopoverOpen(false);
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span>
                                        {b.name} {b.code ? `(${b.code})` : ""}
                                      </span>
                                      <RiCheckLine
                                        className={cn(
                                          "size-4 opacity-0",
                                          field.value === b.id && "opacity-100"
                                        )}
                                      />
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    );
                  }}
                />
                {ticketForm.formState.errors.branchId && <p className="text-xs text-destructive font-medium">{ticketForm.formState.errors.branchId.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="staffId" className="text-sm font-semibold">For Staff / User (Optional)</Label>
                <Controller
                  name="staffId"
                  control={ticketForm.control}
                  render={({ field }) => {
                    const selectedStaff = staff.find((s) => s.id === field.value);
                    return (
                      <Popover open={isStaffPopoverOpen} onOpenChange={setIsStaffPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            disabled={!selectedBranchId}
                            className="w-full h-10 justify-between text-left font-medium text-sm rounded-md border border-input bg-background px-3 hover:bg-background/80"
                          >
                            {selectedStaff ? (
                              <span>
                                {selectedStaff.firstName} {selectedStaff.lastName}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                {selectedBranchId ? "Select staff..." : "Select branch first"}
                              </span>
                            )}
                            <RiArrowUpDownLine className="ml-2 size-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search staff..." />
                            <CommandList>
                              <CommandEmpty>No staff found.</CommandEmpty>
                              <CommandGroup>
                                {filteredStaff.map((s) => (
                                  <CommandItem
                                    key={s.id}
                                    value={s.firstName + " " + s.lastName}
                                    onSelect={() => {
                                      field.onChange(s.id);
                                      setIsStaffPopoverOpen(false);
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span>
                                        {s.firstName} {s.lastName}
                                      </span>
                                      <RiCheckLine
                                        className={cn(
                                          "size-4 opacity-0",
                                          field.value === s.id && "opacity-100"
                                        )}
                                      />
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    );
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="categoryId" className="text-sm font-semibold">Category (Optional)</Label>
                <Controller
                  name="categoryId"
                  control={ticketForm.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <SelectTrigger className="w-full h-10 border border-input bg-background font-medium text-sm rounded-md px-3">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="assignedToId" className="text-sm font-semibold">Assignee (Optional)</Label>
                <Controller
                  name="assignedToId"
                  control={ticketForm.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <SelectTrigger className="w-full h-10 border border-input bg-background font-medium text-sm rounded-md px-3">
                        <SelectValue placeholder="Assign To..." />
                      </SelectTrigger>
                      <SelectContent>
                        {usersList.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="priority" className="text-sm font-semibold">Priority</Label>
                <Controller
                  name="priority"
                  control={ticketForm.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="w-full h-10 border border-input bg-background font-medium text-sm rounded-md px-3">
                        <SelectValue placeholder="Select Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="status" className="text-sm font-semibold">Status</Label>
                <Controller
                  name="status"
                  control={ticketForm.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="w-full h-10 border border-input bg-background font-medium text-sm rounded-md px-3">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPEN">Open</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                        <SelectItem value="CLOSED">Closed</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="responseDueAt" className="text-sm font-semibold">Due Date (Optional)</Label>
                <Input id="responseDueAt" type="date" {...ticketForm.register("responseDueAt")} />
              </div>
            </div>
          </form>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={submitting}>Cancel</Button>
            <Button form="ticket-form" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : editingTicket ? "Save Changes" : "Create Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Create / Edit Form Dialog */}
      <Dialog open={isCategoryFormOpen} onOpenChange={setIsCategoryFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <RiSettingsLine className="size-5 text-primary animate-spin-slow" />
              {editingCategory ? "Edit Category Details" : "Add Ticket Category"}
            </DialogTitle>
            <DialogDescription>
              Create or modify classifications for support request tickets.
            </DialogDescription>
          </DialogHeader>

          <form id="category-form" onSubmit={categoryForm.handleSubmit(onSubmitCategory)} className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name" className="text-sm font-semibold">Category Name</Label>
              <Input id="name" placeholder="e.g. ERP Access Rights" {...categoryForm.register("name")} aria-invalid={!!categoryForm.formState.errors.name} />
              {categoryForm.formState.errors.name && <p className="text-xs text-destructive font-medium">{categoryForm.formState.errors.name.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description" className="text-sm font-semibold">Description (Optional)</Label>
              <Textarea id="description" placeholder="Specify what kind of issues map to this category..." {...categoryForm.register("description")} aria-invalid={!!categoryForm.formState.errors.description} rows={3} />
              {categoryForm.formState.errors.description && <p className="text-xs text-destructive font-medium">{categoryForm.formState.errors.description.message}</p>}
            </div>
          </form>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setIsCategoryFormOpen(false)} disabled={categorySubmitting}>Cancel</Button>
            <Button form="category-form" type="submit" disabled={categorySubmitting}>
              {categorySubmitting ? "Saving..." : editingCategory ? "Save Changes" : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticket Delete Confirmation Alert */}
      <AlertDialog open={!!ticketToDelete} onOpenChange={(open) => !open && setTicketToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete ticket <strong>{ticketToDelete?.ticketNumber}</strong> and all associated logs and comments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTicket} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Category Delete Confirmation Alert */}
      <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the ticket category <strong>{categoryToDelete?.name}</strong>. Existing tickets pointing to this category will be safely set to unassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCategory} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
