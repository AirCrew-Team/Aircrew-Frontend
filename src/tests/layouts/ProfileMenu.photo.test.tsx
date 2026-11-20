import { act, fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ROLES, type Role } from "@/App/types/auth.types"
import { HOME_PATH_BY_ROLE } from "@/routes/navigation"
import { useAuthStore } from "@/stores/auth.store"

import { recordRequests } from "../mocks/absencesApi"
import {
  PNG_1X1_BASE64,
  PROFILE_URLS,
  REAL_ACCOUNTS,
  REAL_USERS,
  realProfile,
  type RealAccountKey,
} from "../mocks/profileApi"
import {
  findLoadedMain,
  getIdentityCard,
  openRealSession,
} from "../profile/profileTestUtils"
import { renderRoute } from "../utils/renderRoute"
import { findToast } from "../utils/toasts"

// Spec configuracion-real, ampliación A4 (CF-12): con sesión real, el avatar del menú de
// perfil del navbar muestra la foto (<img> con la misma URL ?v={photo_updated_at} de
// Configuración); sin foto, si falla la carga o en una cuenta demo, las iniciales (hoy en
// data-initials, ver ProfileMenu.tsx). MainLayout y Configuración comparten la consulta
// del perfil: al subir o quitar la foto en Configuración, el navbar cambia sin recargar.
// Las cuentas demo no hacen ninguna petición. jsdom no descarga imágenes: se mira el src.

vi.setConfig({ testTimeout: 20_000 })

const SAVED_PHOTO_AT = "2026-11-10T08:30:00.000Z"
const UPLOAD = /^Subir foto/
const REMOVE = "Quitar foto"

// Pantallas de cada rol fuera de Configuración que hoy no piden nada con sesión real:
// la única petición del layout es la del perfil (GET /api/admin/users/me).
const ROUTE_BY_KEY: Record<RealAccountKey, string> = {
  crew: "/tripulante/certificaciones",
  supervisor: "/supervisor",
  admin: "/admin",
}

const REAL_KEYS = ["crew", "supervisor", "admin"] as const

const pngFile = () =>
  new File(
    [Uint8Array.from(atob(PNG_1X1_BASE64), (char) => char.charCodeAt(0))],
    "foto.png",
    { type: "image/png" }
  )

// Botón del menú de perfil (su nombre accesible no cambia con la foto).
const findTrigger = () =>
  screen.findByRole("button", { name: /^Menú de perfil de/ })

// <img> del avatar dentro del botón del menú de perfil.
const findNavbarPhoto = async () => {
  const trigger = await findTrigger()
  return waitFor(() => {
    const img = trigger.querySelector("img")
    expect(img, "el avatar del navbar debe mostrar la foto").not.toBeNull()
    return img as HTMLImageElement
  })
}

// El src es la URL de la foto con ?v={photo_updated_at} (se compara con new URL para
// tolerar la codificación de los dos puntos del ISO).
const expectPhotoSrc = (img: HTMLImageElement, version: string | null) => {
  const url = new URL(img.src)
  expect(`${url.origin}${url.pathname}`).toBe(PROFILE_URLS.photo)
  expect(url.searchParams.get("v")).toBe(version)
}

// Iniciales del avatar: hoy van en data-initials (contenido CSS) a partir de displayName.
const initialsOf = (trigger: HTMLElement) =>
  trigger.querySelector("[data-initials]")?.getAttribute("data-initials") ??
  null

const expectInitials = (trigger: HTMLElement, displayName: string) => {
  expect(trigger.querySelector("img"), "sin foto no hay <img>").toBeNull()
  expect(initialsOf(trigger)).toMatch(new RegExp(`^${displayName.charAt(0)}`))
}

