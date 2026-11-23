import * as z from "zod/mini"

import { daysBetween } from "@/modules/shared/absences/absenceDates"

const REASONS = ["incapacidad", "fatiga", "calamidad", "traslado"] as const

// Coincide con el atributo accept del input: .pdf, .png, .jpg y .jpeg.
const ACCEPTED_EXTENSION = /\.(pdf|png|jpe?g)$/i
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
const MAX_DAYS_BETWEEN = 30

const pad = (value: number) => String(value).padStart(2, "0")

// «Hoy» local en «YYYY-MM-DD» (nunca toISOString(), que es UTC). Se calcula en cada
// validación: el formulario puede quedar abierto de un día para otro.
const today = () => {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export const absenceSchema = z
  .object({
    // «YYYY-MM-DD» del <input type="date">: el orden de texto es el de las fechas.
    startDate: z.string().check(
      z.minLength(1, "Indica la fecha de inicio."),
      z.refine(
        (value) => value >= today(),
        "La fecha de inicio no puede ser anterior a hoy."
      )
    ),
    endDate: z.string().check(z.minLength(1, "Indica la fecha de fin.")),
    // El select empieza vacío: se valida como texto y luego se estrecha al motivo.
    reason: z.pipe(
      z.string().check(z.minLength(1, "Selecciona el motivo de la ausencia.")),
      z.enum(REASONS)
    ),
    notes: z
      .string()
      .check(
        z.maxLength(300, "Las observaciones admiten máximo 300 caracteres.")
      ),
    // Formato y tamaño van en el campo para validarse al elegir el archivo.
    attachment: z.nullable(
      z.instanceof(File).check(
        z.refine(
          (file) => ACCEPTED_EXTENSION.test(file.name),
          "Formato no admitido. Usa PDF, PNG o JPG."
        ),
        z.refine(
          (file) => file.size <= MAX_ATTACHMENT_BYTES,
          "El archivo supera el máximo de 10 MB."
        )
      )
    ),
  })
  .check(
    z.superRefine((values, ctx) => {
      const { startDate, endDate } = values
      if (startDate && endDate && endDate < startDate) {
        ctx.addIssue({
          code: "custom",
          path: ["endDate"],
          message: "La fecha de fin no puede ser anterior a la de inicio.",
        })
      } else if (
        startDate &&
        endDate &&
        daysBetween(startDate, endDate) > MAX_DAYS_BETWEEN
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["endDate"],
          message:
            "No puede haber más de 30 días entre la fecha de inicio y la de fin.",
        })
      }
      if (values.reason === "incapacidad" && !values.attachment) {
        ctx.addIssue({
          code: "custom",
          path: ["attachment"],
          message: "Adjunta el soporte médico de la incapacidad.",
        })
      }
    })
  )

export type AbsenceFormInput = z.input<typeof absenceSchema>
export type AbsenceFormValues = z.output<typeof absenceSchema>
