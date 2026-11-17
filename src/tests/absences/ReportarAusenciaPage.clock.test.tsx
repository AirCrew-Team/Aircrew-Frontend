import { act, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"

// La ruta se carga con `lazy` (react-hook-form + zod): la primera espera de la pantalla
// lleva más margen que el segundo por defecto, por si el chunk se transforma en frío.
const LAZY = { timeout: 3000 }

// RA-03 y RA-04 con el reloj fijado en 2024-10-20T01:27:00Z (domingo).
// getAffectedFlight calcula la salida como ahora + 5 h 48 min → 07:15 UTC, y la
// presentación como salida − 90 min → 05:45 UTC: la cuenta empieza en «04h : 18m».
//
// Solo se falsean Date, setInterval y clearInterval, y SIN shouldAdvanceTime:
// - Date queda congelado mientras carga el vuelo. Con shouldAdvanceTime el reloj avanza a
//   saltos reales de 20 ms: si la cuenta leyera «ahora» después de un salto (p. ej. al llegar
//   los datos), la diferencia sería 4 h 17 min 59,98 s y, al redondear hacia abajo, «04h : 17m».
//   El resultado dependería de la velocidad de la máquina.
// - setTimeout sigue siendo real, así TanStack Query, React y user-event funcionan.
// - El intervalo de la cuenta (como el de UtcClock) avanza con vi.advanceTimersByTime.
// - Ojo: el sondeo de waitFor usa setInterval (falso aquí), así que las esperas solo se
//   vuelven a comprobar con cambios del DOM. Todas las esperas de este archivo son del DOM.
const FROZEN_NOW = new Date("2024-10-20T01:27:00Z")
const MINUTE = 60_000

// ReportingPolicyCard (R1) se sustituye por un bloque que cuenta sus renders.
// Si el tic de la cuenta volviera a renderizar la página o un contenedor común, la cuenta subiría.
const policy = vi.hoisted(() => ({ renders: 0 }))

vi.mock("@/modules/absences/components/ReportingPolicyCard", () => ({
  default: () => {
    policy.renders += 1
    return <p>Normativa de reportes (simulada)</p>
  },
}))

const LIVE_REGION =
  '[role="status"], [role="alert"], [role="log"], [aria-live]:not([aria-live="off"]), output'

const normalize = (text: string | null) =>
  (text ?? "").replace(/\s+/g, " ").trim()

// El elemento más interno cuyo texto completo (normalizado) es `text`,
// aunque el texto esté repartido en varios <span>.
const getByFullText = (container: HTMLElement, text: string) => {
  const matches = Array.from(
    container.querySelectorAll<HTMLElement>("*")
  ).filter((element) => normalize(element.textContent) === text)
  const innermost = matches.filter(
    (element) =>
      !matches.some((other) => other !== element && element.contains(other))
  )
  expect(innermost, `debe verse el texto «${text}»`).toHaveLength(1)
  return innermost[0]
}

const loadingStatuses = (container: HTMLElement) =>
  within(container)
    .queryAllByRole("status")
    .filter((element) => /^cargando/i.test(element.textContent?.trim() ?? ""))

const advance = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
}

// LG-08: el store arranca sin sesión, así que cada test pone la del tripulante.
beforeEach(() => {
  useAuthStore.getState().setMockRole(ROLES.TRIPULANTE)
  vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] })
  vi.setSystemTime(FROZEN_NOW)
})

afterEach(() => {
  vi.useRealTimers()
  policy.renders = 0
})

