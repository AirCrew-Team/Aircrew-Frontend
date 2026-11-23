import { afterEach, describe, expect, it, vi } from "vitest"

import { absenceSchema } from "@/modules/absences/schemas/absence.schema"

// Spec docs/specs/cierre-pendientes.md, FE-2 (F8): la regla «la fecha de inicio no puede
// ser anterior a hoy» usa el día LOCAL del tripulante, no el de UTC. Se fija la hora del
// sistema cerca de medianoche y la zona horaria por test.
//
// Zona por test: vi.stubEnv("TZ", …) cambia process.env.TZ y Node vuelve a leer la zona
// en ese momento (cada test lo comprueba con getTimezoneOffset). Ojo: BORRAR TZ no hace
// que Node la vuelva a leer (comprobado en Windows con Node 24), así que vi.unstubAllEnvs
// a secas dejaría la última zona puesta para los tests siguientes. Por eso afterEach pone
// primero la zona original y luego quita el stub.
//
// En julio Nueva York está en UTC−4 (horario de verano) y Bogotá en UTC−5: a las 04:30 UTC
// del 15, en Nueva York ya es el 15 (00:30) y en Bogotá sigue siendo el 14 (23:30). A las
// 03:30 UTC, las dos siguen en el 14 y UTC ya está en el 15.

const START_ERROR = "La fecha de inicio no puede ser anterior a hoy."

// Zona de la máquina, antes de cualquier stub.
const ORIGINAL_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone

const useZone = (zone: string, isoInstant: string) => {
  vi.stubEnv("TZ", zone)
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date(isoInstant))
}

afterEach(() => {
  vi.useRealTimers()
  vi.stubEnv("TZ", ORIGINAL_ZONE)
  vi.unstubAllEnvs()
})

// Errores de la fecha de inicio para un formulario válido salvo esa fecha.
const startDateErrors = (startDate: string) => {
  const result = absenceSchema.safeParse({
    startDate,
    endDate: startDate,
    reason: "fatiga",
    notes: "",
    attachment: null,
  })
  return result.success
    ? []
    : result.error.issues
        .filter((issue) => issue.path[0] === "startDate")
        .map((issue) => issue.message)
}

describe("FE-2 (F8): «hoy» del formulario de ausencia según la zona horaria", () => {
  it("F8: en Bogotá a las 23:30 del 14 de julio (04:30 UTC del 15), hoy es el 14: el 14 se acepta y el 13 no", () => {
    useZone("America/Bogota", "2026-07-15T04:30:00Z")
    expect(new Date().getTimezoneOffset(), "la zona surtió efecto").toBe(300)
    expect(new Date().getDate()).toBe(14)

    expect(startDateErrors("2026-07-14")).toEqual([])
    expect(startDateErrors("2026-07-15")).toEqual([])
    expect(startDateErrors("2026-07-13")).toEqual([START_ERROR])
  })

  it("F8: en Nueva York a las 00:30 del 15 de julio (04:30 UTC del 15), hoy es el 15: el 14 ya no se acepta", () => {
    useZone("America/New_York", "2026-07-15T04:30:00Z")
    expect(new Date().getTimezoneOffset(), "la zona surtió efecto").toBe(240)
    expect(new Date().getDate()).toBe(15)

    expect(startDateErrors("2026-07-15")).toEqual([])
    expect(startDateErrors("2026-07-14")).toEqual([START_ERROR])
  })

  it("F8: en Nueva York a las 23:30 del 14 de julio (03:30 UTC del 15), hoy sigue siendo el 14 aunque en UTC ya sea el 15", () => {
    useZone("America/New_York", "2026-07-15T03:30:00Z")
    expect(new Date().getTimezoneOffset(), "la zona surtió efecto").toBe(240)
    expect(new Date().getDate()).toBe(14)

    expect(startDateErrors("2026-07-14")).toEqual([])
    expect(startDateErrors("2026-07-13")).toEqual([START_ERROR])
  })

  it("F8: en Bogotá a las 00:01 del 23 de noviembre (05:01 UTC), hoy es el 23: el 22 ya no se acepta", () => {
    useZone("America/Bogota", "2026-11-23T05:01:00Z")
    expect(new Date().getTimezoneOffset(), "la zona surtió efecto").toBe(300)

    expect(startDateErrors("2026-11-23")).toEqual([])
    expect(startDateErrors("2026-11-22")).toEqual([START_ERROR])
  })

  it("F8: en Nueva York a las 23:59 del 22 de noviembre (04:59 UTC del 23), hoy sigue siendo el 22", () => {
    useZone("America/New_York", "2026-11-23T04:59:00Z")
    expect(new Date().getTimezoneOffset(), "la zona surtió efecto").toBe(300)

    expect(startDateErrors("2026-11-22")).toEqual([])
    expect(startDateErrors("2026-11-21")).toEqual([START_ERROR])
  })
})
