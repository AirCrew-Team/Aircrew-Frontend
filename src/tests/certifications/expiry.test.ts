import { describe, expect, it } from "vitest"

import {
  formatShortDate,
  getExpiryInfo,
} from "@/modules/certifications/utils/expiry"

// Spec certificaciones-tripulante, D3: «hoy» es la fecha local a medianoche, la hora del día no
// cambia el resultado y los días son (vencimiento − hoy) en días enteros.
// Los ISO se escriben a mano: en Bogotá (UTC−5) `toISOString()` daría el día anterior.

// «Hoy» = 10 Nov 2026 al empezar y al terminar el día.
const TODAY_EARLY = new Date(2026, 10, 10, 0, 5)
const TODAY_LATE = new Date(2026, 10, 10, 23, 55)

const LIMITS = [
  { expiresAt: "2027-01-09", status: "vigente", days: 60, label: "60 días" },
  { expiresAt: "2027-01-08", status: "proximo", days: 59, label: "59 días" },
  { expiresAt: "2026-11-10", status: "proximo", days: 0, label: "0 días" },
  { expiresAt: "2026-11-09", status: "vencido", days: -1, label: "−1 día" },
  {
    expiresAt: null,
    status: "vitalicio",
    days: null,
    label: "sin vencimiento",
  },
] as const

// Tabla de desplazamientos de la spec (hoy = 10 Nov 2026).
const SPEC_TABLE = [
  { expiresAt: "2028-11-28", status: "vigente", days: 749, label: "ATP" },
  { expiresAt: "2026-12-15", status: "proximo", days: 35, label: "Médica" },
  {
    expiresAt: "2027-09-04",
    status: "vigente",
    days: 298,
    label: "Type Rating",
  },
  { expiresAt: "2027-01-27", status: "vigente", days: 78, label: "CAT IIIb" },
] as const

const MONTHS = [
  ["2026-01-01", "01 Ene 2026"],
  ["2026-02-28", "28 Feb 2026"],
  ["2026-03-15", "15 Mar 2026"],
  ["2026-04-30", "30 Abr 2026"],
  ["2026-05-01", "01 May 2026"],
  ["2026-06-09", "09 Jun 2026"],
  ["2027-07-01", "01 Jul 2027"],
  ["2026-08-31", "31 Ago 2026"],
  ["2027-09-04", "04 Sep 2027"],
  ["2026-10-10", "10 Oct 2026"],
  ["2028-11-28", "28 Nov 2028"],
  ["2026-12-31", "31 Dic 2026"],
] as const

describe("getExpiryInfo: límites de D3 (CE-13)", () => {
  it.each(LIMITS)(
    "CE-13: $label ($expiresAt) → $status con days $days, con «hoy» a las 00:05 y a las 23:55",
    ({ expiresAt, status, days }) => {
      expect(getExpiryInfo(expiresAt, TODAY_EARLY)).toEqual({ status, days })
      expect(getExpiryInfo(expiresAt, TODAY_LATE)).toEqual({ status, days })
    }
  )

  it.each(SPEC_TABLE)(
    "CE-13 (tabla de D3): $label ($expiresAt) → $status con $days días, con «hoy» a las 00:05 y a las 23:55",
    ({ expiresAt, status, days }) => {
      expect(getExpiryInfo(expiresAt, TODAY_EARLY)).toEqual({ status, days })
      expect(getExpiryInfo(expiresAt, TODAY_LATE)).toEqual({ status, days })
    }
  )

  it("CE-13 (función pura): no modifica la fecha «hoy» que recibe", () => {
    const today = new Date(2026, 10, 10, 15, 0)
    const before = today.getTime()

    getExpiryInfo("2027-01-09", today)
    getExpiryInfo(null, today)

    expect(today.getTime()).toBe(before)
  })
})

describe("formatShortDate: «DD Mmm AAAA» con meses propios (CE-13)", () => {
  it("CE-13: «2027-07-05» → «05 Jul 2027»", () => {
    expect(formatShortDate("2027-07-05")).toBe("05 Jul 2027")
  })

  it.each(MONTHS)(
    "CE-13 (contrato): «%s» → «%s», sin correrse al día anterior por la zona horaria",
    (iso, expected) => {
      expect(formatShortDate(iso)).toBe(expected)
    }
  )
})
