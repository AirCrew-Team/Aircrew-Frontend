// Elemento de navegación que el navbar pinta para cada rol.
export interface NavItem {
  label: string
  to: string
  // true cuando la ruta solo debe marcarse activa si coincide exactamente (ej. el inicio).
  end?: boolean
}
