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
  // Interruptores de F3 del tripulante: solo los registra su formulario.
  urgentReplacement: z.optional(z.boolean()),
  gateChanges: z.optional(z.boolean()),
  certificationExpiry: z.optional(z.boolean()),
  // Interruptores de F3 del supervisor: solo los registra su formulario.
  newAbsences: z.optional(z.boolean()),
  aiProposalsReady: z.optional(z.boolean()),
  noCandidates: z.optional(z.boolean()),
  confirmationExpired: z.optional(z.boolean()),
})

export type ProfileFormValues = z.infer<typeof profileSchema>
