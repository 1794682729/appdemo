import { z } from "zod";

export const transactionTypeSchema = z.enum(["expense", "income"]);
export type TransactionType = z.infer<typeof transactionTypeSchema>;

export const categoryTypeSchema = z.enum(["expense", "income", "both"]);
export type CategoryType = z.infer<typeof categoryTypeSchema>;

export const yearMonthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "月份格式应为 YYYY-MM");

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式应为 YYYY-MM-DD");

export const loginSchema = z.object({
  username: z.string().min(2).max(32),
  password: z.string().min(6).max(128),
});

export const setupSchema = loginSchema;

export const categoryCreateSchema = z.object({
  name: z.string().min(1).max(32),
  type: categoryTypeSchema,
  icon: z.string().min(1).max(8).default("📦"),
  sort: z.number().int().optional(),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

export const transactionCreateSchema = z.object({
  type: transactionTypeSchema,
  amountYuan: z.union([z.number().positive(), z.string().min(1)]),
  categoryId: z.string().min(1),
  date: dateSchema,
  note: z.string().max(200).optional().default(""),
});

export const transactionUpdateSchema = transactionCreateSchema.partial();

export const budgetUpsertSchema = z.object({
  totalYuan: z.union([z.number().nonnegative(), z.string(), z.null()]).optional(),
  byCategoryYuan: z
    .record(z.string(), z.union([z.number().nonnegative(), z.string()]))
    .optional()
    .default({}),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(6).max(128),
  newPassword: z.string().min(6).max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>;
export type BudgetUpsertInput = z.infer<typeof budgetUpsertSchema>;
