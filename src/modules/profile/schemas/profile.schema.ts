import * as z from "zod/mini"

import type { NotificationKey } from "@/App/types/profile.types"

// "+" inicial opcional y de 7 a 15 dígitos, que pueden ir separados por espacios. El
// backend aplica la misma regla después de quitar los espacios.
const PHONE_PATTERN = /^\+?\d(?: ?\d){6,14}$/

// Contacto (opcional) y notificaciones de la cuenta. La residencia, si no está vacía, debe
// ser una ciudad del catálogo de EE. UU., sin distinguir mayúsculas como el backend (que
// la guarda con la forma del catálogo); mientras el catálogo no ha llegado (o si falló)
// no se comprueba aquí y la valida el backend.
export const profileSchemaFor = (cities: readonly string[] | undefined) =>
  z.object({
    phone: z.string().check(
      z.trim(),
      z.refine(
        (value) => value === "" || PHONE_PATTERN.test(value),
        "Formato no válido. Usa de 7 a 15 números, con espacios y un + inicial si quieres, por ejemplo +1 404 555 0123."
      )
    ),
    residence: z.string().check(
      z.trim(),
      z.refine((value) => {
        if (!cities || value === "") return true
        const lower = value.toLowerCase()
        return cities.some((city) => city.toLowerCase() === lower)
      }, "Elige una ciudad de la lista.")
    ),
    // Solo se registran los interruptores del rol (notificationKeysFor).
    notifications: z.object({
      replacement_assigned: z.optional(z.boolean()),
      absence_reported: z.optional(z.boolean()),
      absence_covered: z.optional(z.boolean()),
    }),
  })

export type ProfileFormValues = z.infer<ReturnType<typeof profileSchemaFor>>

// Interruptores de cada rol: el tripulante, el aviso de reemplazo; el supervisor, los de
// ausencias. El admin no tiene (no se llama). El PATCH solo lleva estas claves (el backend
// rechaza las demás).
export const notificationKeysFor = (isCrew: boolean): NotificationKey[] =>
  isCrew ? ["replacement_assigned"] : ["absence_reported", "absence_covered"]