describe("Reportar Ausencia: vuelo afectado (F1)", () => {
  it("RA-03: con el reloj en 2024-10-20T01:27:00Z, F1 muestra AV-8520, Airbus A320, BOG → CLO, «Dom 20 Oct», «07:15 UTC», rol, puerta y «Auto-asignado por Roster»", async () => {
    renderRoute(PATHS.tripulante.reportarAusencia)

    const main = await screen.findByRole("main")
    expect(
      await within(main).findByRole(
        "heading",
        {
          level: 2,
          name: "Vuelo o Turno Afectado",
        },
        LAZY
      )
    ).toBeInTheDocument()
    const form = main.querySelector("form")
    expect(form, "F1 debe ir dentro del <form>").not.toBeNull()
    await waitFor(() => expect(form).toHaveTextContent("AV-8520"))
    expect(loadingStatuses(main)).toHaveLength(0)

    for (const text of [
      "Auto-asignado por Roster",
      "AV-8520",
      "Airbus A320",
      "BOG",
      "CLO",
      "Dom 20 Oct",
      "07:15 UTC",
      "Próximo servicio operacional asignado en tu planilla de vuelo.",
      "Rol: Primer Oficial",
      "Gate A4 • SKBO",
    ]) {
      expect(form).toHaveTextContent(text)
    }
  })
})

describe("Reportar Ausencia: cuenta «Tiempo a presentación» (C)", () => {
  it("RA-04: muestra «04h : 18m», tras 1 minuto «04h : 17m» y, al vencer y después, «00h : 00m»; no es una región viva", async () => {
    renderRoute(PATHS.tripulante.reportarAusencia)

    const main = await screen.findByRole("main")
    const value = await waitFor(() => getByFullText(main, "04h : 18m"), LAZY)
    const label = getByFullText(main, "Tiempo a presentación")
    expect(value.closest(LIVE_REGION), "la cuenta no es región viva").toBeNull()
    expect(label.closest(LIVE_REGION), "la cuenta no es región viva").toBeNull()
    // A11Y-AUS-4: el valor visual va oculto al lector, que oye horas y minutos en palabras.
    expect(value.closest('[aria-hidden="true"]')).not.toBeNull()
    expect(within(main).getByText("4 horas y 18 minutos")).toHaveClass(
      "sr-only"
    )

    await advance(MINUTE)
    getByFullText(main, "04h : 17m")
    within(main).getByText("4 horas y 17 minutos")

    // 01:28 + 4 h 17 min = 05:45, la hora de presentación: diferencia 0.
    await advance((4 * 60 + 17) * MINUTE)
    getByFullText(main, "00h : 00m")

    within(main).getByText("0 horas y 0 minutos")

    // Ya vencida, la diferencia negativa también muestra 00h : 00m.
    await advance(MINUTE)
    getByFullText(main, "00h : 00m")
  })

  it("Revisión: la cuenta cambia de minuto a tiempo aunque la pantalla se abra a mitad de minuto", async () => {
    // 01:27:45 → salida 07:15 (redondeo hacia abajo), presentación 05:45: faltan 4 h 17 min 15 s.
    vi.setSystemTime(new Date("2024-10-20T01:27:45Z"))
    renderRoute(PATHS.tripulante.reportarAusencia)

    const main = await screen.findByRole("main")
    await waitFor(() => getByFullText(main, "04h : 17m"), LAZY)

    // 16 s después quedan 4 h 16 min 59 s: no puede seguir mostrando 17m otro minuto entero.
    await advance(16_000)
    getByFullText(main, "04h : 16m")
  })

  it("RA-04: durante 3 minutos de cuenta, el bloque hermano ReportingPolicyCard no vuelve a renderizarse", async () => {
    renderRoute(PATHS.tripulante.reportarAusencia)

    await screen.findByText("Normativa de reportes (simulada)", undefined, LAZY)
    const main = await screen.findByRole("main")
    await waitFor(() => getByFullText(main, "04h : 18m"))
    await waitFor(() => expect(loadingStatuses(main)).toHaveLength(0))

    const rendersBefore = policy.renders
    expect(rendersBefore).toBeGreaterThan(0)

    await advance(3 * MINUTE)

    // La cuenta sí avanzó: el test no pasa por una cuenta detenida.
    getByFullText(main, "04h : 15m")
    expect(policy.renders).toBe(rendersBefore)
  })
})
