import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ROLES, type Role } from "@/App/types/auth.types"
import { useAuthStore } from "@/stores/auth.store"

import { toastDescription } from "../utils/toasts"
import {
  alertsWithText,
  findLoadedMain,
  findSuccessToast,
  getSectionByHeading,
  querySuccessToast,
  renderConfiguracion,
  SUCCESS_DETAIL,
} from "./profileTestUtils"

// Subir y quitar la foto en la Configuración del tripulante y del supervisor, igual que el
// admin (spec configuracion-tripulante-supervisor, «Ampliación», CF-01 a CF-06; CF-07 es
// ejecutar src/tests/operatorProfile sin tocarlo).
// jsdom no tiene URL.createObjectURL: tras subir un archivo válido no hay vista previa (siguen
// las iniciales y «Quitar» sigue deshabilitado). La foto elegida se comprueba por la llamada a
// updateProfilePhoto; la imagen, solo con un photoUrl guardado (CF-04).

// Suben archivos y escriben con userEvent: con la máquina cargada pueden pasar de 5 s.
vi.setConfig({ testTimeout: 20_000 })

type DataFn = (...args: unknown[]) => unknown

// Cada función de profile.data.ts se envuelve para registrar sus llamadas (nombre y argumentos),
// como en ConfiguracionPage.password.test.tsx. Sin override, delega en la función real.
// En rojo updateProfilePhoto no existe: su override no tiene efecto y el test cae antes.
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

afterEach(() => {
  profileData.calls.length = 0
  profileData.overrides = {}
})

const callsOf = (name: string) =>
  profileData.calls.filter((call) => call.name === name)

const photoCalls = () => callsOf("updateProfilePhoto").map(({ args }) => args)

// Ancla: sin la función, «no se llamó a updateProfilePhoto» pasaría en verde de forma vacía.
const expectUpdateProfilePhotoExists = async () => {
  const actual = await vi.importActual<Record<string, unknown>>(
    "@/modules/profile/data/profile.data"
  )
  expect(
    typeof actual.updateProfilePhoto,
    "updateProfilePhoto en profile.data"
  ).toBe("function")
}

const never = () => new Promise(() => {})
const failing = () => Promise.reject(new Error("fallo simulado"))

const FORMAT_ERROR = "Formato no válido. Sube una imagen PNG, JPG o WEBP."
const SIZE_ERROR = "La foto supera los 2 MB."
const SAVE_ERROR = "No se pudo guardar el perfil. Intenta de nuevo."

const UPLOAD_LABEL = "Subir Foto"
const REMOVE_NAME = "Quitar foto de perfil"

// Iniciales de I1 sin foto (dos primeras palabras del nombre del store).
const INITIALS: Record<Role, string> = {
  [ROLES.TRIPULANTE]: "JP",
  [ROLES.SUPER_VISOR]: "CR",
  [ROLES.SUPER_ADMIN]: "AA",
}

const SAVED_PHOTO_URL = "https://example.test/fotos/perfil.jpg"

// CF-04: un UserProfile completo con foto guardada. Sin anotar el tipo, para que compile antes
// y después de añadir photoUrl a profile.types.ts. Objeto nuevo en cada llamada: la página
// vuelve a pedirlo al invalidar ["profile", userId].
const userProfileWithPhoto = () => ({
  employeeCode: "AC-9001",
  status: "Activo",
  contact: {
    phone: "+57 300 000 0000",
    email: "prueba@aircrew-ops.com",
    residenceZone: "Zona Prueba, Bogotá",
  },
  security: { lastPasswordChangeDays: 10 },
  photoUrl: SAVED_PHOTO_URL,
})

const pngPhoto = () => new File(["png"], "foto.png", { type: "image/png" })

const setup = async (role: Role, options?: { applyAccept?: boolean }) => {
  const user = userEvent.setup(options)
  renderConfiguracion(role)
  const main = await findLoadedMain()
  const fullName = useAuthStore.getState().user?.fullName ?? ""
  // I1: la <section> rotulada por el h2 con el nombre completo del store.
  const card = getSectionByHeading(main, fullName)
  return {
    user,
    main,
    card,
    fullName,
    save: () =>
      user.click(within(main).getByRole("button", { name: "Guardar Cambios" })),
    cancel: () =>
      user.click(within(main).getByRole("button", { name: "Cancelar" })),
  }
}

