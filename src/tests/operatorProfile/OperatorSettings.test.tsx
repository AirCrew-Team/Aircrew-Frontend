import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ROLES, type Role } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"
import { findToast } from "../utils/toasts"

// «Mi Perfil y Configuración» del super admin: sus datos, datos cargados, validaciones, contraseña, notificaciones, foto, guardar y cancelar.

// Llenan el formulario con userEvent: con la máquina cargada pueden pasar de 5 s.
vi.setConfig({ testTimeout: 20_000 })

type DataFn = (...args: unknown[]) => unknown

const profileData = vi.hoisted(() => ({
  calls: [] as { name: string; args: unknown[] }[],
  overrides: {} as Record<string, DataFn | undefined>,
}))

vi.mock(
  "@/modules/operatorProfile/data/operatorProfile.data",
  async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>()
    return Object.fromEntries(
      Object.entries(actual).map(([name, value]) => {
        // Las clases (ProfileFieldError) se dejan tal cual: el formulario usa instanceof.
        if (typeof value !== "function" || name === "ProfileFieldError") {
          return [name, value]
        }
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
  }
)

afterEach(() => {
  profileData.calls.length = 0
  profileData.overrides = {}
})

const fail = () => Promise.reject(new Error("servicio caído"))
const never = () => new Promise(() => {})

const lastCall = (name: string) =>
  profileData.calls.filter((call) => call.name === name).at(-1)?.args

const renderSettings = async (
  role: Role,
  options?: { applyAccept?: boolean }
) => {
  const user = userEvent.setup(options)
  useAuthStore.getState().setMockRole(role)
  renderRoute(PATHS.configuracion)
  await screen.findByRole("heading", {
    level: 1,
    name: "Mi Perfil y Configuración",
  })
  await screen.findByRole("button", { name: "Guardar Cambios" })
  return user
}

const save = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: "Guardar Cambios" }))

const switchNames = () =>
  screen.getAllByRole("switch").map((element) => ({
    name: element.getAttribute("aria-labelledby")
      ? document.getElementById(element.getAttribute("aria-labelledby")!)
          ?.textContent
      : "",
    checked: (element as HTMLInputElement).checked,
  }))

describe("Mi Perfil y Configuración: datos del super admin", () => {
  it("muestra su cargo, campo de solo lectura, teléfono y notificaciones", async () => {
    await renderSettings(ROLES.SUPER_ADMIN)

    expect(screen.getByText("Jefe de Operaciones")).toBeInTheDocument()
    expect(screen.getByText("Superadministrador • Nivel 4")).toBeInTheDocument()
    expect(screen.getByText("OPS-8842")).toBeInTheDocument()
    expect(screen.getByText("Sincronización ICAO")).toBeInTheDocument()
    const readOnlyField = screen.getByLabelText("Cargo / Departamento")
    expect(readOnlyField).toHaveValue(
      "Jefatura de Operaciones y Despacho Aéreo"
    )
    expect(readOnlyField).toHaveAttribute("readonly")
    expect(screen.getByLabelText(/^Teléfono Móvil \/ Celular/)).toBeRequired()
    // Sus notificaciones.
    expect(switchNames()).toEqual([
      { name: "Alertas de ausencias de tripulantes", checked: true },
      { name: "Reporte diario de estado de flota", checked: true },
    ])
  })

  it("las tres secciones numeradas, la credencial FAA y datos de EE. UU.", async () => {
    await renderSettings(ROLES.SUPER_ADMIN)

    expect(
      screen
        .getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent)
    ).toEqual([
      "1. Información Personal",
      "2. Seguridad y Contraseña",
      "3. Notificaciones Operacionales",
    ])
    expect(
      screen.getByRole("region", { name: "Credencial digital" })
    ).toHaveTextContent("Licencia FAA Aircraft Dispatcher")
    // Nada tiene fecha de vencimiento ni hay doble autenticación.
    expect(screen.queryByText(/vence|vencimiento/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/2FA|dos pasos/i)).not.toBeInTheDocument()
    expect(
      screen.getByRole("combobox", { name: "País del celular" })
    ).toHaveValue("US")
    expect(screen.getByText(/Atlanta Ops Hub/)).toBeInTheDocument()
  })
})

