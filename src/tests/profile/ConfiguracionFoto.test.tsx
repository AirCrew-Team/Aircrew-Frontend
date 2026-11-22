import { act, fireEvent, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse } from "msw"
import { describe, expect, it, onTestFinished, vi } from "vitest"

import { recordRequests } from "../mocks/absencesApi"
import { apiError, createGate } from "../mocks/passwordResetApi"
import {
  PNG_1X1_BASE64,
  PROFILE_URLS,
  REAL_ACCOUNTS,
  realProfile,
  type FakeProfileOptions,
  type RealAccountKey,
} from "../mocks/profileApi"
import { findToast, queryToast } from "../utils/toasts"
import {
  findLoadedMain,
  getIdentityCard,
  hasInitials,
  openRealSession,
} from "./profileTestUtils"

// Spec configuracion-real, CF-05: foto de perfil real. Subir envía PUT
// /api/admin/users/me/photo con { mime_type, data_base64 }; el <img> apunta a
// GET /api/admin/users/me/photo?v={photo_updated_at}; quitar envía DELETE y vuelven las
// iniciales; un formato o un tamaño no válidos muestran su mensaje sin peticiones.
// jsdom no descarga imágenes: el <img> se comprueba por su src.

vi.setConfig({ testTimeout: 20_000 })

const UPLOAD = /^Subir foto/
const REMOVE = "Quitar foto"
const UPLOADED_TOAST = "Foto actualizada."
const REMOVED_TOAST = "Foto eliminada."
const FORMAT_ERROR = "Formato no admitido. Usa PNG, JPG o WEBP."
const SIZE_ERROR = "La foto supera el máximo de 2 MB."

const SAVED_PHOTO_AT = "2026-11-10T08:30:00.000Z"

// Iniciales de las dos primeras palabras del nombre (mismo criterio que el navbar).
const INITIALS: Record<RealAccountKey, string> = {
  crew: "LM",
  supervisor: "MS",
  admin: "AP",
}

const pngFile = () =>
  new File(
    [Uint8Array.from(atob(PNG_1X1_BASE64), (char) => char.charCodeAt(0))],
    "foto.png",
    { type: "image/png" }
  )

const setup = async (
  key: RealAccountKey,
  photoUpdatedAt: string | null,
  options?: { applyAccept?: boolean },
  backendOptions?: FakeProfileOptions
) => {
  const user = userEvent.setup(options)
  const session = openRealSession(key, {
    profile: realProfile(key, { photo_updated_at: photoUpdatedAt }),
    options: backendOptions,
  })
  const main = await findLoadedMain(REAL_ACCOUNTS[key].email)
  const card = getIdentityCard(main, session.user.fullName)
  return { ...session, user, main, card }
}

// El src del <img> es la URL de la foto con ?v={photo_updated_at}. Se compara con
// new URL para tolerar la codificación de los dos puntos del ISO.
const expectPhotoSrc = (img: HTMLImageElement, version: string | null) => {
  const url = new URL(img.src)
  expect(`${url.origin}${url.pathname}`).toBe(PROFILE_URLS.photo)
  expect(url.searchParams.get("v")).toBe(version)
}

