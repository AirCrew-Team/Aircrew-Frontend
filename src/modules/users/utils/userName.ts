import type { CrewUser } from "@/modules/users/types/users.types"

type Named = Pick<CrewUser, "firstName" | "lastName">

// Nombre completo: «Diego Salcedo». Un nombre de una sola palabra no tiene apellido.
export const fullName = (user: Named) =>
  [user.firstName, user.lastName].filter(Boolean).join(" ")

// Iniciales del nombre y del último apellido: «Juan Pablo Navarro» → «JN».
export const initials = (user: Named) =>
  `${user.firstName[0] ?? ""}${user.lastName.split(" ").at(-1)?.[0] ?? ""}`.toUpperCase()
