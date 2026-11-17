import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"

import {
  alertsWithText,
  FIELD,
  findLoadedMain,
  findSuccessToast,
  getSectionByHeading,
  loadingStatuses,
  NON_CREW_ROLES,
  renderConfiguracion,
  SECURITY_HEADING,
  statusesWithText,
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
const LOADING_SHIFT = "Cargando datos del turno…"
const SHIFT_ERROR = "No se pudieron cargar los datos del turno."

// I1 del supervisor (section rotulada por el nombre completo del store) y su F2.
const SUPERVISOR_NAME = "Camila Restrepo"
const SUPERVISOR_EMPLOYMENT_H2 =
  "2. Información Laboral y Turno (Solo Lectura - Registrada)"

const SUPERVISOR_DATA_FNS = [
  "getSupervisorProfile",
  "getSupervisorNotificationPreferences",
]

// CS-03: un UserProfile completo con el contrato nuevo de `security` (sin llave ni 2FA).
// Sin anotar el tipo, para que compile antes y después del cambio de profile.types.ts.
const userProfileWithPasswordAge = (days: number) => ({
  employeeCode: "AC-9001",
  status: "Activo",
  contact: {
    phone: "+57 300 000 0000",
    email: "prueba@aircrew-ops.com",
    residenceZone: "Zona Prueba, Bogotá",
  },
  security: { lastPasswordChangeDays: days },
})

describe("Configuración: qué datos se piden por rol", () => {
  it("CP-11: con un tripulante se piden los tres conjuntos de datos con el id del store", async () => {
    renderConfiguracion(ROLES.TRIPULANTE)

    await findLoadedMain()
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

      await findLoadedMain()
      expect(
        profileData.calls.find((call) => call.name === "getUserProfile")?.args
      ).toEqual([role === ROLES.SUPER_VISOR ? "mock-supervisor" : "mock-admin"])
      expect(calledNames()).not.toContain("getCrewProfile")
      expect(calledNames()).not.toContain("getNotificationPreferences")
    }
  )

  it("CS-10: con el supervisor se piden getSupervisorProfile y getSupervisorNotificationPreferences con «mock-supervisor», y nunca los datos del tripulante", async () => {
    renderConfiguracion(ROLES.SUPER_VISOR)

    await findLoadedMain()
    for (const name of SUPERVISOR_DATA_FNS) {
      const calls = profileData.calls.filter((call) => call.name === name)
      expect(calls.length, `${name} debe pedirse`).toBeGreaterThan(0)
      for (const { args } of calls) {
        expect(args, name).toEqual(["mock-supervisor"])
      }
    }
    expect(calledNames()).not.toContain("getCrewProfile")
    expect(calledNames()).not.toContain("getNotificationPreferences")
  })

  it("CS-10: con el tripulante no se piden los datos del supervisor (y esas funciones existen en profile.data)", async () => {
    // Ancla: sin las funciones, «no se llamaron» pasaría en verde de forma vacía.
    const actual = await vi.importActual<Record<string, unknown>>(
      "@/modules/profile/data/profile.data"
    )
    for (const name of SUPERVISOR_DATA_FNS) {
      expect(typeof actual[name], `${name} debe exportarse`).toBe("function")
    }

    renderConfiguracion(ROLES.TRIPULANTE)

    await findLoadedMain()
    for (const name of SUPERVISOR_DATA_FNS) {
      expect(calledNames()).not.toContain(name)
    }
  })
})

describe("Configuración: carga y error de los datos comunes", () => {
  it.each(NON_CREW_ROLES)(
    "CP-13: con un %s, mientras getUserProfile no responde, la tarjeta de identidad y el formulario muestran cada uno un único «Cargando perfil…»",
    async (role) => {
      profileData.overrides.getUserProfile = pending
      // La lista rápida de I1 tiene su propio estado: se deja pendiente para que el
      // recuento sea estable (2 «Cargando perfil…» + 1 «Cargando datos del turno…»).
      profileData.overrides.getSupervisorProfile = pending

      renderConfiguracion(role)

      const main = await screen.findByRole("main")
      await within(main).findByRole("heading", { level: 1 })
      await waitFor(() => {
        expect(statusesWithText(main, LOADING_PROFILE)).toHaveLength(2)
        expect(statusesWithText(main, LOADING_SHIFT)).toHaveLength(1)
        expect(loadingStatuses(main)).toHaveLength(3)
      })
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
      // Igual que arriba: la lista rápida de I1 queda pendiente y su estado no cuenta como error.
      profileData.overrides.getSupervisorProfile = pending

      renderConfiguracion(role)

      const main = await screen.findByRole("main")
      await waitFor(() => {
        expect(alertsWithText(main, PROFILE_ERROR)).toHaveLength(2)
        expect(statusesWithText(main, LOADING_PROFILE)).toHaveLength(0)
        expect(statusesWithText(main, LOADING_SHIFT)).toHaveLength(1)
        expect(loadingStatuses(main)).toHaveLength(1)
      })
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

    const main = await findLoadedMain()
    // Al menos I3 (FDP) e I4 (certificado médico).
    expect(alertsWithText(main, FLIGHT_ERROR).length).toBeGreaterThanOrEqual(2)
    expect(alertsWithText(main, PROFILE_ERROR)).toHaveLength(0)
    expect(within(main).queryByRole("meter")).toBeNull()
  })

  it("CP-14: si getCrewProfile falla, el formulario común se puede editar y guardar", async () => {
    profileData.overrides.getCrewProfile = failing
    const user = userEvent.setup()

    renderConfiguracion(ROLES.TRIPULANTE)

    const main = await findLoadedMain()
    const zone = within(main).getByRole("textbox", { name: FIELD.zone })
    await user.clear(zone)
    await user.type(zone, "Zona Chapinero, Bogotá")
    await user.click(
      within(main).getByRole("button", { name: "Guardar Cambios" })
    )

    await findSuccessToast()
    expect(zone).toHaveValue("Zona Chapinero, Bogotá")
  })
})

describe("Configuración: antigüedad de la contraseña (CS-03)", () => {
  it.each([
    [ROLES.TRIPULANTE, 0, /Último cambio: hoy/],
    [ROLES.TRIPULANTE, 1, /Último cambio: hace 1 día(?!s)/],
    [ROLES.SUPER_VISOR, 0, /Último cambio: hoy/],
    [ROLES.SUPER_VISOR, 1, /Último cambio: hace 1 día(?!s)/],
  ])(
    "CS-03: con un %s y lastPasswordChangeDays = %i, la etiqueta dice %s",
    async (role, days, label) => {
      profileData.overrides.getUserProfile = () =>
        Promise.resolve(userProfileWithPasswordAge(days))

      renderConfiguracion(role)

      const main = await findLoadedMain()
      const security = getSectionByHeading(main, SECURITY_HEADING)
      expect(security).toHaveTextContent(label)
      expect(security).not.toHaveTextContent(/hace 0 días/)
    }
  )
})

describe("Configuración: carga y error de los datos del supervisor", () => {
  it("CS-11: si getSupervisorProfile no responde, I1 y F2 tienen cada uno exactamente un «Cargando datos del turno…», y la tarjeta sigue con su nombre", async () => {
    profileData.overrides.getSupervisorProfile = pending

    renderConfiguracion(ROLES.SUPER_VISOR)

    const main = await screen.findByRole("main")
    await within(main).findByRole("button", { name: "Guardar Cambios" })
    await waitFor(() => {
      for (const name of [SUPERVISOR_NAME, SUPERVISOR_EMPLOYMENT_H2]) {
        const section = getSectionByHeading(main, name)
        expect(
          within(section)
            .queryAllByRole("status")
            .map((element) => element.textContent?.trim()),
          name
        ).toEqual([LOADING_SHIFT])
        expect(within(section).queryAllByRole("alert"), name).toHaveLength(0)
      }
    })
    expect(
      within(main).getByRole("heading", { level: 2, name: SUPERVISOR_NAME })
    ).toBeInTheDocument()
  })

  it("CS-11: si getSupervisorProfile falla, I1 y F2 tienen cada uno exactamente un «No se pudieron cargar los datos del turno.», y la tarjeta sigue con su nombre", async () => {
    profileData.overrides.getSupervisorProfile = failing

    renderConfiguracion(ROLES.SUPER_VISOR)

    const main = await screen.findByRole("main")
    await within(main).findByRole("button", { name: "Guardar Cambios" })
    await waitFor(() => {
      for (const name of [SUPERVISOR_NAME, SUPERVISOR_EMPLOYMENT_H2]) {
        const section = getSectionByHeading(main, name)
        expect(
          within(section)
            .queryAllByRole("alert")
            .map((element) => element.textContent?.trim()),
          name
        ).toEqual([SHIFT_ERROR])
        expect(within(section).queryAllByRole("status"), name).toHaveLength(0)
      }
    })
    expect(
      within(main).getByRole("heading", { level: 2, name: SUPERVISOR_NAME })
    ).toBeInTheDocument()
  })

  it("CS-12: el formulario del supervisor espera a getSupervisorNotificationPreferences: mientras no responde, hay un único «Cargando perfil…» y no hay formulario", async () => {
    profileData.overrides.getSupervisorNotificationPreferences = pending

    renderConfiguracion(ROLES.SUPER_VISOR)

    const main = await screen.findByRole("main")
    await within(main).findByRole("heading", { level: 1 })
    await waitFor(() => {
      expect(statusesWithText(main, LOADING_PROFILE)).toHaveLength(1)
      expect(loadingStatuses(main)).toHaveLength(1)
    })
    expect(
      within(main).queryByRole("textbox", { name: FIELD.phone })
    ).toBeNull()
    expect(within(main).queryByRole("switch")).toBeNull()
    expect(
      within(main).queryByRole("button", { name: "Guardar Cambios" })
    ).toBeNull()
  })

  it("CS-12: si getSupervisorNotificationPreferences falla, hay exactamente una alerta «No se pudo cargar el perfil.» y no hay formulario", async () => {
    profileData.overrides.getSupervisorNotificationPreferences = failing

    renderConfiguracion(ROLES.SUPER_VISOR)

    const main = await screen.findByRole("main")
    await waitFor(() => {
      expect(alertsWithText(main, PROFILE_ERROR)).toHaveLength(1)
      expect(within(main).queryAllByRole("alert")).toHaveLength(1)
      expect(loadingStatuses(main)).toHaveLength(0)
    })
    expect(
      within(main).queryByRole("textbox", { name: FIELD.phone })
    ).toBeNull()
    expect(
      within(main).queryByRole("button", { name: "Guardar Cambios" })
    ).toBeNull()
    expect(
      within(main).getByRole("heading", { level: 2, name: SUPERVISOR_NAME })
    ).toBeInTheDocument()
  })
})
