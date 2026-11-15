import * as z from "zod/mini"

import { isPasswordValid } from "@/components/custom/passwordRules"

// Reglas de «Cambiar contraseña»: la actual (la valida el backend), la nueva con las
// reglas del proyecto (las mismas del login) y su confirmación.
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .check(z.minLength(1, "Ingresa tu contraseña actual.")),
    newPassword: z.string().check(
      z.minLength(1, "Ingresa la nueva contraseña."),
      z.refine(
        (value) => value === "" || isPasswordValid(value),
        "Usa al menos 8 caracteres con mayúsculas, minúsculas, números y símbolos."
      )
    ),
    confirmPassword: z
      .string()
      .check(z.minLength(1, "Confirma la nueva contraseña.")),
  })
  .check(
    // La nueva no puede ser igual a la actual.
    z.refine(
      (values) =>
        !values.newPassword || values.newPassword !== values.currentPassword,
      {
        path: ["newPassword"],
        message: "La nueva contraseña debe ser distinta de la actual.",
        when: (payload) =>
          !payload.issues.some((issue) => issue.path?.[0] === "newPassword"),
      }
    ),
    // La confirmación debe coincidir con la nueva.
    z.refine(
      (values) =>
        !values.confirmPassword ||
        values.confirmPassword === values.newPassword,
      {
        path: ["confirmPassword"],
        message: "Las contraseñas no coinciden.",
        when: (payload) =>
          !payload.issues.some(
            (issue) => issue.path?.[0] === "confirmPassword"
          ),
      }
    )
  )

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>
