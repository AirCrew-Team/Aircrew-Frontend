import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"

import {
  alertsWithText,
  FIELD,
  findLoadedMain,
  findSuccessStatus,
  loadingStatuses,
  NON_CREW_ROLES,
  renderConfiguracion,
} from "./profileTestUtils"

type DataFn = (...args: unknown[]) => unknown

// Cada función de profile.data.ts se envuelve para registrar sus llamadas (nombre y argumentos).
// Sin override, delega en la función real (datos simulados).
// No se importa el módulo en el test, así el archivo compila aunque el módulo aún no exista.
const profileData = vi.hoisted(() => ({
  calls: [] as { name: string; args: unknown[] }[],
  overrides: {} as Record<string, DataFn | undefined>,
}))

vi.mock("@/modules/profile/data/profile.data", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return Object.fromEntries(
    Object.entries(actual).map(([name, value]) => {
      if (typeof value !== "function") return [name, value]
      const real = value as DataFn
      return [
        name,
        (...args: unknown[]) => {
          profileData.calls.push({ name, args })
          return (profileData.overrides[name] ?? real)(...args)
        },
      ]
    })
  )
})

const pending = () => new Promise(() => {})
const failing = () => Promise.reject(new Error("fallo simulado"))

const calledNames = () => profileData.calls.map(({ name }) => name)

afterEach(() => {
  profileData.calls.length = 0
  profileData.overrides = {}
})

const LOADING_PROFILE = "Cargando perfil…"
const LOADING_FLIGHT = "Cargando datos de vuelo…"
const PROFILE_ERROR = "No se pudo cargar el perfil."
const FLIGHT_ERROR = "No se pudieron cargar los datos de vuelo."

const statusesWithText = (container: HTMLElement, text: string) =>
  loadingStatuses(container).filter(
    (element) => element.textContent?.trim() === text
  )

describe("Configuración: qué datos se piden por rol", () => {
  it("CP-11: con un tripulante se piden los tres conjuntos de datos con el id del store", async () => {
    renderConfiguracion(ROLES.TRIPULANTE)

    await findLoadedMain(ROLES.TRIPULANTE)
    for (const name of [
      "getUserProfile",
      "getCrewProfile",
      "getNotificationPreferences",
    ]) {
      expect(
        profileData.calls.find((call) => call.name === name)?.args,
        name
      ).toEqual(["mock-tripulante"])
    }
  })

  it.each(NON_CREW_ROLES)(
    "CP-11: con un %s se pide getUserProfile y nunca getCrewProfile ni getNotificationPreferences",
    async (role) => {
      renderConfiguracion(role)

      await findLoadedMain(role)
      expect(
        profileData.calls.find((call) => call.name === "getUserProfile")?.args
      ).toEqual([role === ROLES.SUPER_VISOR ? "mock-supervisor" : "mock-admin"])
      expect(calledNames()).not.toContain("getCrewProfile")
      expect(calledNames()).not.toContain("getNotificationPreferences")
    }
  )
})

