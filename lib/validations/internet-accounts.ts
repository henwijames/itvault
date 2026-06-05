import { z } from "zod";

export const createInternetAccountSchema = z.object({
  branchId: z.string().min(1, "Current branch is required"),
  originalBranchId: z.string().nullable().optional(),
  accountHolderId: z.string().nullable().optional(),
  accountType: z.enum(["SHOP", "ACCOMMODATION"]),
  status: z.enum(["NEW", "RENEWED", "FOR_CANCELLATION", "CANCELLED"]).optional().default("NEW"),
  statusNotes: z.string().trim().max(500, "Notes are too long").nullable().or(z.literal("")).optional(),
  providerSource: z.string().trim().max(100, "Provider source is too long").nullable().or(z.literal("")).optional(),
  accountNumber: z.string().trim().min(1, "Account number is required").max(100, "Account number is too long"),
  shipmentNumber: z.string().trim().max(100, "Shipment number is too long").nullable().or(z.literal("")).optional(),
  startDate: z.string().nullable().or(z.literal("")).optional(),
  contractEndDate: z.string().nullable().or(z.literal("")).optional(),
  notes: z.string().trim().nullable().or(z.literal("")).optional(),
});

export const updateInternetAccountSchema = z.object({
  branchId: z.string().min(1, "Current branch is required").optional(),
  originalBranchId: z.string().nullable().optional(),
  accountHolderId: z.string().nullable().optional(),
  accountType: z.enum(["SHOP", "ACCOMMODATION"]).optional(),
  status: z.enum(["NEW", "RENEWED", "FOR_CANCELLATION", "CANCELLED"]).optional(),
  statusNotes: z.string().trim().max(500, "Notes are too long").nullable().or(z.literal("")).optional(),
  providerSource: z.string().trim().max(100, "Provider source is too long").nullable().or(z.literal("")).optional(),
  accountNumber: z.string().trim().min(1, "Account number cannot be empty").max(100, "Account number is too long").optional(),
  shipmentNumber: z.string().trim().max(100, "Shipment number is too long").nullable().or(z.literal("")).optional(),
  startDate: z.string().nullable().or(z.literal("")).optional(),
  contractEndDate: z.string().nullable().or(z.literal("")).optional(),
  notes: z.string().trim().nullable().or(z.literal("")).optional(),
});

export const migrateInternetAccountSchema = z.object({
  toBranchId: z.string().min(1, "Destination branch is required"),
  reason: z.string().trim().max(500, "Reason is too long").nullable().or(z.literal("")).optional(),
});

export type CreateInternetAccountInput = z.infer<typeof createInternetAccountSchema>;
export type UpdateInternetAccountInput = z.infer<typeof updateInternetAccountSchema>;
export type MigrateInternetAccountInput = z.infer<typeof migrateInternetAccountSchema>;