describe("Mi Perfil y Configuración: datos cargados y validación", () => {
  it("el formulario llega con los datos del perfil", async () => {
    await renderSettings(ROLES.SUPER_ADMIN)

    expect(screen.getByLabelText(/^Nombre Completo/)).toHaveValue(
      "Admin AirCrew"
    )
    expect(screen.getByLabelText(/^Correo Corporativo/)).toHaveValue(
      "admin@aircrew-ops.com"
    )
    expect(screen.getByLabelText(/^Teléfono Móvil/)).toHaveValue(
      "(404) 555-0119"
    )
    expect(screen.getByLabelText(/^País o Residencia/)).toHaveValue("ATL")
  })

  it("marca los campos obligatorios y de formato, y enfoca el primero", async () => {
    const user = await renderSettings(ROLES.SUPER_ADMIN)
    const name = screen.getByLabelText(/^Nombre Completo/)

    await user.clear(name)
    const email = screen.getByLabelText(/^Correo Corporativo/)
    await user.clear(email)
    await user.type(email, "admin@")
    await save(user)

    await waitFor(() => expect(name).toHaveFocus())
    expect(name).toHaveAccessibleDescription("Ingresa tu nombre completo.")
    expect(email).toHaveAccessibleDescription(
      "Formato no válido. Usa un correo como nombre@aircrew-ops.com."
    )
    expect(lastCall("updateOperatorProfile")).toBeUndefined()
  })

  it("el nombre de la tarjeta cambia mientras se escribe", async () => {
    const user = await renderSettings(ROLES.SUPER_ADMIN)
    const name = screen.getByLabelText(/^Nombre Completo/)

    await user.clear(name)
    await user.type(name, "Mariana Salas")

    expect(
      within(screen.getByRole("region", { name: "Perfil" })).getByText(
        "Mariana Salas"
      )
    ).toBeInTheDocument()
  })
})

