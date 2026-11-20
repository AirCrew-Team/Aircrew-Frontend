import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { recordRequests } from "../mocks/absencesApi"
import {
  crewMemberErrorHandler,
  crewMemberHandler,
  daysAgoIso,
  LAST_CHANGE_DAYS,
  PROFILE_URLS,
  REAL_ACCOUNTS,
  REAL_CREW_MEMBER,
  realProfile,
} from "../mocks/profileApi"
import { findToast } from "../utils/toasts"
import {
  BLOCK,
  compact,
  EMAIL_NOTE,
  EMPLOYMENT_NOTE,
  FIELD,
  findLoadedMain,
  getIdentityCard,
  getSectionByHeading,
  H1,
  INVENTED_TEXTS,
  NON_CREW_KEYS,
  NOTIFICATIONS_NOTE,
  openRealSession,
  readableText,
  REAL_KEYS,
  ROLE_LABEL,
  SAVE,
  SAVED_TOAST,
  SWITCH,
  textWithout,
  waitForCities,
} from "./profileTestUtils"

// Spec configuracion-real, CF-01, CF-02 y CF-06: los tres roles con sesión real ven la
// misma pantalla con los datos de GET /api/admin/users/me (y, el tripulante, los de
// GET /api/crew/crew-members/me). El backend falso de mocks/profileApi guarda estado.

// Con la máquina cargada, montar la ruta lazy y escribir puede pasar de 5 s.
vi.setConfig({ testTimeout: 20_000 })

describe("CF-01: datos reales de la cuenta en los tres roles", () => {
  it.each(REAL_KEYS)(
    "CF-01: con un %s real se ven el h1, la tarjeta (nombre, rol, «Cuenta activa», «En AirCrew desde»), Contacto y Seguridad con sus datos reales",
    async (key) => {
      const { user, profile } = openRealSession(key)

      const main = await findLoadedMain(REAL_ACCOUNTS[key].email)

      expect(
        within(main).getAllByRole("heading", { level: 1, name: H1 })
      ).toHaveLength(1)

      // Tarjeta de identidad: nombre completo, etiqueta del rol (texto exacto: «Super
      // Administrador» del store y la nota del correo también contienen la palabra),
      // estado y fecha de alta (users.created_at = 15 de marzo de 2026).
      const card = getIdentityCard(main, user.fullName)
      expect(within(card).getByText(ROLE_LABEL[key])).toBeInTheDocument()
      expect(card).toHaveTextContent("Cuenta activa")
      // Supuesto: el mes va en español y en minúscula o mayúscula, con o sin «de».
      expect(card.textContent).toMatch(
        /En AirCrew desde\s+marzo\s+(de\s+)?2026/i
      )

      // Contacto: celular (se compara sin espacios), correo de solo lectura con su nota
      // y residencia.
      const contact = getSectionByHeading(main, BLOCK.contact)
      const phone = within(contact).getByLabelText(FIELD.phone)
      expect(compact((phone as HTMLInputElement).value)).toBe(profile.phone)
      const email = within(contact).getByLabelText(FIELD.email)
      expect(email).toHaveValue(REAL_ACCOUNTS[key].email)
      expect(email).toHaveAttribute("readonly")
      expect(contact).toHaveTextContent(EMAIL_NOTE)
      expect(within(contact).getByLabelText(FIELD.residence)).toHaveValue(
        profile.residence
      )

      // Seguridad: último cambio de contraseña (hace 10 días exactos).
      const security = getSectionByHeading(main, BLOCK.security)
      expect(security.textContent).toMatch(
        new RegExp(
          `Último cambio de contraseña:\\s*hace ${LAST_CHANGE_DAYS} días`
        )
      )
    }
  )

  it.each(REAL_KEYS)(
    "CF-01: con un %s real no aparece ningún texto inventado (FDP, Atlanta, FAA, SMS, RAC 121, Turno), salvo la base y el turno reales del supervisor en su «Información laboral» (CF-09)",
    async (key) => {
      openRealSession(key)

      const main = await findLoadedMain(REAL_ACCOUNTS[key].email)
      // Ancla: la pantalla nueva ya está (si no, la ausencia pasaría en vacío).
      getSectionByHeading(main, BLOCK.security)

      // Ampliación A: el supervisor tiene «Turno» y «Atlanta (ATL)» reales en su bloque
      // laboral. Ahí se revisan los demás textos inventados; fuera de él, todos.
      const employment =
        key === "supervisor"
          ? getSectionByHeading(main, BLOCK.employment)
          : null
      const outside = textWithout(main, [employment])
      for (const text of INVENTED_TEXTS) {
        expect(outside, `no debe aparecer «${text}»`).not.toContain(text)
      }
      if (employment) {
        const inside = textWithout(employment)
        for (const text of INVENTED_TEXTS) {
          if (text === "Turno" || text === "Atlanta") continue
          expect(inside, `no debe aparecer «${text}»`).not.toContain(text)
        }
      }
    }
  )

  it("CF-01: con el último cambio de contraseña de hoy, Seguridad dice «Último cambio de contraseña: hoy»", async () => {
    openRealSession("supervisor", {
      profile: realProfile("supervisor", {
        password_changed_at: daysAgoIso(0),
      }),
    })

    const main = await findLoadedMain(REAL_ACCOUNTS.supervisor.email)

    expect(getSectionByHeading(main, BLOCK.security).textContent).toMatch(
      /Último cambio de contraseña:\s*hoy/
    )
  })

  it("CF-01: sin password_changed_at, Seguridad dice «Sin registro»", async () => {
    openRealSession("admin", {
      profile: realProfile("admin", { password_changed_at: null }),
    })

    const main = await findLoadedMain(REAL_ACCOUNTS.admin.email)

    const security = getSectionByHeading(main, BLOCK.security)
    expect(security).toHaveTextContent("Sin registro")
    expect(security).not.toHaveTextContent(/hace \d+ días/)
  })
})

