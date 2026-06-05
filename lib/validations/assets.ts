import { z } from "zod";

export const createAssetSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  assetTag: z.string().trim().max(100, "Asset tag is too long").nullable().or(z.literal("")).optional(),
  name: z.string().trim().min(1, "Asset name is required").max(100, "Asset name is too long"),
  category: z.string().trim().min(1, "Category is required").max(100, "Category is too long"),
  brand: z.string().trim().max(100, "Brand is too long").nullable().or(z.literal("")).optional(),
  model: z.string().trim().max(100, "Model is too long").nullable().or(z.literal("")).optional(),
  serialNumber: z.string().trim().max(100, "Serial number is too long").nullable().or(z.literal("")).optional(),
  purchaseDate: z.string().nullable().or(z.literal("")).optional(),
  warrantyExpiry: z.string().nullable().or(z.literal("")).optional(),
  status: z.enum(["ACTIVE", "RETIRED", "LOST", "REPAIR"]),
  quantity: z.number().int().min(1, "Quantity must be at least 1").or(
    z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(1, "Quantity must be at least 1"))
  ),
  notes: z.string().trim().nullable().or(z.literal("")).optional(),
});

export const updateAssetSchema = z.object({
  branchId: z.string().min(1, "Branch is required").optional(),
  assetTag: z.string().trim().max(100, "Asset tag is too long").nullable().or(z.literal("")).optional(),
  name: z.string().trim().min(1, "Asset name cannot be empty").max(100, "Asset name is too long").optional(),
  category: z.string().trim().min(1, "Category cannot be empty").max(100, "Category is too long").optional(),
  brand: z.string().trim().max(100, "Brand is too long").nullable().or(z.literal("")).optional(),
  model: z.string().trim().max(100, "Model is too long").nullable().or(z.literal("")).optional(),
  serialNumber: z.string().trim().max(100, "Serial number is too long").nullable().or(z.literal("")).optional(),
  purchaseDate: z.string().nullable().or(z.literal("")).optional(),
  warrantyExpiry: z.string().nullable().or(z.literal("")).optional(),
  status: z.enum(["ACTIVE", "RETIRED", "LOST", "REPAIR"]).optional(),
  quantity: z.number().int().min(1, "Quantity must be at least 1").or(
    z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(1, "Quantity must be at least 1"))
  ).optional(),
  notes: z.string().trim().nullable().or(z.literal("")).optional(),
});

export const borrowAssetSchema = z.object({
  assetId: z.string().min(1, "Asset is required"),
  staffId: z.string().nullable().or(z.literal("")).optional(),
  borrowingBranchId: z.string().nullable().or(z.literal("")).optional(),
  quantity: z.number().int().min(1, "Quantity must be at least 1").or(
    z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(1, "Quantity must be at least 1"))
  ),
  notes: z.string().trim().nullable().or(z.literal("")).optional(),
}).refine((data) => {
  const hasStaff = !!data.staffId;
  const hasBranch = !!data.borrowingBranchId;
  return (hasStaff || hasBranch) && !(hasStaff && hasBranch);
}, {
  message: "Either Staff Member or Branch must be selected, but not both",
  path: ["staffId"],
});

export type CreateAssetInput = z.input<typeof createAssetSchema>;
export type UpdateAssetInput = z.input<typeof updateAssetSchema>;
export type BorrowAssetInput = z.input<typeof borrowAssetSchema>;