describe("Mi Perfil y Configuración: contraseña", () => {
  // Abre el panel «Cambiar contraseña» y devuelve sus campos.
  const openPasswordPanel = async (
    user: ReturnType<typeof userEvent.setup>
  ) => {
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }))
    const panel = within(
      await screen.findByRole("group", { name: "Cambiar contraseña" })
    )
    return {
      panel,
      current: panel.getByLabelText("Contraseña Actual"),
      next: panel.getByLabelText("Nueva Contraseña"),
      confirm: panel.getByLabelText("Confirmar Contraseña"),
      update: panel.getByRole("button", { name: "Actualizar contraseña" }),
    }
  }

  it("cerrada, solo se ve «Cambiar contraseña»; al abrirla, los campos llegan vacíos", async () => {
    const user = await renderSettings(ROLES.SUPER_ADMIN)

    expect(screen.queryByLabelText("Contraseña Actual")).not.toBeInTheDocument()
    const { current, next, confirm } = await openPasswordPanel(user)

    // La actual nunca viene llena (el backend no la guarda en texto).
    expect(current).toHaveValue("")
    expect(next).toHaveValue("")
    expect(confirm).toHaveValue("")
    await waitFor(() => expect(current).toHaveFocus())
  })

  it("«Guardar Cambios» no cambia la contraseña", async () => {
    const user = await renderSettings(ROLES.SUPER_ADMIN)

    await save(user)

    await findToast("Perfil actualizado")
    expect(lastCall("changePassword")).toBeUndefined()
  })

  it("valida los tres campos con su propio botón", async () => {
    const user = await renderSettings(ROLES.SUPER_ADMIN)
    const { current, next, confirm, update } = await openPasswordPanel(user)

    await user.click(update)
    await waitFor(() =>
      expect(current).toHaveAccessibleDescription(
        "Ingresa tu contraseña actual."
      )
    )
    expect(next).toHaveAccessibleDescription("Ingresa la nueva contraseña.")
    expect(confirm).toHaveAccessibleDescription("Confirma la nueva contraseña.")

    await user.type(next, "corta")
    await user.type(confirm, "otra")
    await user.click(update)
    await waitFor(() =>
      expect(next).toHaveAccessibleDescription(
        "Usa al menos 8 caracteres con mayúsculas, minúsculas, números y símbolos."
      )
    )
    expect(confirm).toHaveAccessibleDescription("Las contraseñas no coinciden.")
    expect(lastCall("changePassword")).toBeUndefined()
  })

  it("muestra la fortaleza y el ojo deja ver lo escrito", async () => {
    const user = await renderSettings(ROLES.SUPER_ADMIN)
    const { panel, next } = await openPasswordPanel(user)

    await user.type(next, "abc")
    expect(panel.getByText("Débil")).toBeInTheDocument()
    await user.clear(next)
    await user.type(next, "Delta#2026ops")
    expect(panel.getByText("Fuerte (Recomendada)")).toBeInTheDocument()

    expect(next).toHaveAttribute("type", "password")
    await user.click(
      panel.getByRole("button", { name: "Mostrar nueva contraseña" })
    )
    expect(next).toHaveAttribute("type", "text")
  })

  it("si la contraseña actual no es correcta, la marca y la enfoca", async () => {
    const user = await renderSettings(ROLES.SUPER_ADMIN)
    const { current, next, confirm, update } = await openPasswordPanel(user)

    await user.type(current, "Incorrecta#1")
    await user.type(next, "Delta#2026ops")
    await user.type(confirm, "Delta#2026ops")
    await user.click(update)

    await waitFor(() =>
      expect(current).toHaveAccessibleDescription(
        "La contraseña actual no es correcta."
      )
    )
    expect(current).toHaveFocus()
    expect(lastCall("updateOperatorProfile")).toBeUndefined()
  })

  it("«Cancelar» cierra el panel sin cambiar nada", async () => {
    const user = await renderSettings(ROLES.SUPER_ADMIN)
    const { panel, current } = await openPasswordPanel(user)

    await user.type(current, "algo")
    await user.click(panel.getByRole("button", { name: "Cancelar" }))

    expect(screen.queryByLabelText("Contraseña Actual")).not.toBeInTheDocument()
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Cambiar contraseña" })
      ).toHaveFocus()
    )
    expect(lastCall("changePassword")).toBeUndefined()
  })

  it("Enter en un campo actualiza solo la contraseña, no el perfil", async () => {
    const user = await renderSettings(ROLES.SUPER_ADMIN)
    const { current, next, confirm } = await openPasswordPanel(user)

    await user.type(current, "AirCrew2026!")
    await user.type(next, "Delta#2026ops")
    await user.type(confirm, "Delta#2026ops{Enter}")

    await findToast("Contraseña actualizada")
    expect(lastCall("updateOperatorProfile")).toBeUndefined()
  })

  it("con la actual correcta, la cambia, avisa, se cierra y el último cambio pasa a «hoy»", async () => {
    const user = await renderSettings(ROLES.SUPER_ADMIN)
    const { current, next, confirm, update } = await openPasswordPanel(user)

    await user.type(current, "AirCrew2026!")
    await user.type(next, "Delta#2026ops")
    await user.type(confirm, "Delta#2026ops")
    await user.click(update)

    expect(await findToast("Contraseña actualizada")).toHaveTextContent(
      "Usa la nueva contraseña en tu próximo inicio de sesión."
    )
    expect(lastCall("changePassword")).toEqual([
      "mock-admin",
      { currentPassword: "AirCrew2026!", newPassword: "Delta#2026ops" },
    ])
    await waitFor(() =>
      expect(
        screen.queryByRole("group", { name: "Cambiar contraseña" })
      ).not.toBeInTheDocument()
    )
    expect(await screen.findByText("Último cambio: hoy")).toBeInTheDocument()
  })
})