describe("CF-02: bloques propios de cada rol", () => {
  it("CF-02: el tripulante ve «Información laboral» con los datos de crew-members/me y la nota del supervisor", async () => {
    openRealSession("crew")

    const main = await findLoadedMain(REAL_ACCOUNTS.crew.email)
    const employment = getSectionByHeading(main, BLOCK.employment)

    // Supuesto: cada etiqueta va antes de su valor en el orden del documento (como texto
    // o en un input de solo lectura; readableText admite los dos).
    await waitFor(() =>
      expect(readableText(employment)).toMatch(/Código de empleado\W*EMP-100/)
    )
    expect(readableText(employment)).toMatch(/Cargo\W*Auxiliar de vuelo/)
    expect(readableText(employment)).toMatch(/Base\W*MDE/)
    expect(readableText(employment)).toMatch(/Estado operativo\W*En servicio/)
    // Supuesto: la fecha de alta en crew (18 nov 2026) lleva al menos el año.
    expect(readableText(employment)).toMatch(
      /Registrado en tripulación desde\s*\S.*2026/
    )
    expect(employment).toHaveTextContent(EMPLOYMENT_NOTE)
    // Solo lectura: ningún campo del bloque se puede editar.
    for (const field of within(employment).queryAllByRole("textbox")) {
      expect(
        field.hasAttribute("readonly") || field.hasAttribute("disabled"),
        "campo de solo lectura"
      ).toBe(true)
    }
  })

  it.each([
    ["available", "Disponible"],
    ["on_duty", "En servicio"],
    ["in_flight", "En vuelo"],
    ["medical_leave", "Incapacidad médica"],
  ])(
    "CF-02: con status «%s», «Estado operativo» dice «%s»",
    async (status, label) => {
      openRealSession("crew", {
        crew: [crewMemberHandler({ ...REAL_CREW_MEMBER, status })],
      })

      const main = await findLoadedMain(REAL_ACCOUNTS.crew.email)
      const employment = getSectionByHeading(main, BLOCK.employment)

      await waitFor(() =>
        expect(readableText(employment)).toMatch(
          new RegExp(`Estado operativo\\W*${label}`)
        )
      )
    }
  )

  it("CF-02: sin current_location, «Base» dice «Sin base asignada»", async () => {
    openRealSession("crew", {
      crew: [
        crewMemberHandler({ ...REAL_CREW_MEMBER, current_location: null }),
      ],
    })

    const main = await findLoadedMain(REAL_ACCOUNTS.crew.email)
    const employment = getSectionByHeading(main, BLOCK.employment)

    await waitFor(() =>
      expect(readableText(employment)).toMatch(/Base\W*Sin base asignada/)
    )
  })

  it("CF-02: el tripulante tiene en «Notificaciones» solo «Asignación de reemplazo», con el valor del servidor y la nota fija, sin SMS ni Push", async () => {
    openRealSession("crew")

    const main = await findLoadedMain(REAL_ACCOUNTS.crew.email)
    const notifications = getSectionByHeading(main, BLOCK.notifications)

    const switches = within(notifications).getAllByRole("switch")
    expect(switches).toHaveLength(1)
    const replacement = within(notifications).getByRole("switch", {
      name: SWITCH.replacement,
    })
    // replacement_assigned: false en el perfil inicial.
    expect(replacement).not.toBeChecked()
    expect(
      within(main).queryByRole("switch", { name: SWITCH.reported })
    ).toBeNull()
    expect(
      within(main).queryByRole("switch", { name: SWITCH.covered })
    ).toBeNull()
    expect(notifications).toHaveTextContent(NOTIFICATIONS_NOTE)
    expect(notifications.textContent).not.toMatch(/SMS|Push/)
  })

  // Ampliación A (CF-09): el supervisor sí tiene «Información laboral», con sus datos de
  // la cuenta. Que el admin no la ve se comprueba en ConfiguracionLaboral.test.tsx.
  // Ampliación B (CF-13): solo el supervisor tiene estos dos interruptores; el admin no
  // tiene «Notificaciones» (se comprueba abajo, en CF-13).
  it("CF-02: el supervisor ve «Nuevas ausencias reportadas» y «Ausencias cubiertas» con los valores del servidor", async () => {
    openRealSession("supervisor")

    const main = await findLoadedMain(REAL_ACCOUNTS.supervisor.email)
    const notifications = getSectionByHeading(main, BLOCK.notifications)

    // absence_reported: true y absence_covered: false en el perfil inicial.
    expect(
      within(notifications).getByRole("switch", { name: SWITCH.reported })
    ).toBeChecked()
    expect(
      within(notifications).getByRole("switch", { name: SWITCH.covered })
    ).not.toBeChecked()
    expect(within(notifications).getAllByRole("switch")).toHaveLength(2)
    expect(
      within(main).queryByRole("switch", { name: SWITCH.replacement })
    ).toBeNull()
    expect(notifications).toHaveTextContent(NOTIFICATIONS_NOTE)
    expect(notifications.textContent).not.toMatch(/SMS|Push/)
  })

  it.each(NON_CREW_KEYS)(
    "CF-02: el %s no ve los datos de crew y no pide crew-members/me",
    async (key) => {
      const requests = recordRequests()
      openRealSession(key)

      const main = await findLoadedMain(REAL_ACCOUNTS[key].email)

      expect(main).not.toHaveTextContent(EMPLOYMENT_NOTE)
      expect(main).not.toHaveTextContent(REAL_CREW_MEMBER.employee_code)
      expect(main).not.toHaveTextContent(/Registrado en tripulación desde/)
      expect(requests.filter((r) => r.includes("crew-members"))).toEqual([])
      expect(requests).toContain(`GET ${PROFILE_URLS.me}`)
    }
  )
})

