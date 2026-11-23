import { isDemoUser, useAuthStore } from "@/stores/auth.store"

// true con una cuenta demo o el selector «Rol (dev)» (D4): las funciones de datos del
// supervisor devuelven entonces los datos de ejemplo (*.demo.ts) sin llamar al backend.
// Se lee al llamar, no al importar, porque la sesión cambia durante el uso.
export const isDemoSession = () => isDemoUser(useAuthStore.getState().user)

// Une la versión del backend y la de ejemplo de una función de datos: los componentes
// llaman siempre a la misma función y la sesión decide de dónde salen los datos.
export const withDemo =
  <Args extends unknown[], Result>(
    fromApi: (...args: Args) => Promise<Result>,
    fromDemo: (...args: Args) => Promise<Result>
  ) =>
  (...args: Args): Promise<Result> =>
    isDemoSession() ? fromDemo(...args) : fromApi(...args)
