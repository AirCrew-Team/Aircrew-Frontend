import { act, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { recordRequests } from "../mocks/absencesApi"
import {
  CITY_SERVER_ERROR,
  PROFILE_URLS,
  REAL_ACCOUNTS,
  realProfile,
  US_CITIES,
  type MyProfileBody,
  type RealAccountKey,
} from "../mocks/profileApi"
import { findToast, queryToast } from "../utils/toasts"
import {
  BLOCK,
  CITY_ERROR,
  cityOptions,
  FIELD,
  findLoadedMain,
  getSectionByHeading,
  openRealSession,
  REAL_KEYS,
  SAVE,
  SAVED_TOAST,
  waitForCities,
} from "./profileTestUtils"

// Spec configuracion-real, ampliación A2 (CF-10): «Ciudad de residencia» es un <input>
// con <datalist> cuyas opciones salen de GET /api/admin/catalogs/us-cities (se piden una
// vez y quedan en caché). Al guardar, una ciudad que no está en la lista muestra «Elige
// una ciudad de la lista.» en el campo (aria-invalid) y no hace el PATCH. Vacío se puede
// guardar. Las residencias guardadas fuera de la lista se muestran tal cual.

vi.setConfig({ testTimeout: 20_000 })

const CITY_ERROR_PATTERN = new RegExp(
  CITY_ERROR.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
)

const setup = async (key: RealAccountKey, profile?: MyProfileBody) => {
  const user = userEvent.setup()
  const session = openRealSession(key, { profile })
  const main = await findLoadedMain(REAL_ACCOUNTS[key].email)
  const contact = getSectionByHeading(main, BLOCK.contact)
  const residence = within(contact).getByLabelText(FIELD.residence)
  return {
    ...session,
    user,
    main,
    residence,
    saveButton: within(main).getByRole("button", { name: SAVE }),
  }
}

// Escribe en la residencia, guarda y espera a que el campo quede marcado.
const saveInvalidCity = async (
  { user, residence, saveButton }: Awaited<ReturnType<typeof setup>>,
  value: string
) => {
  await waitForCities(residence)
  await user.clear(residence)
  await user.type(residence, value)
  await user.click(saveButton)
  await waitFor(() => expect(residence).toHaveAttribute("aria-invalid", "true"))
}

describe("CF-10: «Ciudad de residencia» con el catálogo de EE. UU.", () => {
  it.each(REAL_KEYS)(
    "CF-10: con un %s, «Ciudad de residencia» tiene un <datalist> con las ciudades de GET /api/admin/catalogs/us-cities y conserva el valor guardado",
    async (key) => {
      const requests = recordRequests()
      const { residence, profile } = await setup(key)

      expect(residence.tagName).toBe("INPUT")
      expect(residence).toHaveValue(profile.residence)
      await waitForCities(residence)
      expect(cityOptions(residence)).toContain("Atlanta, GA")
      expect(requests).toContain(`GET ${PROFILE_URLS.usCities}`)
    }
  )

  it("CF-10: el catálogo se pide una sola vez, también después de guardar", async () => {
    const { user, residence, saveButton, backend } = await setup("supervisor")
    await waitForCities(residence)

    await user.clear(residence)
    await user.type(residence, "Seattle, WA")
    await user.click(saveButton)
    await findToast(SAVED_TOAST)
    // La recarga del perfil tras guardar ya llegó.
    await waitFor(() => expect(backend.calls.me).toBeGreaterThan(1))
    await act(() => new Promise((resolve) => setTimeout(resolve, 100)))

    expect(backend.calls.usCities).toBe(1)
    expect(backend.bodies.patch).toEqual([
      expect.objectContaining({ residence: "Seattle, WA" }),
    ])
  })

  it("CF-10: una ciudad que no está en la lista muestra «Elige una ciudad de la lista.» en el campo, con aria-invalid, y no hace el PATCH", async () => {
    const context = await setup("crew")

    await saveInvalidCity(context, "Medellín")

    expect(context.residence).toHaveAccessibleDescription(CITY_ERROR_PATTERN)
    // El mensaje es el de la pantalla, no el del backend: no hubo petición.
    expect(context.main).not.toHaveTextContent(CITY_SERVER_ERROR)
    expect(context.backend.bodies.patch).toEqual([])
    expect(queryToast(SAVED_TOAST)).toBeNull()
  })

  it("CF-10: lo que se escribe para buscar («Atl») no vale como ciudad hasta elegir «Atlanta, GA»", async () => {
    const context = await setup("admin")

    await saveInvalidCity(context, "Atl")

    expect(context.residence).toHaveAccessibleDescription(CITY_ERROR_PATTERN)
    expect(context.backend.bodies.patch).toEqual([])

    // Con la ciudad completa de la lista sí se guarda.
    await context.user.clear(context.residence)
    await context.user.type(context.residence, "Atlanta, GA")
    await context.user.click(context.saveButton)

    await findToast(SAVED_TOAST)
    expect(context.backend.bodies.patch).toEqual([
      expect.objectContaining({ residence: "Atlanta, GA" }),
    ])
    await waitFor(() =>
      expect(context.residence).not.toHaveAttribute("aria-invalid", "true")
    )
  })

  it("CF-10: una ciudad vacía se puede guardar", async () => {
    const { user, residence, saveButton, backend } = await setup("crew")
    await waitForCities(residence)

    await user.clear(residence)
    await user.click(saveButton)

    await findToast(SAVED_TOAST)
    expect(residence).not.toHaveAttribute("aria-invalid", "true")
    expect(backend.bodies.patch).toHaveLength(1)
    // Supuesto: vacío se envía como "" o null (el backend guarda los dos como null).
    const body = backend.bodies.patch[0] as Record<string, unknown>
    expect([null, ""]).toContain(body.residence)
    expect(backend.state.profile.residence).toBeNull()
  })

  it("CF-10: una residencia guardada que no está en la lista se muestra tal cual, y para volver a guardar hay que cambiarla", async () => {
    const legacy = "Medellín, Laureles"
    expect(US_CITIES as readonly string[]).not.toContain(legacy)
    const { user, residence, saveButton, backend } = await setup(
      "supervisor",
      realProfile("supervisor", { residence: legacy })
    )
    await waitForCities(residence)

    expect(residence).toHaveValue(legacy)
    await user.click(saveButton)

    await waitFor(() =>
      expect(residence).toHaveAttribute("aria-invalid", "true")
    )
    expect(residence).toHaveAccessibleDescription(CITY_ERROR_PATTERN)
    expect(backend.bodies.patch).toEqual([])

    await user.clear(residence)
    await user.type(residence, "Boston, MA")
    await user.click(saveButton)

    await findToast(SAVED_TOAST)
    expect(backend.bodies.patch).toEqual([
      expect.objectContaining({ residence: "Boston, MA" }),
    ])
  })
})
