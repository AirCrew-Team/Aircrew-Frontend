import { Navigate, Outlet } from "react-router"

import type { Role } from "@/App/types/auth.types"
import { useAuthStore } from "@/stores/auth.store"

import { HOME_PATH_BY_ROLE } from "./navigation"
import { PATHS } from "./paths"

interface ProtectedRouteProps {
  allowedRoles: Role[]
}

// Deja pasar solo a usuarios con sesión y con uno de los roles permitidos.
const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const user = useAuthStore((state) => state.user)

  if (!user) {
    return <Navigate to={PATHS.login} replace />
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={HOME_PATH_BY_ROLE[user.role]} replace />
  }

  return <Outlet />
}

export default ProtectedRoute
