import { z } from "zod";

export const globalRoleSchema = z.enum(["student", "teacher", "admin"]);

export type GlobalRole = z.infer<typeof globalRoleSchema>;
