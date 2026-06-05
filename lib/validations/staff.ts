import { z } from "zod";

export const createStaffSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100, "First name is too long"),
  lastName: z.string().trim().min(1, "Last name is required").max(100, "Last name is too long"),
  branchId: z.string().min(1, "Branch is required"),
  userId: z.string().nullable().optional(),
  email: z.string().trim().email("Invalid email address").max(150, "Email is too long").nullable().or(z.literal("")).optional(),
  mobileNumber: z.string().trim().max(50, "Mobile number is too long").nullable().or(z.literal("")).optional(),
  contactNumber: z.string().trim().max(50, "Contact number is too long").nullable().or(z.literal("")).optional(),
  dateOfBirth: z.string().nullable().or(z.literal("")).optional(),
  emiratesIdNumber: z.string().trim().max(50, "Emirates ID is too long").nullable().or(z.literal("")).optional(),
  emiratesIdExpiry: z.string().nullable().or(z.literal("")).optional(),
  position: z.string().trim().max(100, "Position is too long").nullable().or(z.literal("")).optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateStaffSchema = z.object({
  firstName: z.string().trim().min(1, "First name cannot be empty").max(100, "First name is too long").optional(),
  lastName: z.string().trim().min(1, "Last name cannot be empty").max(100, "Last name is too long").optional(),
  branchId: z.string().min(1, "Branch is required").optional(),
  userId: z.string().nullable().optional(),
  email: z.string().trim().email("Invalid email address").max(150, "Email is too long").nullable().or(z.literal("")).optional(),
  mobileNumber: z.string().trim().max(50, "Mobile number is too long").nullable().or(z.literal("")).optional(),
  contactNumber: z.string().trim().max(50, "Contact number is too long").nullable().or(z.literal("")).optional(),
  dateOfBirth: z.string().nullable().or(z.literal("")).optional(),
  emiratesIdNumber: z.string().trim().max(50, "Emirates ID is too long").nullable().or(z.literal("")).optional(),
  emiratesIdExpiry: z.string().nullable().or(z.literal("")).optional(),
  position: z.string().trim().max(100, "Position is too long").nullable().or(z.literal("")).optional(),
  isActive: z.boolean().optional(),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
