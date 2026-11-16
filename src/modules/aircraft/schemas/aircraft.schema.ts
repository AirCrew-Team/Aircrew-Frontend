import * as z from "zod/mini"

// Matrícula FAA: N, un dígito del 1 al 9 y hasta 4 caracteres más (números, o letras
// al final). Ej. N391DN, N12345, N1A.
const REGISTRATION_PATTERN = /^N[1-9](?:\d{0,4}|\d{0,3}[A-Z]|\d{0,2}[A-Z]{2})$/

// Año de fabricación más antiguo aceptado.
const MIN_YEAR = 1980

// Fecha de hoy (AAAA-MM-DD), para comparar con el campo de fecha.
const todayIso = () => new Date().toISOString().slice(0, 10)

// Reglas de «Registrar aeronave» / «Editar aeronave».
export const aircraftSchema = z
  .object({
    // Se guarda en mayúsculas y sin espacios: «n391dn » → «N391DN».
    registration: z
      .string()
      .check(
        z.trim(),
        z.toUpperCase(),
        z.minLength(1, "Ingresa la matrícula."),
        z.regex(
          REGISTRATION_PATTERN,
          "Matrícula no válida. Usa el formato FAA, ej. N391DN."
        )
      ),
    // Número de serie del fabricante: solo números.
    msn: z
      .string()
      .check(
        z.trim(),
        z.minLength(1, "Ingresa el número de serie."),
        z.regex(/^\d{3,8}$/, "Usa de 3 a 8 números, ej. 10342.")
      ),
    modelId: z.string().check(z.minLength(1, "Selecciona el modelo.")),
    baseCode: z.string().check(z.minLength(1, "Selecciona la base.")),
    // Año de fabricación: cuatro números, de 1980 al año actual.
    manufactureYear: z.string().check(
      z.trim(),
      z.minLength(1, "Ingresa el año de fabricación."),
      z.refine((value) => {
        const year = Number(value)
        return (
          value === "" ||
          (/^\d{4}$/.test(value) &&
            year >= MIN_YEAR &&
            year <= new Date().getFullYear())
        )
      }, `Usa un año entre ${MIN_YEAR} y el actual, ej. 2021.`)
    ),
    // Llegada a la flota (AAAA-MM-DD, del campo de fecha): no puede ser futura.
    inFleetSince: z.string().check(
      z.minLength(1, "Ingresa la fecha de llegada a la flota."),
      z.refine(
        (value) => value === "" || value <= todayIso(),
        "La fecha no puede ser futura."
      )
    ),
    condition: z.enum(["operativa", "mantenimiento"]),
    // "" mientras no se elige; solo se pide en mantenimiento.
    maintenanceType: z.enum([
      "",
      "motor",
      "ala",
      "tren_aterrizaje",
      "fuselaje",
      "electrico",
      "hidraulico",
      "revision_programada",
    ]),
    // Descripción del problema (opcional), hasta 300 caracteres.
    maintenanceNote: z
      .string()
      .check(z.trim(), z.maxLength(300, "Usa como máximo 300 caracteres.")),
  })
  .check(
    // No pudo llegar a la flota antes de fabricarse.
    z.refine(
      (values) =>
        !values.inFleetSince ||
        !/^\d{4}$/.test(values.manufactureYear) ||
        Number(values.inFleetSince.slice(0, 4)) >=
          Number(values.manufactureYear),
      {
        path: ["inFleetSince"],
        message: "No puede ser anterior al año de fabricación.",
        when: (payload) =>
          !payload.issues.some((issue) => issue.path?.[0] === "inFleetSince"),
      }
    ),
    z.refine(
      (values) =>
        values.condition !== "mantenimiento" || values.maintenanceType !== "",
      {
        path: ["maintenanceType"],
        message: "Selecciona el motivo del mantenimiento.",
      }
    )
  )

export type AircraftFormValues = z.infer<typeof aircraftSchema>
