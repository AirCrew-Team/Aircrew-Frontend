import { afterEach, describe, expect, it, vi } from "vitest"

import type { AppNotification } from "@/App/actions/notifications/notifications.actions"
import { notificationTarget } from "@/modules/shared/notifications/notificationTarget"

// Spec notificaciones-navegables, parte B: función pura notificationTarget(notification)
// → URL de destino o null.

const target = async (notification: AppNotification) =>
  notificationTarget(notification)

// Zona de la máquina, antes de cualquier stub. Como en absenceSchema.timezone.test.ts:
// borrar TZ no hace que Node la vuelva a leer, así que primero se pone la original.
const ORIGINAL_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone

afterEach(() => {
  vi.stubEnv("TZ", ORIGINAL_ZONE)
  vi.unstubAllEnvs()
})

const notification = (
  type: string,
  data: Record<string, unknown>
): AppNotification => ({
  id: "n-1",
  type,
  message: "Aviso de prueba.",
  data,
  read: false,
  read_at: null,
  created_at: "2026-11-22T15:00:00.000Z",
})

// Día local AAAA-MM-DD de un instante, con getters locales (como dayFromToday).
const localDayOf = (iso: string) => {
  const date = new Date(iso)
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

describe("notificationTarget: destino de cada tipo (NL-01 a NL-04)", () => {
  it.each(["absence:reported", "absence:covered"])(
    "NL-01: «%s» → /supervisor/ausencias?ausencia=<data.absence.id>",
    async (type) => {
      expect(
        await target(notification(type, { absence: { id: "abs-7" } }))
      ).toBe("/supervisor/ausencias?ausencia=abs-7")
    }
  )

  it.each(["absence:suggestions_ready", "absence:deadline_missed"])(
    "NL-02: «%s» → /supervisor/solicitudes-reemplazo?solicitud=<data.absence_id>",
    async (type) => {
      expect(
        await target(
          notification(type, { absence_id: "abs-9", state: "ready" })
        )
      ).toBe("/supervisor/solicitudes-reemplazo?solicitud=abs-9")
    }
  )

  it("NL-03: «flight:slot_vacated» → /supervisor/programacion?vuelo=<data.flight_id>&fecha=<día local de data.departure_at>", async () => {
    // 23:30 del 25 de noviembre en Nueva York (UTC−5): el día UTC ya es el 26. Se fija la
    // zona para que el caso pruebe algo también en una máquina en UTC.
    vi.stubEnv("TZ", "America/New_York")
    const departureAt = "2026-11-26T04:30:00.000Z"

    expect(
      await target(
        notification("flight:slot_vacated", {
          flight_id: "f-1102",
          flight_number: "DL1102",
          departure_at: departureAt,
        })
      )
    ).toBe("/supervisor/programacion?vuelo=f-1102&fecha=2026-11-25")
    expect(localDayOf(departureAt)).toBe("2026-11-25")
  })

  it("NL-03: la fecha es el día local también a primera hora (00:15 locales)", async () => {
    const departureAt = new Date(2026, 11, 1, 0, 15).toISOString()

    expect(
      await target(
        notification("flight:slot_vacated", {
          flight_id: "f-9",
          departure_at: departureAt,
        })
      )
    ).toBe("/supervisor/programacion?vuelo=f-9&fecha=2026-12-01")
  })

  it("NL-04: «assignment:replacement» → /tripulante", async () => {
    expect(
      await target(
        notification("assignment:replacement", { assignment_id: "as-1" })
      )
    ).toBe("/tripulante")
  })

  it.each(["certification:registered", "certification:verified"])(
    "NL-04: «%s» → /tripulante/certificaciones",
    async (type) => {
      expect(
        await target(notification(type, { certification_id: "cert-1" }))
      ).toBe("/tripulante/certificaciones")
    }
  )
})

describe("notificationTarget: sin destino (NL-06)", () => {
  it.each([
    ["absence:reported sin absence", "absence:reported", {}],
    ["absence:covered sin absence.id", "absence:covered", { absence: {} }],
    [
      "absence:suggestions_ready sin absence_id",
      "absence:suggestions_ready",
      { state: "ready" },
    ],
    ["absence:deadline_missed sin absence_id", "absence:deadline_missed", {}],
    [
      "flight:slot_vacated sin flight_id",
      "flight:slot_vacated",
      { departure_at: "2026-11-25T14:00:00.000Z" },
    ],
    [
      "tipo desconocido",
      "flight:delayed",
      { absence_id: "abs-9", flight_id: "f-1" },
    ],
  ])("NL-06: %s → null", async (_case, type, data) => {
    expect(await target(notification(type, data))).toBeNull()
  })
})
