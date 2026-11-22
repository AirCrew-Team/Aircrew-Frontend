import { waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { describe, expect, it, vi } from "vitest"

import { errorBody } from "../mocks/authApi"
import {
  CITY_SERVER_ERROR,
  PROFILE_URLS,
  REAL_ACCOUNTS,
  realProfile,
  SUPERVISOR_EMPLOYMENT,
  type EmploymentBody,
  type RealAccountKey,
} from "../mocks/profileApi"
import { findToast, queryToast } from "../utils/toasts"
import {
  BLOCK,
  CITY_ERROR,
  FIELD,
  findLoadedMain,
  getSectionByHeading,
  openRealSession,
  readableText,
  SAVE,
  SAVED_TOAST,
  waitForCities,
} from "./profileTestUtils"

// Revisión de la ampliación A de configuracion-real:
// - I1: con el catálogo de ciudades caído, el 400 del backend por la ciudad acaba en el
//   campo («Elige una ciudad de la lista.») y no en el aviso general; el campo avisa de
//   que no se pudo cargar la lista.
// - M2: la ciudad se compara sin distinguir mayúsculas y queda con la forma del catálogo.
// - M3: textos de respaldo de «Información laboral» del supervisor.

vi.setConfig({ testTimeout: 20_000 })

const escape = (text: string) =>
  new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))

const CITIES_FAILED_HELP = "No se pudo cargar la lista de ciudades."
const GENERIC_SAVE_ERROR = "No se pudieron guardar los cambios."

const citiesDown = () =>
  http.get(PROFILE_URLS.usCities, () =>
    HttpResponse.json(errorBody("Error interno"), { status: 500 })
  )

const setup = async (
  key: RealAccountKey,
  options: Parameters<typeof openRealSession>[1] = {}
) => {
  const user = userEvent.setup()
  const session = openRealSession(key, options)
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

describe("Revisión I1: catálogo de ciudades caído", () => {
  it("I1: con us-cities en 500, la residencia muestra la ayuda «No se pudo cargar la lista de ciudades.»", async () => {
    const { residence } = await setup("supervisor", { first: [citiesDown()] })

    await waitFor(() =>
      expect(residence).toHaveAccessibleDescription(escape(CITIES_FAILED_HELP))
    )
  })

  it("I1: con us-cities en 500, una ciudad que rechaza el backend muestra «Elige una ciudad de la lista.» en el campo, con aria-invalid y sin el aviso general", async () => {
    const { user, main, residence, saveButton, backend } = await setup(
      "supervisor",
      { first: [citiesDown()] }
    )

    await user.clear(residence)
    await user.type(residence, "Medellín")
    await user.click(saveButton)

    await waitFor(() =>
      expect(residence).toHaveAttribute("aria-invalid", "true")
    )
    expect(residence).toHaveAccessibleDescription(escape(CITY_ERROR))
    // Sin aviso general, el foco lleva al lector de pantalla hasta el error.
    expect(residence).toHaveFocus()
    // Sin catálogo no se valida en la pantalla: el PATCH llegó al backend.
    expect(backend.bodies.patch).toEqual([
      expect.objectContaining({ residence: "Medellín" }),
    ])
    expect(main).not.toHaveTextContent(GENERIC_SAVE_ERROR)
    expect(main).not.toHaveTextContent(CITY_SERVER_ERROR)
    expect(within(main).queryByRole("alert")).toBeNull()
    expect(queryToast(SAVED_TOAST)).toBeNull()
  })
})

describe("Revisión M2: ciudad sin distinguir mayúsculas", () => {
  it("M2: «atlanta, ga» se guarda y el campo queda en «Atlanta, GA»", async () => {
    const { user, residence, saveButton, backend } = await setup("admin")
    await waitForCities(residence)

    await user.clear(residence)
    await user.type(residence, "atlanta, ga")
    await user.click(saveButton)

    await findToast(SAVED_TOAST)
    await waitFor(() => expect(residence).toHaveValue("Atlanta, GA"))
    expect(residence).not.toHaveAttribute("aria-invalid", "true")
    expect(backend.state.profile.residence).toBe("Atlanta, GA")
  })
})

describe("Revisión M3: respaldos de «Información laboral» del supervisor", () => {
  const openSupervisor = async (employment: Partial<EmploymentBody>) => {
    openRealSession("supervisor", {
      profile: realProfile("supervisor", {
        employment: { ...SUPERVISOR_EMPLOYMENT, ...employment },
      }),
    })
    const main = await findLoadedMain(REAL_ACCOUNTS.supervisor.email)
    return getSectionByHeading(main, BLOCK.employment)
  }

  it("M3: con operational_status null, «Estado operativo» dice «Sin estado asignado»", async () => {
    const section = await openSupervisor({ operational_status: null })

    expect(readableText(section)).toMatch(
      /Estado operativo\W*Sin estado asignado/
    )
  })

  it("M3: un turno desconocido que coincide con una propiedad heredada («toString») se muestra tal cual", async () => {
    const section = await openSupervisor({
      shift: "toString" as unknown as EmploymentBody["shift"],
    })

    expect(readableText(section)).toMatch(/Turno\W*toString/)
  })
})
