import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ROLES, type Role } from "@/App/types/auth.types"
import { useAuthStore } from "@/stores/auth.store"

import { recordRequests } from "../mocks/absencesApi"
import { renderRoute } from "../utils/renderRoute"
import { queryAllToasts } from "../utils/toasts"
import {
  BLOCK,
  CONFIGURACION_PATH,
  DEMO_NOTICE,
  FIELD,
  getIdentityCard,
  getSectionByHeading,
  H1,
  INVENTED_TEXTS,
  isDisabled,
  SAVE,
  SWITCH,
} from "./profileTestUtils"

// Spec configuracion-real, CF-07 («Cuentas demo»): sin backend. La misma pantalla con
// el nombre y el rol del auth store, el aviso fijo de demostración, todo deshabilitado,
// ninguna petición y ningún dato inventado.

vi.setConfig({ testTimeout: 20_000 })

const DEMO = [
  {
    role: ROLES.TRIPULANTE,
    label: "Tripulante",
    switches: [SWITCH.replacement],
  },
  {
    role: ROLES.SUPER_VISOR,
    label: "Supervisor",
    switches: [SWITCH.reported, SWITCH.covered],
  },
  // Ampliación B (CF-13): el admin no tiene notificaciones.
  {
    role: ROLES.SUPER_ADMIN,
    label: "Administrador",
    switches: [],
  },
] satisfies { role: Role; label: string; switches: string[] }[]

// Datos de ejemplo de las pantallas anteriores (profile.data y operatorProfile).
const OLD_EXAMPLE_DATA = [
  "aircrew-ops.com",
  "AC-2287",
  "AC-0412",
  "AC-0001",
  "El Dorado",
  "310 445 8899",
  "315 220 1478",
  "300 118 9032",
  "Fontibón",
  "Canal 1",
] as const

const openDemo = async (role: Role) => {
  const requests = recordRequests()
  useAuthStore.getState().setMockRole(role)
  renderRoute(CONFIGURACION_PATH)
  const main = await screen.findByRole("main")
  await within(main).findByRole("heading", { level: 1, name: H1 })
  // Ancla de todos los negativos: el aviso de demostración ya está (como texto del
  // contenido, aunque vaya partido en varios elementos).
  await waitFor(() => expect(main).toHaveTextContent(DEMO_NOTICE))
  const fullName = useAuthStore.getState().user?.fullName ?? ""
  return { requests, main, fullName }
}

describe("CF-07: cuentas demo", () => {
  it.each(DEMO)(
    "CF-07: con el $label demo aparece el aviso de demostración, con su nombre y su rol del store",
    async ({ role, label }) => {
      const { main, fullName } = await openDemo(role)

      const card = getIdentityCard(main, fullName)
      expect(within(card).getByText(label)).toBeInTheDocument()
      // El aviso es un estado fijo, no una región viva.
      const liveRegions = Array.from(
        main.querySelectorAll('[role="status"], [role="alert"], [aria-live]')
      )
      expect(
        liveRegions.filter((region) =>
          region.textContent?.includes("Cuenta de demostración")
        )
      ).toEqual([])
    }
  )

  it.each(DEMO)(
    "CF-07: con el $label demo, los campos, los interruptores, la foto, «Guardar cambios» y «Cambiar contraseña» están deshabilitados",
    async ({ role, switches }) => {
      const { main } = await openDemo(role)
      const contact = getSectionByHeading(main, BLOCK.contact)
      const security = getSectionByHeading(main, BLOCK.security)

      expect(isDisabled(within(contact).getByLabelText(FIELD.phone))).toBe(true)
      expect(isDisabled(within(contact).getByLabelText(FIELD.residence))).toBe(
        true
      )
      for (const name of switches) {
        const notifications = getSectionByHeading(main, BLOCK.notifications)
        expect(
          isDisabled(within(notifications).getByRole("switch", { name })),
          `«${name}» deshabilitado`
        ).toBe(true)
      }
      expect(isDisabled(within(main).getByLabelText(/^Subir foto/))).toBe(true)
      expect(isDisabled(within(main).getByRole("button", { name: SAVE }))).toBe(
        true
      )
      expect(
        isDisabled(
          within(security).getByRole("button", { name: "Cambiar contraseña" })
        )
      ).toBe(true)
    }
  )

  it.each(DEMO)(
    "CF-07: con el $label demo no se hace ninguna petición, ni al pulsar «Guardar cambios» o «Cambiar contraseña»",
    async ({ role }) => {
      const user = userEvent.setup()
      const { requests, main } = await openDemo(role)
      const security = getSectionByHeading(main, BLOCK.security)

      await user.click(within(main).getByRole("button", { name: SAVE }))
      await user.click(
        within(security).getByRole("button", { name: "Cambiar contraseña" })
      )
      // Margen para que una petición o un toast llegaran.
      await new Promise((resolve) => setTimeout(resolve, 300))

      expect(requests).toEqual([])
      expect(queryAllToasts()).toEqual([])
      expect(
        within(security).queryByRole("group", { name: /Cambiar contraseña/i })
      ).toBeNull()
    }
  )

  it.each(DEMO)(
    "CF-07: con el $label demo no aparece ningún dato inventado: campos vacíos, sin «hace N días» ni textos de ejemplo",
    async ({ role }) => {
      const { main } = await openDemo(role)

      for (const field of within(main).queryAllByRole("textbox")) {
        expect(field, "sin datos inventados en los campos").toHaveValue("")
      }
      expect(within(main).getByLabelText(FIELD.email)).toHaveValue("")
      // Con list (A2) la residencia es un combobox: el bucle de textbox no la cubre.
      expect(within(main).getByLabelText(FIELD.residence)).toHaveValue("")
      expect(main.textContent).not.toMatch(/hace \d+ días/)
      for (const text of [...INVENTED_TEXTS, ...OLD_EXAMPLE_DATA]) {
        expect(main.textContent, `no debe aparecer «${text}»`).not.toContain(
          text
        )
      }
    }
  )
})

// Ampliación B de la spec (CF-13): la cuenta demo del admin tampoco tiene notificaciones.
describe("CF-13: el admin demo no tiene notificaciones", () => {
  it("CF-13: con el Administrador demo no aparece «Notificaciones», ni interruptores, y Seguridad es «2. Seguridad»", async () => {
    const { main } = await openDemo(ROLES.SUPER_ADMIN)

    expect(
      within(main).queryByRole("heading", { name: BLOCK.notifications })
    ).toBeNull()
    expect(within(main).queryAllByRole("switch")).toEqual([])
    expect(main).not.toHaveTextContent(/notificaci/i)
    expect(
      within(main).getByRole("heading", { level: 2, name: "2. Seguridad" })
    ).toBeInTheDocument()
  })
})
