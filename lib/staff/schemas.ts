import { z } from "zod";

import { checkSafeText } from "@/lib/validation/lead-fields";

export const staffLoginSchema = z.object({
  store: z.string().trim().min(1).max(80),
  pin: z.string().trim().min(1).max(12).regex(/^\d+$/, "PIN must be digits only."),
  staffName: z
    .string()
    .trim()
    .superRefine((value, context) => {
      const message = checkSafeText(value, "Your name", 40);
      if (message) context.addIssue({ code: "custom", message });
    }),
});

export const storeVisitSchema = z.object({
  code: z.string().trim().min(1).max(40),
  action: z.enum(["visited", "purchased"]),
  invoiceNumber: z
    .string()
    .trim()
    .max(40)
    .regex(/^[A-Za-z0-9 /_.-]*$/, "Invoice number can use letters, numbers, / - _ and .")
    .optional(),
  /** Rupees, kept to the paisa. */
  billAmount: z
    .number()
    .positive()
    .max(100_000_000)
    .transform((value) => Math.round(value * 100) / 100)
    .optional(),
});