describe("Configuración: controles de la foto (CF-01)", () => {
  it.each([ROLES.TRIPULANTE, ROLES.SUPER_VISOR])(
    "CF-01: con un %s, I1 tiene «Subir Foto» (input de archivo) y «Quitar foto de perfil», deshabilitado sin foto; ya no existe «Actualizar Foto, próximamente»",
    async (role) => {
      const { main, card } = await setup(role)

      const input = within(card).getByLabelText(UPLOAD_LABEL)
      expect(input).toHaveAttribute("type", "file")
      expect(input).toHaveAttribute("accept", ".png,.jpg,.jpeg,.webp")

      const remove = within(card).getByRole("button", { name: REMOVE_NAME })
      expect(remove).toBeDisabled()
      expect(remove).toHaveAttribute("title", "Quitar foto")
      expect(remove).toHaveAttribute("type", "button")

      // Sin foto guardada (photoUrl null en los mocks): iniciales y ninguna imagen.
      expect(within(card).getByText(INITIALS[role])).toBeInTheDocument()
      expect(within(card).queryByRole("img")).toBeNull()

      expect(
        within(main).queryByRole("button", {
          name: "Actualizar Foto, próximamente",
        })
      ).toBeNull()
      expect(within(main).queryByText("Actualizar Foto")).toBeNull()
      expect(
        within(main).queryByRole("button", { name: /próximamente/i })
      ).toBeNull()
    }
  )
})

describe("Configuración: validación de la foto (CF-03)", () => {
  it.each([
    {
      role: ROLES.TRIPULANTE,
      kind: "un .gif",
      file: () => new File(["gif"], "animada.gif", { type: "image/gif" }),
      error: FORMAT_ERROR,
    },
    {
      role: ROLES.SUPER_VISOR,
      kind: "un PNG de más de 2 MB",
      file: () =>
        new File([new Uint8Array(2 * 1024 * 1024 + 1)], "grande.png", {
          type: "image/png",
        }),
      error: SIZE_ERROR,
    },
  ])(
    "CF-03: con un $role y $kind aparece «$error» enlazado al input, la foto guardada se conserva y al guardar no se llama a updateProfilePhoto",
    async ({ role, file, error }) => {
      await expectUpdateProfilePhotoExists()
      profileData.overrides.getUserProfile = () =>
        Promise.resolve(userProfileWithPhoto())
      // applyAccept: false, para que user-event no descarte el .gif por el accept del input.
      const { user, card, fullName, save } = await setup(role, {
        applyAccept: false,
      })
      const input = within(card).getByLabelText(UPLOAD_LABEL)

      await user.upload(input, file())

      await waitFor(() => expect(alertsWithText(card, error)).toHaveLength(1))
      expect(input).toHaveAccessibleDescription(error)
      expect(
        within(card).getByRole("img", { name: `Foto de perfil de ${fullName}` })
      ).toHaveAttribute("src", SAVED_PHOTO_URL)

      await save()

      await findSuccessToast()
      expect(photoCalls()).toEqual([])
    }
  )
})

describe("Configuración: foto guardada, quitar y cancelar (CF-04)", () => {
  it("CF-04: con un supervisor y una foto guardada, I1 la muestra con su alt; «Quitar foto de perfil» la cambia por las iniciales y «Cancelar» la devuelve y borra el error de la foto", async () => {
    profileData.overrides.getUserProfile = () =>
      Promise.resolve(userProfileWithPhoto())
    const { user, card, fullName, cancel } = await setup(ROLES.SUPER_VISOR, {
      applyAccept: false,
    })
    const photoName = `Foto de perfil de ${fullName}`

    expect(within(card).getByRole("img", { name: photoName })).toHaveAttribute(
      "src",
      SAVED_PHOTO_URL
    )
    const remove = within(card).getByRole("button", { name: REMOVE_NAME })
    expect(remove).toBeEnabled()

    await user.click(remove)

    await waitFor(() =>
      expect(within(card).queryByRole("img", { name: photoName })).toBeNull()
    )
    expect(within(card).getByText(INITIALS[ROLES.SUPER_VISOR])).toBeVisible()
    expect(remove).toBeDisabled()

    // Un error de la foto pendiente: «Cancelar» también lo borra.
    await user.upload(
      within(card).getByLabelText(UPLOAD_LABEL),
      new File(["gif"], "animada.gif", { type: "image/gif" })
    )
    await waitFor(() =>
      expect(alertsWithText(card, FORMAT_ERROR)).toHaveLength(1)
    )

    await cancel()

    expect(
      await within(card).findByRole("img", { name: photoName })
    ).toHaveAttribute("src", SAVED_PHOTO_URL)
    expect(alertsWithText(card, FORMAT_ERROR)).toHaveLength(0)
    expect(within(card).getByLabelText(UPLOAD_LABEL)).not.toHaveAttribute(
      "aria-describedby"
    )
    expect(
      within(card).getByRole("button", { name: REMOVE_NAME })
    ).toBeEnabled()
    expect(photoCalls()).toEqual([])
  })
})