// Ampliación B de la spec (CF-13): el admin no tiene «Notificaciones» y Seguridad pasa a
// ser el bloque 2. El supervisor y el tripulante no cambian.
describe("CF-13: el admin no tiene notificaciones", () => {
  it("CF-13: el admin real no ve «Notificaciones» ni ningún interruptor, ni menciona las notificaciones", async () => {
    openRealSession("admin")

    const main = await findLoadedMain(REAL_ACCOUNTS.admin.email)

    expect(
      within(main).queryByRole("heading", { name: BLOCK.notifications })
    ).toBeNull()
    expect(within(main).queryAllByRole("switch")).toEqual([])
    expect(main).not.toHaveTextContent(/notificaci/i)
  })

  it.each([
    {
      key: "admin",
      headings: ["1. Contacto", "2. Seguridad"],
    },
    {
      key: "supervisor",
      headings: [
        "1. Contacto",
        "2. Información laboral",
        "3. Notificaciones",
        "4. Seguridad",
      ],
    },
    {
      key: "crew",
      headings: [
        "1. Contacto",
        "2. Información laboral",
        "3. Notificaciones",
        "4. Seguridad",
      ],
    },
  ] as const)(
    "CF-13: con el $key, los bloques van numerados $headings",
    async ({ key, headings }) => {
      openRealSession(key)

      const main = await findLoadedMain(REAL_ACCOUNTS[key].email)

      for (const name of headings) {
        expect(
          within(main).getByRole("heading", { level: 2, name })
        ).toBeInTheDocument()
      }
    }
  )
})

describe("CF-06: crew falla", () => {
  it("CF-06: si crew-members/me responde 500, el error aparece dentro de «Información laboral» y el resto de la pantalla carga y guarda", async () => {
    const { backend } = openRealSession("crew", {
      crew: [crewMemberErrorHandler()],
    })
    const user = userEvent.setup()

    const main = await findLoadedMain(REAL_ACCOUNTS.crew.email)
    const employment = getSectionByHeading(main, BLOCK.employment)

    expect(await within(employment).findByRole("alert")).toBeInTheDocument()
    expect(readableText(employment)).not.toMatch(/EMP-100/)
    // Los demás bloques no muestran el error.
    const contact = getSectionByHeading(main, BLOCK.contact)
    expect(within(contact).queryByRole("alert")).toBeNull()
    expect(
      within(getSectionByHeading(main, BLOCK.security)).queryByRole("alert")
    ).toBeNull()
    expect(
      within(getSectionByHeading(main, BLOCK.notifications)).getByRole(
        "switch",
        { name: SWITCH.replacement }
      )
    ).toBeInTheDocument()

    // El formulario sigue funcionando (con una ciudad del catálogo, A2).
    const residence = within(contact).getByLabelText(FIELD.residence)
    await waitForCities(residence)
    await user.clear(residence)
    await user.type(residence, "Detroit, MI")
    await user.click(within(main).getByRole("button", { name: SAVE }))

    await findToast(SAVED_TOAST)
    expect(backend.bodies.patch).toHaveLength(1)
    expect(backend.bodies.patch[0]).toMatchObject({ residence: "Detroit, MI" })
    expect(
      screen.queryByRole("heading", { name: /Página no encontrada/ })
    ).toBeNull()
  })
})
