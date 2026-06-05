import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(100, "Category name is too long"),
  description: z.string().trim().max(500, "Description is too long").nullable().or(z.literal("")).optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name cannot be empty").max(100, "Category name is too long").optional(),
  description: z.string().trim().max(500, "Description is too long").nullable().or(z.literal("")).optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