describe("Mi Perfil y Configuración: guardar, cancelar y foto", () => {
  it("guarda contacto y notificaciones con lo que se ve en pantalla", async () => {
    const user = await renderSettings(ROLES.SUPER_ADMIN)

    await user.selectOptions(screen.getByLabelText(/^País o Residencia/), "BOS")
    await user.click(
      screen.getByRole("switch", {
        name: "Reporte diario de estado de flota",
      })
    )
    await save(user)

    expect(await findToast("Perfil actualizado")).toHaveTextContent(
      "Los cambios ya están vigentes en toda la consola AirCrew."
    )
    expect(lastCall("updateOperatorProfile")).toEqual([
      "mock-admin",
      expect.objectContaining({
        residence: "BOS",
        phone: "+14045550119",
        notifications: {
          crewAbsences: true,
          fleetReport: false,
        },
        photo: undefined,
      }),
    ])
  })

  it("«Cancelar» vuelve a lo último guardado", async () => {
    const user = await renderSettings(ROLES.SUPER_ADMIN)
    const name = screen.getByLabelText(/^Nombre Completo/)

    await user.clear(name)
    await user.type(name, "Otro Nombre")
    await user.click(screen.getByRole("button", { name: "Cancelar" }))

    expect(name).toHaveValue("Admin AirCrew")
  })

  it("la foto acepta imágenes de hasta 2 MB y se puede quitar", async () => {
    const user = await renderSettings(ROLES.SUPER_ADMIN, { applyAccept: false })
    const perfil = within(screen.getByRole("region", { name: "Perfil" }))

    await user.upload(
      perfil.getByLabelText("Subir Foto"),
      new File(["x"], "notas.pdf", { type: "application/pdf" })
    )
    expect(
      await perfil.findByText(
        "Formato no válido. Sube una imagen PNG, JPG o WEBP."
      )
    ).toBeInTheDocument()

    // jsdom no crea vistas previas: se comprueba que la foto quedó elegida al guardar.
    await user.upload(
      perfil.getByLabelText("Subir Foto"),
      new File(["png"], "foto.png", { type: "image/png" })
    )
    expect(perfil.queryByRole("alert")).not.toBeInTheDocument()
    await save(user)
    await findToast("Perfil actualizado")
    const [, input] = lastCall("updateOperatorProfile") ?? []
    expect((input as { photo?: File }).photo?.name).toBe("foto.png")
  })
})

describe("Mi Perfil y Configuración: estados de datos", () => {
  it("mientras carga muestra «Cargando perfil…»", async () => {
    profileData.overrides.getOperatorProfile = never
    useAuthStore.getState().setMockRole(ROLES.SUPER_ADMIN)
    renderRoute(PATHS.configuracion)

    expect(await screen.findByText("Cargando perfil…")).toHaveAttribute(
      "role",
      "status"
    )
  })

  it("si el perfil falla, avisa sin formulario", async () => {
    profileData.overrides.getOperatorProfile = fail
    useAuthStore.getState().setMockRole(ROLES.SUPER_ADMIN)
    renderRoute(PATHS.configuracion)

    expect(
      await screen.findByText("No se pudo cargar el perfil.")
    ).toHaveAttribute("role", "alert")
    expect(
      screen.queryByRole("button", { name: "Guardar Cambios" })
    ).not.toBeInTheDocument()
  })

  it("si guardar falla, avisa sin perder lo escrito", async () => {
    profileData.overrides.updateOperatorProfile = fail
    const user = await renderSettings(ROLES.SUPER_ADMIN)
    const name = screen.getByLabelText(/^Nombre Completo/)

    await user.clear(name)
    await user.type(name, "Nuevo Nombre")
    await save(user)

    expect(
      await screen.findByText("No se pudo guardar el perfil. Intenta de nuevo.")
    ).toHaveAttribute("role", "alert")
    expect(name).toHaveValue("Nuevo Nombre")
  })
})
