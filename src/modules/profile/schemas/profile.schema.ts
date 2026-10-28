import { z } from "zod"

// "+" inicial opcional y de 7 a 15 dígitos, que pueden ir separados por espacios.
const PHONE_PATTERN = /^\+?\d(?: ?\d){6,14}$/

export const profileSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(1, "Ingresa el celular de emergencias.")
    .regex(
      PHONE_PATTERN,
      "Formato no válido. Usa solo números, espacios y un + inicial, por ejemplo +57 300 000 0000."
    ),
  residenceZone: z.string().trim().min(1, "Ingresa la zona de residencia."),
  // Interruptores de F3: solo los registra el formulario del tripulante.
  urgentReplacement: z.boolean().optional(),
  gateChanges: z.boolean().optional(),
  certificationExpiry: z.boolean().optional(),
})

export type ProfileFormValues = z.infer<typeof profileSchema>
