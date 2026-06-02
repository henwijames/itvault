import { z } from "zod";

export const createModuleSchema = z.object({
  name: z.string().min(1, "Module name is required").max(100, "Module name is too long"),
  code: z.string().min(1, "Module code is required").max(100, "Module code is too long"),
  description: z.string().max(500, "Description is too long").nullable().optional(),
  permissionIds: z.array(z.string()).optional(),
});

export const updateModuleSchema = z.object({
  name: z.string().min(1, "Module name cannot be empty").max(100, "Module name is too long").optional(),
  code: z.string().min(1, "Module code cannot be empty").max(100, "Module code is too long").optional(),
  description: z.string().max(500, "Description is too long").nullable().optional(),
  permissionIds: z.array(z.string()).optional(),
});

export type CreateModuleInput = z.infer<typeof createModuleSchema>;
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;
