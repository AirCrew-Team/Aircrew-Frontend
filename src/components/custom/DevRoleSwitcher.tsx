import { useNavigate } from "react-router"

import { ROLES, type Role } from "@/App/types/auth.types"
import { HOME_PATH_BY_ROLE } from "@/routes/navigation"
import { useAuthStore } from "@/stores/auth.store"

// Solo desarrollo: cambia el rol de la sesión simulada. Eliminar al integrar el login real.
const DevRoleSwitcher = () => {
  const navigate = useNavigate()
  const role = useAuthStore((state) => state.user?.role)
  const setMockRole = useAuthStore((state) => state.setMockRole)

  const handleChange = (nextRole: Role) => {
    setMockRole(nextRole)
    navigate(HOME_PATH_BY_ROLE[nextRole])
  }

  return (
    <label className="fixed right-4 bottom-4 z-50 flex items-center gap-2 rounded-md border border-dashed border-brand-border bg-white px-3 py-2 text-xs text-muted-foreground shadow-sm">
      Rol (dev)
      <select
        value={role ?? ""}
        onChange={(event) => handleChange(event.target.value as Role)}
        className="rounded border border-brand-border bg-white px-1 py-0.5 text-brand-primary"
      >
        <option value="" disabled>
          Sin sesión
        </option>
        {Object.values(ROLES).map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </label>
  )
}

export default DevRoleSwitcher