describe("CF-05: foto de perfil", () => {
  it.each(["crew", "supervisor", "admin"] as const)(
    "CF-05: con un %s con foto guardada, el <img> apunta a /api/admin/users/me/photo?v={photo_updated_at} y se ve «Quitar foto»",
    async (key) => {
      const { card } = await setup(key, SAVED_PHOTO_AT)

      const img = await waitFor(() => {
        const found = card.querySelector("img")
        expect(found, "la tarjeta debe tener la foto").not.toBeNull()
        return found as HTMLImageElement
      })
      expectPhotoSrc(img, SAVED_PHOTO_AT)
      expect(
        within(card).getByRole("button", { name: REMOVE })
      ).toBeInTheDocument()
    }
  )

  it("CF-05: sin foto se ven las iniciales y no está «Quitar foto»", async () => {
    const { card } = await setup("crew", null)

    // Ancla: el control de subir ya está.
    expect(within(card).getByLabelText(UPLOAD)).toHaveAttribute("type", "file")
    expect(hasInitials(card, INITIALS.crew)).toBe(true)
    expect(card.querySelector("img")).toBeNull()
    expect(within(card).queryByRole("button", { name: REMOVE })).toBeNull()
  })

  it("CF-05: subir un PNG válido envía PUT con mime_type y data_base64, aparece «Foto actualizada.» y el <img> usa el nuevo photo_updated_at", async () => {
    const { user, card, backend } = await setup("supervisor", null)

    await user.upload(within(card).getByLabelText(UPLOAD), pngFile())

    await findToast(UPLOADED_TOAST)
    // data_base64: los bytes del archivo en base64, sin el prefijo data:.
    expect(backend.bodies.photoPut).toEqual([
      { mime_type: "image/png", data_base64: PNG_1X1_BASE64 },
    ])
    const img = await waitFor(() => {
      const found = card.querySelector("img")
      expect(found, "tras subir debe verse la foto").not.toBeNull()
      return found as HTMLImageElement
    })
    expectPhotoSrc(img, backend.state.profile.photo_updated_at)
    expect(
      await within(card).findByRole("button", { name: REMOVE })
    ).toBeInTheDocument()
  })

  it("CF-05: «Quitar foto» envía DELETE, aparece «Foto eliminada.» y vuelven las iniciales", async () => {
    const { user, card, backend } = await setup("admin", SAVED_PHOTO_AT)

    await user.click(await within(card).findByRole("button", { name: REMOVE }))

    await findToast(REMOVED_TOAST)
    expect(backend.bodies.photoDelete).toBe(1)
    await waitFor(() => expect(card.querySelector("img")).toBeNull())
    expect(hasInitials(card, INITIALS.admin)).toBe(true)
    expect(within(card).queryByRole("button", { name: REMOVE })).toBeNull()
  })

  it.each([
    {
      kind: "un .gif",
      error: FORMAT_ERROR,
      file: () => new File(["GIF89a"], "animada.gif", { type: "image/gif" }),
    },
    {
      kind: "un PNG de más de 2 MB",
      error: SIZE_ERROR,
      file: () =>
        new File([new Uint8Array(2 * 1024 * 1024 + 1)], "grande.png", {
          type: "image/png",
        }),
    },
  ])(
    "CF-05: $kind muestra «$error» y no hace ninguna petición",
    async ({ file, error }) => {
      // applyAccept: false, para que user-event no descarte el .gif por el accept.
      const { user, main, card, backend } = await setup("crew", null, {
        applyAccept: false,
      })
      const requests = recordRequests()

      await user.upload(within(card).getByLabelText(UPLOAD), file())

      expect(await within(main).findByText(error)).toBeInTheDocument()
      // El catálogo de ciudades (A2) se pide al montar el formulario y puede llegar aquí.
      expect(
        requests.filter((request) => !request.endsWith(PROFILE_URLS.usCities))
      ).toEqual([])
      expect(backend.bodies.photoPut).toEqual([])
      expect(queryToast(UPLOADED_TOAST)).toBeNull()
    }
  )
})

// Compuerta: la respuesta de la foto espera a que el test la libere.
const gatedPhoto = () => {
  const { gate, release } = createGate()
  onTestFinished(() => release())
  return {
    release,
    put: async () => {
      await gate
      return HttpResponse.json({ photo_updated_at: "2026-11-20T10:00:00.000Z" })
    },
    remove: async () => {
      await gate
      return new HttpResponse(null, { status: 204 })
    },
  }
}