describe("Configuración: carga y error de los datos comunes", () => {
  it.each(NON_CREW_ROLES)(
    "CP-13: con un %s, mientras getUserProfile no responde, la tarjeta de identidad y el formulario muestran cada uno un único «Cargando perfil…»",
    async (role) => {
      profileData.overrides.getUserProfile = pending

      renderConfiguracion(role)

      const main = await screen.findByRole("main")
      await within(main).findByRole("heading", { level: 1 })
      await waitFor(() =>
        expect(statusesWithText(main, LOADING_PROFILE)).toHaveLength(2)
      )
      expect(loadingStatuses(main)).toHaveLength(2)
      expect(
        within(main).queryByRole("textbox", { name: FIELD.phone })
      ).toBeNull()
      expect(calledNames()).toContain("getUserProfile")
    }
  )

  it("CP-13: con un tripulante y todo pendiente, hay «Cargando perfil…» y «Cargando datos de vuelo…» y no hay formulario", async () => {
    profileData.overrides.getUserProfile = pending
    profileData.overrides.getCrewProfile = pending
    profileData.overrides.getNotificationPreferences = pending

    renderConfiguracion(ROLES.TRIPULANTE)

    const main = await screen.findByRole("main")
    await within(main).findByRole("heading", { level: 1 })
    await waitFor(() =>
      expect(
        statusesWithText(main, LOADING_PROFILE).length
      ).toBeGreaterThanOrEqual(1)
    )
    // Al menos I3 (FDP) e I4 (certificado médico), cada uno con su estado.
    expect(
      statusesWithText(main, LOADING_FLIGHT).length
    ).toBeGreaterThanOrEqual(2)
    expect(
      within(main).queryByRole("textbox", { name: FIELD.phone })
    ).toBeNull()
    expect(
      within(main).queryByRole("button", { name: "Guardar Cambios" })
    ).toBeNull()
  })

  it("CP-13: el formulario del tripulante espera también a getNotificationPreferences", async () => {
    profileData.overrides.getNotificationPreferences = pending

    renderConfiguracion(ROLES.TRIPULANTE)

    const main = await screen.findByRole("main")
    await waitFor(() =>
      expect(
        statusesWithText(main, LOADING_PROFILE).length
      ).toBeGreaterThanOrEqual(1)
    )
    expect(
      within(main).queryByRole("textbox", { name: FIELD.phone })
    ).toBeNull()
    expect(within(main).queryByRole("switch")).toBeNull()
  })

  it.each(NON_CREW_ROLES)(
    "CP-13: con un %s, si getUserProfile falla, la tarjeta y el formulario muestran «No se pudo cargar el perfil.» y no hay formulario",
    async (role) => {
      profileData.overrides.getUserProfile = failing

      renderConfiguracion(role)

      const main = await screen.findByRole("main")
      await waitFor(() =>
        expect(alertsWithText(main, PROFILE_ERROR)).toHaveLength(2)
      )
      expect(loadingStatuses(main)).toHaveLength(0)
      expect(
        within(main).queryByRole("textbox", { name: FIELD.phone })
      ).toBeNull()
      expect(
        within(main).queryByRole("button", { name: "Guardar Cambios" })
      ).toBeNull()
    }
  )

  it("CP-13: con un tripulante, si getUserProfile falla, aparece «No se pudo cargar el perfil.» y no hay formulario", async () => {
    profileData.overrides.getUserProfile = failing

    renderConfiguracion(ROLES.TRIPULANTE)

    const main = await screen.findByRole("main")
    await waitFor(() =>
      expect(alertsWithText(main, PROFILE_ERROR).length).toBeGreaterThanOrEqual(
        1
      )
    )
    await waitFor(() =>
      expect(statusesWithText(main, LOADING_PROFILE)).toHaveLength(0)
    )
    expect(
      within(main).queryByRole("textbox", { name: FIELD.phone })
    ).toBeNull()
  })
})

describe("Configuración: error de los datos del tripulante", () => {
  it("CP-14: si getCrewProfile falla, los bloques del tripulante muestran «No se pudieron cargar los datos de vuelo.»", async () => {
    profileData.overrides.getCrewProfile = failing

    renderConfiguracion(ROLES.TRIPULANTE)

    const main = await findLoadedMain(ROLES.TRIPULANTE)
    // Al menos I3 (FDP) e I4 (certificado médico).
    expect(alertsWithText(main, FLIGHT_ERROR).length).toBeGreaterThanOrEqual(2)
    expect(alertsWithText(main, PROFILE_ERROR)).toHaveLength(0)
    expect(within(main).queryByRole("meter")).toBeNull()
  })

  it("CP-14: si getCrewProfile falla, el formulario común se puede editar y guardar", async () => {
    profileData.overrides.getCrewProfile = failing
    const user = userEvent.setup()

    renderConfiguracion(ROLES.TRIPULANTE)

    const main = await findLoadedMain(ROLES.TRIPULANTE)
    const zone = within(main).getByRole("textbox", { name: FIELD.zone })
    await user.clear(zone)
    await user.type(zone, "Zona Chapinero, Bogotá")
    await user.click(
      within(main).getByRole("button", { name: "Guardar Cambios" })
    )

    await findSuccessStatus()
    expect(zone).toHaveValue("Zona Chapinero, Bogotá")
  })
})
