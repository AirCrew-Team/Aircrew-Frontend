import * as z from "zod/mini"

import { NEW_PASSWORD_RULES } from "@/modules/shared/auth/newPassword.schema"

// El backend acepta de 12 a 72 bytes UTF-8.
const MAX_PASSWORD_BYTES = 72

// Reglas de «Cambiar contraseña»: la actual (la valida el backend), la nueva con las
// reglas de 12 caracteres (las mismas de la activación y el restablecimiento) y su
// confirmación.
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .check(z.minLength(1, "Ingresa tu contraseña actual.")),
    newPassword: z.string().check(
      z.minLength(1, "Ingresa la nueva contraseña."),
      z.refine(
        (value) =>
          value === "" || NEW_PASSWORD_RULES.every((rule) => rule.test(value)),
        "Usa al menos 12 caracteres con mayúsculas, minúsculas, números y símbolos."
      ),
      z.refine(
        (value) => new TextEncoder().encode(value).length <= MAX_PASSWORD_BYTES,
        "La contraseña es demasiado larga. Usa menos caracteres o evita tildes y símbolos especiales."
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