describe("CF-12: foto de perfil en el navbar", () => {
  it.each(REAL_KEYS)(
    "CF-12: con un %s real con foto, fuera de Configuración, el avatar del navbar es un <img> con /api/admin/users/me/photo?v={photo_updated_at} y el botón conserva su nombre",
    async (key) => {
      const { user } = openRealSession(key, {
        profile: realProfile(key, { photo_updated_at: SAVED_PHOTO_AT }),
        path: ROUTE_BY_KEY[key],
      })

      const img = await findNavbarPhoto()

      expectPhotoSrc(img, SAVED_PHOTO_AT)
      const trigger = await findTrigger()
      expect(trigger).toHaveAccessibleName(
        `Menú de perfil de ${user.displayName} ${user.position}`
      )
      expect(initialsOf(trigger)).toBeNull()
    }
  )

  it.each(REAL_KEYS)(
    "CF-12: con un %s real sin foto, el navbar pide el perfil y muestra las iniciales",
    async (key) => {
      const { backend, user } = openRealSession(key, {
        profile: realProfile(key, { photo_updated_at: null }),
        path: ROUTE_BY_KEY[key],
      })
      const trigger = await findTrigger()

      // Ancla: el perfil ya llegó (si no, las iniciales pasarían en vacío).
      await waitFor(() => expect(backend.calls.me).toBeGreaterThan(0))
      await act(() => new Promise((resolve) => setTimeout(resolve, 100)))

      expectInitials(trigger, user.displayName)
    }
  )

  it.each([ROLES.TRIPULANTE, ROLES.SUPER_VISOR, ROLES.SUPER_ADMIN])(
    "CF-12: con el %s demo, el navbar muestra las iniciales y no hace ninguna petición",
    async (role: Role) => {
      const requests = recordRequests()
      useAuthStore.getState().setMockRole(role)
      renderRoute(HOME_PATH_BY_ROLE[role])
      const trigger = await findTrigger()

      // Margen para que una petición llegara.
      await act(() => new Promise((resolve) => setTimeout(resolve, 300)))

      expectInitials(trigger, useAuthStore.getState().user?.displayName ?? "")
      expect(requests).toEqual([])
    }
  )

  it("CF-12: al subir una foto en Configuración, el avatar del navbar pasa a mostrarla sin recargar", async () => {
    const user = userEvent.setup()
    const { backend, user: sessionUser } = openRealSession("crew")
    const main = await findLoadedMain(REAL_ACCOUNTS.crew.email)
    const card = getIdentityCard(main, sessionUser.fullName)
    const trigger = await findTrigger()
    expectInitials(trigger, sessionUser.displayName)

    await user.upload(within(card).getByLabelText(UPLOAD), pngFile())
    await findToast("Foto actualizada.")

    const img = await findNavbarPhoto()
    expectPhotoSrc(img, backend.state.profile.photo_updated_at)
  })

  it("CF-12: con una foto en el navbar, al subir otra en Configuración cambia el ?v= del avatar", async () => {
    const user = userEvent.setup()
    const { backend } = openRealSession("supervisor", {
      profile: realProfile("supervisor", { photo_updated_at: SAVED_PHOTO_AT }),
    })
    const main = await findLoadedMain(REAL_ACCOUNTS.supervisor.email)
    const card = getIdentityCard(main, REAL_USERS.supervisor.fullName)
    expectPhotoSrc(await findNavbarPhoto(), SAVED_PHOTO_AT)

    await user.upload(within(card).getByLabelText(UPLOAD), pngFile())
    await findToast("Foto actualizada.")

    const updated = backend.state.profile.photo_updated_at
    expect(updated).not.toBe(SAVED_PHOTO_AT)
    const trigger = await findTrigger()
    await waitFor(() => {
      const img = trigger.querySelector("img")
      expect(img, "el avatar del navbar debe seguir con foto").not.toBeNull()
      expectPhotoSrc(img as HTMLImageElement, updated)
    })
  })

  it("CF-12: al quitar la foto en Configuración, el avatar del navbar vuelve a las iniciales", async () => {
    const user = userEvent.setup()
    openRealSession("admin", {
      profile: realProfile("admin", { photo_updated_at: SAVED_PHOTO_AT }),
    })
    const main = await findLoadedMain(REAL_ACCOUNTS.admin.email)
    const card = getIdentityCard(main, REAL_USERS.admin.fullName)
    await findNavbarPhoto()

    await user.click(await within(card).findByRole("button", { name: REMOVE }))
    await findToast("Foto eliminada.")

    const trigger = await findTrigger()
    await waitFor(() => expect(trigger.querySelector("img")).toBeNull())
    expectInitials(trigger, REAL_USERS.admin.displayName)
  })

  it("CF-12: si la foto del navbar no carga (error del <img>), vuelven las iniciales", async () => {
    openRealSession("supervisor", {
      profile: realProfile("supervisor", { photo_updated_at: SAVED_PHOTO_AT }),
      path: ROUTE_BY_KEY.supervisor,
    })
    const img = await findNavbarPhoto()

    fireEvent.error(img)

    const trigger = await findTrigger()
    await waitFor(() => expect(trigger.querySelector("img")).toBeNull())
    expectInitials(trigger, REAL_USERS.supervisor.displayName)
  })
})
