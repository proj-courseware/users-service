import { z } from "zod";

export const globalRoleSchema = z.enum(["student", "teacher", "admin"]);

export type GlobalRole = z.infer<typeof globalRoleSchema>;

export const noteRoleSchema = z.enum(["owner", "viewer"]);

export type NoteRole = z.infer<typeof noteRoleSchema>;
