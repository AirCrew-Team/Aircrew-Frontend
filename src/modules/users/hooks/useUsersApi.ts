import * as realApi from "@/App/actions/users/users.actions"
import * as demoApi from "@/modules/users/data/users.data"
import { isDemoUser, useAuthStore } from "@/stores/auth.store"

// Funciones de datos de la pantalla Usuarios. Las cuentas demo y el selector «Rol (dev)»
// usan los datos de ejemplo (no llaman al backend); la sesión real, el servicio admin.
// Las dos fuentes tienen las mismas firmas y devuelven los mismos tipos.
export const useUsersApi = () => {
  const isDemo = useAuthStore((state) => isDemoUser(state.user))
  const api = isDemo ? demoApi : realApi
  return {
    getUserCatalogs: api.getUserCatalogs,
    getUsers: api.getUsers,
    getUsersStats: api.getUsersStats,
    getUserDetail: api.getUserDetail,
    createUser: api.createUser,
    updateUser: api.updateUser,
    deleteUser: api.deleteUser,
    deleteUserPermanently: api.deleteUserPermanently,
  }
}
