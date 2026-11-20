import { act, render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { http, HttpResponse } from "msw"
import { createMemoryRouter } from "react-router"
import { RouterProvider } from "react-router/dom"
import { describe, expect, it, onTestFinished } from "vitest"

import MainLayout from "@/layouts/MainLayout"
import { useAuthStore } from "@/stores/auth.store"

import { PROFILE_URLS, REAL_USERS } from "../mocks/profileApi"
import { server } from "../utils/server"

// Revisión M1 de la ampliación A de configuracion-real: la consulta del perfil del navbar
// (foto del avatar) corre en todas las pantallas, así que su observador no reintenta ni
// recarga al volver a la ventana. Se monta MainLayout con un QueryClient con las opciones
// por defecto (reintenta 3 veces, el primero al cabo de 1 s), no el de renderRoute.

describe("Revisión M1: consulta del perfil en el navbar", () => {
  it("M1: tras un error de red en /users/me fuera de Configuración, no hay reintentos", async () => {
    let calls = 0
    server.use(
      http.get(PROFILE_URLS.me, () => {
        calls += 1
        return HttpResponse.error()
      })
    )
    useAuthStore.getState().setUser(REAL_USERS.supervisor)
    const client = new QueryClient()
    onTestFinished(() => client.clear())
    const router = createMemoryRouter([
      {
        path: "/",
        element: <MainLayout />,
        children: [{ index: true, element: <p>Pantalla</p> }],
      },
    ])

    const { unmount } = render(
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    )
    onTestFinished(unmount)
    await screen.findByText("Pantalla")

    // Más que el primer reintento por defecto (1 s).
    await act(() => new Promise((resolve) => setTimeout(resolve, 1500)))

    expect(calls).toBe(1)
  })
})
