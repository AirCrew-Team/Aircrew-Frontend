import * as z from "zod/mini"

import type { Airport } from "@/modules/adminFlights/types/adminFlights.types"
import { zonedToUtc } from "@/modules/adminFlights/utils/flightTime"

// Número de vuelo: código de la aerolínea (2 letras o números) y de 1 a 4 números.
const FLIGHT_NUMBER_PATTERN = /^[A-Za-z0-9]{2}\d{1,4}$/
// Puerta de embarque (opcional): hasta 5 letras, números o guion, ej. "A12".
const GATE_PATTERN = /^[A-Za-z0-9-]{1,5}$/
const MAX_DURATION_MINUTES = 20 * 60

const required = (message: string) =>
  z.string().check(z.trim(), z.minLength(1, message))

// Salida y llegada en UTC, cada una con la zona de su aeropuerto. null si falta algo.
export const flightInstants = (
  values: Pick<
    FlightFormValues,
    | "origin"
    | "destination"
    | "departureDate"
    | "departureTime"
    | "arrivalDate"
    | "arrivalTime"
  >,
  airports: Airport[]
) => {
  const zoneOf = (code: string) =>
    airports.find((airport) => airport.code === code)?.timezone
  const originZone = zoneOf(values.origin)
  const destinationZone = zoneOf(values.destination)
  const departure = originZone
    ? zonedToUtc(values.departureDate, values.departureTime, originZone)
    : null
  const arrival = destinationZone
    ? zonedToUtc(values.arrivalDate, values.arrivalTime, destinationZone)
    : null
  return { departure, arrival }
}

// Reglas del formulario «Crear vuelo». Son las del backend; la hora de cada extremo se
// convierte con la zona de su aeropuerto (del catálogo), por eso el schema lo recibe.
export const flightSchemaFor = (airports: Airport[], now = () => new Date()) =>
  z
    .object({
      flightNumber: z
        .string()
        .check(
          z.trim(),
          z.minLength(1, "Ingresa el número de vuelo."),
          z.regex(
            FLIGHT_NUMBER_PATTERN,
            "Usa el código de la aerolínea y de 1 a 4 números (ej. DL1234)."
          )
        ),
      gate: z.string().check(
        z.trim(),
        z.refine((value) => value === "" || GATE_PATTERN.test(value), {
          message: "Hasta 5 letras o números (ej. A12).",
        })
      ),
      origin: required("Selecciona el origen."),
      destination: required("Selecciona el destino."),
      departureDate: required("Elige la fecha de salida."),
      departureTime: required("Elige la hora de salida."),
      arrivalDate: required("Elige la fecha de llegada."),
      arrivalTime: required("Elige la hora de llegada."),
      aircraftId: required("Selecciona la aeronave."),
    })
    .check(
      z.refine(
        (values) =>
          !values.origin ||
          !values.destination ||
          values.origin !== values.destination,
        {
          path: ["destination"],
          message: "El destino debe ser distinto del origen.",
        }
      ),
      z.refine(
        (values) => {
          const { departure } = flightInstants(values, airports)
          return !departure || departure.getTime() > now().getTime()
        },
        {
          path: ["departureTime"],
          message: "La salida debe ser en el futuro.",
        }
      ),
      z.refine(
        (values) => {
          const { departure, arrival } = flightInstants(values, airports)
          if (!departure || !arrival) return true
          const minutes = (arrival.getTime() - departure.getTime()) / 60_000
          return minutes > 0 && minutes <= MAX_DURATION_MINUTES
        },
        {
          path: ["arrivalTime"],
          message:
            "La llegada debe ser después de la salida y el vuelo durar máximo 20 h.",
        }
      )
    )

export type FlightFormValues = {
  flightNumber: string
  gate: string
  origin: string
  destination: string
  departureDate: string
  departureTime: string
  arrivalDate: string
  arrivalTime: string
  aircraftId: string
}
