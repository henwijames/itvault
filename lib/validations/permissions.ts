import {z} from "zod";

export const createPermissionSchema = z.object({
    name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
    key: z.string().min(1, "Key is required").max(100, "Key must be less than 100 characters"),
    description: z.string().optional().nullable(),
})

export const updatePermissionSchema = z.object({
    name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters").optional(),
    key: z.string().min(1, "Key is required").max(100, "Key must be less than 100 characters").optional(),
    description: z.string().optional().nullable(),
})

export type CreatePermissionInput = z.infer<typeof createPermissionSchema>;
export type UpdatePermissionInput = z.infer<typeof updatePermissionSchema>;