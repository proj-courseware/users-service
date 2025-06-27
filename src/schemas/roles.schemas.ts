import { z } from "zod";

export const globalRoleSchema = z.enum(["student", "teacher", "admin", "user"]); // TODO: Remove user role

export type GlobalRole = z.infer<typeof globalRoleSchema>;

export const noteRoleSchema = z.enum(["owner", "viewer"]);

export type NoteRole = z.infer<typeof noteRoleSchema>;
