import type { CrewUser } from "@/modules/users/types/users.types"

// Nombre completo: «Diego Salcedo».
export const fullName = (user: CrewUser) => `${user.firstName} ${user.lastName}`

// Iniciales del nombre y del último apellido: «Juan Pablo Navarro» → «JN».
export const initials = (user: CrewUser) =>
  `${user.firstName[0]}${user.lastName.split(" ").at(-1)?.[0] ?? ""}`.toUpperCase()
