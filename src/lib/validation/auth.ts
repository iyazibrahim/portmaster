import { z } from "zod";
import { validateStrongPassword } from "@/lib/password";

const strongPassword = z.string().superRefine((val, ctx) => {
  const check = validateStrongPassword(val);
  if (!check.ok) {
    ctx.addIssue({ code: "custom", message: check.error });
  }
});

export const loginBodySchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200),
  next: z.string().max(500).optional(),
});

export const signupPasswordSchema = strongPassword;

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(16).max(200),
  newPassword: strongPassword,
  confirmPassword: z.string().min(1).max(200),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(254),
});

export const boardingScanSchema = z.object({
  token: z.string().trim().min(1).max(500),
  lat: z.string().max(32).optional(),
  lng: z.string().max(32).optional(),
  clientEventId: z.string().trim().max(120).optional(),
  expectedAction: z.enum(["CHECK_IN", "CHECK_OUT"]).optional().nullable(),
});

export const boardingPreviewSchema = z.object({
  token: z.string().trim().min(1).max(500),
});
