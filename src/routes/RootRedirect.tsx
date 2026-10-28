import { Navigate } from "react-router"

import { useAuthStore } from "@/stores/auth.store"

import { HOME_PATH_BY_ROLE } from "./navigation"
import { PATHS } from "./paths"

// Envía la raíz al inicio del rol actual, o al login si no hay sesión.
const RootRedirect = () => {
  const user = useAuthStore((state) => state.user)

  return (
    <Navigate to={user ? HOME_PATH_BY_ROLE[user.role] : PATHS.login} replace />
  )
}

export default RootRedirect
