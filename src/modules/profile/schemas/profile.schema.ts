import * as z from "zod/mini"

// "+" inicial opcional y de 7 a 15 dígitos, que pueden ir separados por espacios.
const PHONE_PATTERN = /^\+?\d(?: ?\d){6,14}$/

export const profileSchema = z.object({
  phone: z
    .string()
    .check(
      z.trim(),
      z.minLength(1, "Ingresa el celular de emergencias."),
      z.regex(
        PHONE_PATTERN,
        "Formato no válido. Usa solo números, espacios y un + inicial, por ejemplo +57 300 000 0000."
      )
    ),
  residenceZone: z
    .string()
    .check(z.trim(), z.minLength(1, "Ingresa la zona de residencia.")),
  // Interruptores de F3: solo los registra el formulario del tripulante.
  urgentReplacement: z.optional(z.boolean()),
  gateChanges: z.optional(z.boolean()),
  certificationExpiry: z.optional(z.boolean()),
})

export type ProfileFormValues = z.infer<typeof profileSchema>
