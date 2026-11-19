import * as z from "zod/mini"

import {
  PASSWORD_RULES,
  type PasswordRule,
} from "@/components/custom/passwordRules"

// El backend acepta de 12 a 72 bytes UTF-8.
const MAX_PASSWORD_BYTES = 72

// Reglas de esta pantalla: la longitud sube a 12 y las otras cuatro son las del proyecto.
// slice(1) depende de que la regla de longitud sea la primera de PASSWORD_RULES.
export const ACTIVATION_RULES: PasswordRule[] = [
  { label: "Al menos 12 caracteres", test: (value) => value.length >= 12 },
  ...PASSWORD_RULES.slice(1),
]

export const activateSchema = z
  .object({
    password: z.string().check(
      z.minLength(1, "Crea tu contraseña."),
      z.refine(
        (value) =>
          value === "" || ACTIVATION_RULES.every((rule) => rule.test(value)),
        "La contraseña todavía no cumple todos los requisitos."
      ),
      z.refine(
        (value) => new TextEncoder().encode(value).length <= MAX_PASSWORD_BYTES,
        "La contraseña es demasiado larga. Usa menos caracteres o evita tildes y símbolos especiales."
      )
    ),
    confirmPassword: z
      .string()
      .check(z.minLength(1, "Confirma tu contraseña.")),
  })
  .check(
    z.refine(
      (values) =>
        !values.confirmPassword || values.confirmPassword === values.password,
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

export type ActivateFormValues = z.infer<typeof activateSchema>