describe("CF-05 (revisión): foco, envío en curso y errores de la foto", () => {
  it("CF-05: tras quitar la foto, el foco pasa al input «Subir foto»", async () => {
    const { user, card } = await setup("crew", SAVED_PHOTO_AT)
    const remove = await within(card).findByRole("button", { name: REMOVE })

    await user.click(remove)

    await findToast(REMOVED_TOAST)
    await waitFor(() =>
      expect(within(card).getByLabelText(UPLOAD)).toHaveFocus()
    )
  })

  it('CF-05: mientras sube, «Subir foto» tiene aria-disabled="true" sin disabled, se ve «Subiendo foto…» (role="status") y otra subida no hace otra petición', async () => {
    const pending = gatedPhoto()
    const { user, card, backend } = await setup("supervisor", null, undefined, {
      respond: { photoPut: pending.put },
    })
    const upload = within(card).getByLabelText(UPLOAD)

    await user.upload(upload, pngFile())
    await waitFor(() => expect(backend.bodies.photoPut).toHaveLength(1))

    await waitFor(() => expect(upload).toHaveAttribute("aria-disabled", "true"))
    expect(upload).not.toHaveAttribute("disabled")
    expect(within(card).getByRole("status")).toHaveTextContent("Subiendo foto…")
    await user.upload(upload, pngFile())
    await act(() => new Promise((resolve) => setTimeout(resolve, 300)))
    expect(backend.bodies.photoPut).toHaveLength(1)

    pending.release()
    await findToast(UPLOADED_TOAST)
    await waitFor(() => expect(upload).not.toHaveAttribute("aria-disabled"))
  })

  it('CF-05: mientras quita la foto, «Quitar foto» tiene aria-disabled="true" sin disabled, sigue con el foco y un segundo clic no hace otra petición', async () => {
    const pending = gatedPhoto()
    const { user, card, backend } = await setup(
      "admin",
      SAVED_PHOTO_AT,
      undefined,
      {
        respond: { photoDelete: pending.remove },
      }
    )
    const remove = await within(card).findByRole("button", { name: REMOVE })

    await user.click(remove)
    await waitFor(() => expect(backend.bodies.photoDelete).toBe(1))

    await waitFor(() => expect(remove).toHaveAttribute("aria-disabled", "true"))
    expect(remove).not.toHaveAttribute("disabled")
    expect(remove).toHaveFocus()
    expect(within(card).getByLabelText(UPLOAD)).toHaveAttribute(
      "aria-disabled",
      "true"
    )
    await user.click(remove)
    await act(() => new Promise((resolve) => setTimeout(resolve, 300)))
    expect(backend.bodies.photoDelete).toBe(1)

    pending.release()
    await findToast(REMOVED_TOAST)
  })

  it("CF-05: si el <img> no carga (onError), vuelven las iniciales", async () => {
    const { card } = await setup("supervisor", SAVED_PHOTO_AT)
    const img = await waitFor(() => {
      const found = card.querySelector("img")
      expect(found).not.toBeNull()
      return found as HTMLImageElement
    })

    fireEvent.error(img)

    await waitFor(() => expect(card.querySelector("img")).toBeNull())
    expect(hasInitials(card, INITIALS.supervisor)).toBe(true)
  })

  it("CF-05: si el servidor falla al subir, el mensaje aparece dentro de la tarjeta", async () => {
    const { user, card } = await setup("crew", null, undefined, {
      respond: { photoPut: apiError(500, "Error interno") },
    })

    await user.upload(within(card).getByLabelText(UPLOAD), pngFile())

    expect(await within(card).findByRole("alert")).toHaveTextContent(
      "No se pudo subir la foto. Intenta de nuevo."
    )
    expect(queryToast(UPLOADED_TOAST)).toBeNull()
  })

  it("CF-05: si el servidor falla al quitar, el mensaje aparece dentro de la tarjeta y la foto sigue", async () => {
    const { user, card } = await setup("admin", SAVED_PHOTO_AT, undefined, {
      respond: { photoDelete: apiError(500, "Error interno") },
    })

    await user.click(await within(card).findByRole("button", { name: REMOVE }))

    expect(await within(card).findByRole("alert")).toHaveTextContent(
      "No se pudo quitar la foto. Intenta de nuevo."
    )
    expect(card.querySelector("img")).not.toBeNull()
    expect(queryToast(REMOVED_TOAST)).toBeNull()
  })

  it("CF-05: el toast «Foto actualizada.» sale aunque el usuario haya salido de Configuración", async () => {
    const pending = gatedPhoto()
    const { user, card, backend, router } = await setup(
      "crew",
      null,
      undefined,
      { respond: { photoPut: pending.put } }
    )

    await user.upload(within(card).getByLabelText(UPLOAD), pngFile())
    await waitFor(() => expect(backend.bodies.photoPut).toHaveLength(1))
    await act(() => router.navigate("/ruta-que-no-existe"))

    pending.release()
    await findToast(UPLOADED_TOAST)
  })
})
