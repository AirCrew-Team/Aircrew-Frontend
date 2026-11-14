import * as z from "zod/mini"

import {
  CABIN_LICENSE,
  PILOT_LICENSES,
} from "@/modules/adminCertifications/utils/certificates"

// Número del certificado FAA: solo dígitos, como aparece en la tarjeta.
const NUMBER_PATTERN = /^\d{5,10}$/

// Reglas del formulario «Registrar certificado» (también al editar).
// `area` no lo escribe el usuario: sale del tripulante elegido y decide qué
// certificados son obligatorios.
export const certificationSchema = z
  .object({
    crewId: z.string().check(z.minLength(1, "Selecciona el tripulante.")),
    area: z.string(),
    licenseNumber: z
      .string()
      .check(
        z.trim(),
        z.minLength(1, "Ingresa el número de certificado."),
        z.regex(
          NUMBER_PATTERN,
          "Usa solo números (de 5 a 10 dígitos), como aparece en la tarjeta."
        )
      ),
    certificates: z
      .array(z.string())
      .check(z.minLength(1, "Selecciona al menos un certificado.")),
    verified: z.boolean(),
  })
  .check(
    // Pilotos: IR y ME van sobre una licencia de piloto, así que necesitan una.
    z.refine(
      (values) =>
        values.area !== "cabina_mando" ||
        values.certificates.length === 0 ||
        values.certificates.some((code) => PILOT_LICENSES.includes(code)),
      {
        path: ["certificates"],
        message: "Un piloto necesita al menos una licencia: PPL, CPL o ATP.",
      }
    ),
    // Tripulación de cabina: el CDP es obligatorio.
    z.refine(
      (values) =>
        values.area !== "cabina" ||
        values.certificates.length === 0 ||
        values.certificates.includes(CABIN_LICENSE),
      {
        path: ["certificates"],
        message:
          "El Certificate of Demonstrated Proficiency (CDP) es obligatorio para la tripulación de cabina.",
      }
    )
  )

export type CertificationFormValues = z.infer<typeof certificationSchema>
