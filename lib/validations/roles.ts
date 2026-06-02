import { z } from "zod";

export const createRoleSchema = z.object({
  name: z.string().min(1, "Role name is required").max(100, "Role name is too long"),
  description: z.string().max(500, "Description is too long").nullable().optional(),
  permissionIds: z.array(z.string()).optional(),
  moduleIds: z.array(z.string()).optional(),
});

export const updateRoleSchema = z.object({
  name: z.string().min(1, "Role name cannot be empty").max(100, "Role name is too long").optional(),
  description: z.string().max(500, "Description is too long").nullable().optional(),
  permissionIds: z.array(z.string()).optional(),
  moduleIds: z.array(z.string()).optional(),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
