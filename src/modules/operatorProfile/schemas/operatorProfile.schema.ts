import { isValidPhoneNumber } from "react-phone-number-input/mobile"
import * as z from "zod/mini"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Texto obligatorio: se recortan los espacios antes de validar.
const required = (message: string) =>
  z.string().check(z.trim(), z.minLength(1, message))

// Reglas de «Mi Perfil y Configuración» (super admin). La contraseña va
// aparte, con su propio botón y su propio esquema (changePassword.schema.ts).
export const operatorProfileSchema = z.object({
  fullName: required("Ingresa tu nombre completo."),
  email: z
    .string()
    .check(
      z.trim(),
      z.minLength(1, "Ingresa tu correo corporativo."),
      z.regex(
        EMAIL_PATTERN,
        "Formato no válido. Usa un correo como nombre@aircrew-ops.com."
      )
    ),
  // Celular en formato internacional (E.164), validado con libphonenumber (Google).
  phone: z.string().check(
    z.minLength(1, "Ingresa tu celular."),
    z.refine(
      (value) => value === "" || isValidPhoneNumber(value),
      "Número de celular no válido para el país elegido."
    )
  ),
  residence: required("Selecciona tu residencia principal."),
  // Estado de cada notificación, por su id.
  notifications: z.record(z.string(), z.boolean()),
})

export type OperatorProfileFormValues = z.infer<typeof operatorProfileSchema>
