import { z } from "zod";

export const createBranchSchema = z.object({
  name: z.string().min(1, "Branch name is required").max(100, "Branch name is too long"),
  code: z.string().max(100, "Branch code is too long").nullable().optional(),
  address: z.string().max(500, "Address is too long").nullable().optional(),
});

export const updateBranchSchema = z.object({
  name: z.string().min(1, "Branch name cannot be empty").max(100, "Branch name is too long").optional(),
  code: z.string().max(100, "Branch code is too long").nullable().optional(),
  address: z.string().max(500, "Address is too long").nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