describe("Configuración: guardar sin tocar la foto (CF-05)", () => {
  it.each([ROLES.TRIPULANTE, ROLES.SUPER_VISOR])(
    "CF-05: con un %s, «Guardar Cambios» sin tocar la foto muestra el toast y no llama a updateProfilePhoto",
    async (role) => {
      await expectUpdateProfilePhotoExists()
      const { save } = await setup(role)

      await save()

      await findSuccessToast()
      expect(photoCalls()).toEqual([])
    }
  )
})

describe("Configuración: guardar la foto (flujo y error, CF-02 y CF-06)", () => {
  it("CF-02 (flujo): con un tripulante, mientras se guarda la foto «Guardar Cambios» se deshabilita y dice «Guardando…», sin toast", async () => {
    profileData.overrides.updateProfilePhoto = never
    const { user, main, card, save } = await setup(ROLES.TRIPULANTE)

    await user.upload(within(card).getByLabelText(UPLOAD_LABEL), pngPhoto())
    await save()

    expect(
      await within(main).findByRole("button", { name: "Guardando…" })
    ).toBeDisabled()
    expect(
      within(main).queryByRole("button", { name: "Guardar Cambios" })
    ).toBeNull()
    expect(photoCalls()).toHaveLength(1)
    expect(querySuccessToast()).toBeNull()
  })

  it("CF-06: con un supervisor, si updateProfilePhoto falla aparece «No se pudo guardar el perfil. Intenta de nuevo.» y no hay toast", async () => {
    profileData.overrides.updateProfilePhoto = failing
    const { user, main, card, save } = await setup(ROLES.SUPER_VISOR)

    await user.upload(within(card).getByLabelText(UPLOAD_LABEL), pngPhoto())
    await save()

    await waitFor(() =>
      expect(alertsWithText(main, SAVE_ERROR)).toHaveLength(1)
    )
    expect(photoCalls()).toHaveLength(1)
    expect(querySuccessToast()).toBeNull()
    // Terminado el intento, el botón vuelve a estar disponible.
    expect(
      within(main).getByRole("button", { name: "Guardar Cambios" })
    ).toBeEnabled()
  })
})

// Va al final: aquí se usa updateProfilePhoto real (400 ms de latencia), que escribe photoUrl en
// los datos del módulo, compartidos por todo el archivo. Sin URL.createObjectURL en jsdom, con
// un File no lo cambia y con null lo deja en el null que ya tenía; aun así, mejor al final.
describe("Configuración: guardar la foto con los datos simulados (CF-02 y CF-04)", () => {
  it.each([ROLES.TRIPULANTE, ROLES.SUPER_VISOR])(
    "CF-02: con un %s, al subir foto.png y guardar, updateProfilePhoto recibe el id del store y un File «foto.png», se vuelve a pedir el perfil y aparece el toast de siempre",
    async (role) => {
      await expectUpdateProfilePhotoExists()
      const { user, card, save } = await setup(role)

      await user.upload(within(card).getByLabelText(UPLOAD_LABEL), pngPhoto())
      expect(within(card).queryByRole("alert")).toBeNull()
      const profileFetches = callsOf("getUserProfile").length

      await save()

      const toast = await findSuccessToast()
      expect(toastDescription(toast)).toBe(SUCCESS_DETAIL)
      const calls = photoCalls()
      expect(calls).toHaveLength(1)
      const [userId, photo] = calls[0]
      expect(userId).toBe(useAuthStore.getState().user?.id)
      expect(photo).toBeInstanceOf(File)
      expect((photo as File).name).toBe("foto.png")
      // Derivado del flujo: al terminar bien se invalida ["profile", userId].
      await waitFor(() =>
        expect(callsOf("getUserProfile").length).toBeGreaterThan(profileFetches)
      )
    }
  )

  it("CF-04: con un tripulante y una foto guardada, quitarla y guardar llama a updateProfilePhoto con null y muestra el toast", async () => {
    await expectUpdateProfilePhotoExists()
    profileData.overrides.getUserProfile = () =>
      Promise.resolve(userProfileWithPhoto())
    const { user, card, fullName, save } = await setup(ROLES.TRIPULANTE)
    expect(
      within(card).getByRole("img", { name: `Foto de perfil de ${fullName}` })
    ).toBeInTheDocument()

    await user.click(within(card).getByRole("button", { name: REMOVE_NAME }))
    await save()

    await findSuccessToast()
    expect(photoCalls()).toEqual([[useAuthStore.getState().user?.id, null]])
    expect(screen.queryByText(SAVE_ERROR)).toBeNull()
  })
})
