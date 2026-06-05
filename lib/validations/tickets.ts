import { z } from "zod";

export const createTicketSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  staffId: z.string().nullable().or(z.literal("")).optional(),
  categoryId: z.string().nullable().or(z.literal("")).optional(),
  assignedToId: z.string().nullable().or(z.literal("")).optional(),
  title: z.string().trim().min(1, "Title is required").max(150, "Title is too long"),
  description: z.string().trim().min(1, "Description is required"),
  status: z.enum(["OPEN", "IN_PROGRESS", "PENDING", "RESOLVED", "CLOSED", "CANCELLED"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  responseDueAt: z.string().nullable().or(z.literal("")).optional(),
});

export const updateTicketSchema = z.object({
  branchId: z.string().min(1, "Branch is required").optional(),
  staffId: z.string().nullable().or(z.literal("")).optional(),
  categoryId: z.string().nullable().or(z.literal("")).optional(),
  assignedToId: z.string().nullable().or(z.literal("")).optional(),
  title: z.string().trim().min(1, "Title cannot be empty").max(150, "Title is too long").optional(),
  description: z.string().trim().min(1, "Description cannot be empty").optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "PENDING", "RESOLVED", "CLOSED", "CANCELLED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  responseDueAt: z.string().nullable().or(z.literal("")).optional(),
});

export const createCommentSchema = z.object({
  comment: z.string().trim().min(1, "Comment content cannot be empty"),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
