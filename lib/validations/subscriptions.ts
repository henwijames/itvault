import { z } from "zod";

export const createSubscriptionSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  name: z.string().trim().min(1, "Subscription name is required").max(100, "Subscription name is too long"),
  provider: z.string().trim().max(100, "Provider name is too long").nullable().or(z.literal("")).optional(),
  accountEmail: z.string().trim().email("Invalid email format").max(150, "Email is too long").nullable().or(z.literal("")).optional(),
  accountUsername: z.string().trim().max(100, "Username is too long").nullable().or(z.literal("")).optional(),
  accountPassword: z.string().trim().max(100, "Password is too long").nullable().or(z.literal("")).optional(),
  startDate: z.string().nullable().or(z.literal("")).optional(),
  expiryDate: z.string().nullable().or(z.literal("")).optional(),
  amount: z.string().nullable().or(z.literal("")).optional(),
  status: z.enum(["ACTIVE", "EXPIRED", "CANCELLED"]),
  notes: z.string().trim().nullable().or(z.literal("")).optional(),
});

export const updateSubscriptionSchema = z.object({
  branchId: z.string().min(1, "Branch is required").optional(),
  name: z.string().trim().min(1, "Subscription name cannot be empty").max(100, "Subscription name is too long").optional(),
  provider: z.string().trim().max(100, "Provider name is too long").nullable().or(z.literal("")).optional(),
  accountEmail: z.string().trim().email("Invalid email format").max(150, "Email is too long").nullable().or(z.literal("")).optional(),
  accountUsername: z.string().trim().max(100, "Username is too long").nullable().or(z.literal("")).optional(),
  accountPassword: z.string().trim().max(100, "Password is too long").nullable().or(z.literal("")).optional(),
  startDate: z.string().nullable().or(z.literal("")).optional(),
  expiryDate: z.string().nullable().or(z.literal("")).optional(),
  amount: z.string().nullable().or(z.literal("")).optional(),
  status: z.enum(["ACTIVE", "EXPIRED", "CANCELLED"]).optional(),
  notes: z.string().trim().nullable().or(z.literal("")).optional(),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
