import { waitFor, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { recordRequests } from "../mocks/absencesApi"
import {
  REAL_ACCOUNTS,
  realProfile,
  SUPERVISOR_EMPLOYMENT,
  type EmploymentBody,
} from "../mocks/profileApi"
import {
  BLOCK,
  EMPLOYMENT_NOTE,
  findLoadedMain,
  getSectionByHeading,
  openRealSession,
  querySectionByHeading,
  readableText,
  SUPERVISOR_EMPLOYMENT_NOTE,
} from "./profileTestUtils"

// Spec configuracion-real, ampliación A1 (CF-09): el supervisor real ve «Información
// laboral» en solo lectura con los datos de `employment` de GET /api/admin/users/me
// (código, base «Ciudad (IATA)», turno y estado operativo) y la nota del administrador.
// Sin datos asignados, los textos de respaldo. El admin (employment: null) no tiene el
// bloque. El tripulante conserva el suyo, sacado de crew.

vi.setConfig({ testTimeout: 20_000 })

const openSupervisor = async (employment: Partial<EmploymentBody> = {}) => {
  const requests = recordRequests()
  openRealSession("supervisor", {
    profile: realProfile("supervisor", {
      employment: { ...SUPERVISOR_EMPLOYMENT, ...employment },
    }),
  })
  const main = await findLoadedMain(REAL_ACCOUNTS.supervisor.email)
  const section = getSectionByHeading(main, BLOCK.employment)
  return { requests, main, section }
}

describe("CF-09: «Información laboral» del supervisor", () => {
  it("CF-09: el supervisor real ve su código, su base «Atlanta (ATL)», su turno, su estado y la nota «La gestiona un administrador; pídele los cambios.», sin pedir crew-members/me", async () => {
    const { requests, section } = await openSupervisor()

    // Supuesto: cada etiqueta va antes de su valor (texto o input de solo lectura).
    await waitFor(() =>
      expect(readableText(section)).toMatch(/Código de empleado\W*SUP-001/)
    )
    expect(readableText(section)).toMatch(/Base\W*Atlanta \(ATL\)/)
    expect(readableText(section)).toMatch(/Turno\W*Mañana/)
    expect(readableText(section)).toMatch(/Estado operativo\W*En turno/)
    expect(section).toHaveTextContent(SUPERVISOR_EMPLOYMENT_NOTE)
    // No es el bloque del tripulante.
    expect(section).not.toHaveTextContent(EMPLOYMENT_NOTE)
    expect(section).not.toHaveTextContent(/Cargo/)
    expect(section).not.toHaveTextContent(/Registrado en tripulación/)
    // Solo lectura: ningún campo del bloque se puede editar.
    for (const field of within(section).queryAllByRole("textbox")) {
      expect(
        field.hasAttribute("readonly") || field.hasAttribute("disabled"),
        "campo de solo lectura"
      ).toBe(true)
    }
    expect(requests.filter((r) => r.includes("crew-members"))).toEqual([])
  })

  // Formato «Ciudad (IATA)» con el nombre de la spec. JFK y LGA quedan fuera: la spec
  // las llama «Nueva York (JFK)» y «Nueva York (LaGuardia)» y el formato no está fijado.
  it.each([
    ["ATL", "Atlanta (ATL)"],
    ["BOS", "Boston (BOS)"],
    ["LAX", "Los Ángeles (LAX)"],
    ["SLC", "Salt Lake City (SLC)"],
  ])("CF-09: con base «%s», «Base» dice «%s»", async (base, label) => {
    const { section } = await openSupervisor({ base })

    await waitFor(() =>
      expect(readableText(section)).toMatch(
        new RegExp(`Base\\W*${label.replace(/[()]/g, "\\$&")}`)
      )
    )
  })

  it.each([
    ["morning", "Mañana"],
    ["afternoon", "Tarde"],
    ["night", "Noche"],
  ] as const)(
    "CF-09: con turno «%s», «Turno» dice «%s»",
    async (shift, label) => {
      const { section } = await openSupervisor({ shift })

      await waitFor(() =>
        expect(readableText(section)).toMatch(new RegExp(`Turno\\W*${label}`))
      )
    }
  )

  it.each([
    ["available", "Disponible"],
    ["on_duty", "En turno"],
    ["off_duty", "Fuera de turno"],
    ["leave", "De licencia"],
  ] as const)(
    "CF-09: con estado operativo «%s», «Estado operativo» dice «%s»",
    async (operational_status, label) => {
      const { section } = await openSupervisor({ operational_status })

      await waitFor(() =>
        expect(readableText(section)).toMatch(
          new RegExp(`Estado operativo\\W*${label}`)
        )
      )
    }
  )

  it("CF-09: sin código, base ni turno asignados, se ven «Sin código asignado», «Sin base asignada» y «Sin turno asignado»", async () => {
    const { section } = await openSupervisor({
      employee_code: null,
      base: null,
      shift: null,
      operational_status: "available",
    })

    await waitFor(() =>
      expect(readableText(section)).toMatch(
        /Código de empleado\W*Sin código asignado/
      )
    )
    expect(readableText(section)).toMatch(/Base\W*Sin base asignada/)
    expect(readableText(section)).toMatch(/Turno\W*Sin turno asignado/)
    expect(readableText(section)).toMatch(/Estado operativo\W*Disponible/)
    expect(section).toHaveTextContent(SUPERVISOR_EMPLOYMENT_NOTE)
  })

  it("CF-09: el admin (employment: null) no ve «Información laboral» ni datos laborales", async () => {
    openRealSession("admin")

    const main = await findLoadedMain(REAL_ACCOUNTS.admin.email)
    // Ancla: la pantalla con datos ya está.
    getSectionByHeading(main, BLOCK.security)

    expect(querySectionByHeading(main, BLOCK.employment) ?? null).toBeNull()
    expect(within(main).queryByText(/Información laboral/)).toBeNull()
    expect(main).not.toHaveTextContent(/Código de empleado/)
    expect(main).not.toHaveTextContent(SUPERVISOR_EMPLOYMENT_NOTE)
  })

  it("CF-09: el tripulante conserva su «Información laboral» de crew, con la nota del supervisor y sin la del administrador", async () => {
    openRealSession("crew")

    const main = await findLoadedMain(REAL_ACCOUNTS.crew.email)
    const section = getSectionByHeading(main, BLOCK.employment)

    await waitFor(() =>
      expect(readableText(section)).toMatch(/Código de empleado\W*EMP-100/)
    )
    expect(section).toHaveTextContent(EMPLOYMENT_NOTE)
    expect(section).not.toHaveTextContent(SUPERVISOR_EMPLOYMENT_NOTE)
    expect(section).not.toHaveTextContent(/Turno/)
  })
})
