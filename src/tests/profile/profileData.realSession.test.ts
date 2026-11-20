import { describe, expect, it } from "vitest"

import {
  getOperatorProfile,
  updateOperatorProfile,
} from "@/modules/operatorProfile/data/operatorProfile.data"
import {
  changePassword,
  getCrewProfile,
  getUserProfile,
} from "@/modules/profile/data/profile.data"

import { accountHandler, crewMemberHandler } from "../mocks/profileApi"
import { server } from "../utils/server"

// Regresiones de la revisión de configuracion-sesion-real: los datos de una cuenta no
// pasan a otra. Cada test usa ids propios porque los registros viven en el módulo.

const account = (id: string, role: string, isActive = true) => ({
  id,
  name: "Cuenta de Prueba",
  email: `${id}@aircrew.test`,
  role,
  is_active: isActive,
  created_at: "2026-11-18T12:00:00.000Z",
})

describe("Plantillas limpias (revisión, Important 1)", () => {
  it("un tripulante real no hereda lo que se cambió en la cuenta demo", async () => {
    await changePassword("mock-tripulante", {
      currentPassword: "AirCrew2026!",
      newPassword: "Nueva-clave-2026",
    })
    const demo = await getUserProfile("mock-tripulante")
    expect(demo.security.lastPasswordChangeDays).toBe(0)

    server.use(accountHandler(account("u-iso-crew-1", "crew")))
    const real = await getUserProfile("u-iso-crew-1")

    expect(real.security.lastPasswordChangeDays).toBe(42)
  })

  it("un admin real no hereda el teléfono que se cambió en el admin demo", async () => {
    const demo = await getOperatorProfile("mock-admin")
    await updateOperatorProfile("mock-admin", {
      fullName: demo.fullName,
      email: demo.email,
      phone: "+14045550100",
      residence: demo.residence,
      notifications: {},
    })

    server.use(accountHandler(account("u-iso-admin-1", "super_admin")))
    const real = await getOperatorProfile("u-iso-admin-1")

    expect(real.phone).toBe("+14045550119")
  })
})

describe("La cuenta del backend debe ser la del id pedido (revisión, Important 2)", () => {
  it("getUserProfile rechaza si /auth/me es de otra cuenta", async () => {
    server.use(accountHandler(account("u-otra-cuenta", "crew")))

    await expect(getUserProfile("u-iso-crew-2")).rejects.toThrow()
  })

  it("getOperatorProfile rechaza si /auth/me es de otra cuenta", async () => {
    server.use(accountHandler(account("u-otra-cuenta", "super_admin")))

    await expect(getOperatorProfile("u-iso-admin-2")).rejects.toThrow()
  })
})

describe("Detalles de la revisión (Minor)", () => {
  it("una cuenta inactiva no se muestra como «Activo»", async () => {
    server.use(accountHandler(account("u-iso-sup-1", "supervisor", false)))

    const real = await getUserProfile("u-iso-sup-1")

    expect(real.status).toBe("Inactivo")
  })

  it("getCrewProfile de un id real devuelve una copia en cada llamada", async () => {
    server.use(
      accountHandler(account("u-iso-crew-3", "crew")),
      crewMemberHandler()
    )

    const first = await getCrewProfile("u-iso-crew-3").catch(() => null)
    const second = await getCrewProfile("u-iso-crew-3").catch(() => null)

    expect(first).not.toBeNull()
    expect(first).not.toBe(second)
  })
})
