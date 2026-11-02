import { z } from "zod"

const REASONS = ["incapacidad", "fatiga", "calamidad", "traslado"] as const

// Coincide con el atributo accept del input: .pdf, .png, .jpg y .jpeg.
const ACCEPTED_EXTENSION = /\.(pdf|png|jpe?g)$/i
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024

export const absenceSchema = z
  .object({
    // El select empieza vacío: se valida como texto y luego se estrecha al motivo.
    reason: z
      .string()
      .min(1, "Selecciona el motivo de la ausencia.")
      .pipe(z.enum(REASONS)),
    notes: z
      .string()
      .max(300, "Las observaciones admiten máximo 300 caracteres."),
    // Formato y tamaño van en el campo para validarse al elegir el archivo.
    attachment: z
      .instanceof(File)
      .refine(
        (file) => ACCEPTED_EXTENSION.test(file.name),
        "Formato no admitido. Usa PDF, PNG o JPG."
      )
      .refine(
        (file) => file.size <= MAX_ATTACHMENT_BYTES,
        "El archivo supera el máximo de 10 MB."
      )
      .nullable(),
  })
  .superRefine((values, ctx) => {
    if (values.reason === "incapacidad" && !values.attachment) {
      ctx.addIssue({
        code: "custom",
        path: ["attachment"],
        message: "Adjunta el soporte médico de la incapacidad.",
      })
    }
  })

export type AbsenceFormInput = z.input<typeof absenceSchema>
export type AbsenceFormValues = z.output<typeof absenceSchema>
