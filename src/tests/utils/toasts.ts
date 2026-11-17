import { waitFor } from "@testing-library/react"
import { expect } from "vitest"

// Toasts de sonner (montados por renderRoute fuera del router, como en AirCrewApp).
// Cada toast es un <li data-sonner-toast> sin role; el título va en [data-title],
// la descripción en [data-description] y el tipo en data-type ("success", "error"…).

export const queryAllToasts = () =>
  Array.from(document.querySelectorAll<HTMLElement>("[data-sonner-toast]"))

const textOf = (toast: HTMLElement, part: "title" | "description") =>
  toast.querySelector(`[data-${part}]`)?.textContent?.trim() ?? null

export const queryToast = (title: string) =>
  queryAllToasts().find((toast) => textOf(toast, "title") === title) ?? null

export const findToast = (title: string) =>
  waitFor(() => {
    const toast = queryToast(title)
    expect(toast, `debe aparecer un toast «${title}»`).not.toBeNull()
    return toast as HTMLElement
  })

export const toastDescription = (toast: HTMLElement) =>
  textOf(toast, "description")
