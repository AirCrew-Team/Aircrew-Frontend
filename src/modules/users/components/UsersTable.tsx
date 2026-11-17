import { useEffect, useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"

import {
  BaseIcon,
  CabinCrewIcon,
  EditIcon,
  FlightIcon,
  SecurityIcon,
  SupervisorIcon,
  DeleteIcon,
  ViewIcon,
} from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { cn } from "@/lib/utils"
import DeleteUserDialog from "@/modules/users/components/DeleteUserDialog"
import EditUserDialog from "@/modules/users/components/EditUserDialog"
import UserDetailDialog from "@/modules/users/components/UserDetailDialog"
import UsersPagination from "@/modules/users/components/UsersPagination"
import UserStatusBadge from "@/modules/users/components/UserStatusBadge"
import { USERS_PAGE_SIZE, getUsers } from "@/modules/users/data/users.data"
import { useUsersSearchParams } from "@/modules/users/hooks/useUsersSearchParams"
import type { CrewUser } from "@/modules/users/types/users.types"
import { fullName, initials } from "@/modules/users/utils/userName"

// Cargos de cabina. En la tripulación, el resto (Comandante y Copiloto) son de
// cabina de mando.
const CABIN_TITLES = ["Auxiliar de Vuelo", "Sobrecargo Principal", "Sobrecargo"]

// Ícono de la columna Rol: avión para cabina de mando, asiento para cabina,
// supervisor y escudo para administrador.
const roleIcon = (user: CrewUser) => {
  if (user.roleGroup === "supervisor") return SupervisorIcon
  if (user.roleGroup === "administrador") return SecurityIcon
  return CABIN_TITLES.includes(user.roleTitle) ? CabinCrewIcon : FlightIcon
}

// Botón de acción de la fila: solo ícono, con nombre para el lector de pantalla
// (aria-label) y el mismo texto como ayuda al pasar el mouse (title).
const actionClass =
  "inline-flex size-11 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden lg:size-8"

// Encabezados de columna: etiqueta pequeña en mayúsculas, como en la referencia.
const headerClass = cn(
  typography.labelSm,
  "px-4 py-3 text-left font-semibold text-muted-foreground uppercase first:pl-6 last:pr-6"
)
// En pantallas grandes es una celda normal; por debajo de lg cada fila es una tarjeta
// (ver <tr>) y la celda pasa a ser un bloque sin relleno propio.
const cellClass =
  "min-w-0 align-middle max-lg:block lg:px-4 lg:py-3 lg:first:pl-6 lg:last:pr-6"

// Etiqueta de la columna dentro de la tarjeta (solo pantallas pequeñas, donde el
// encabezado de la tabla no se ve). aria-hidden: el lector ya asocia la celda con su
// encabezado, así no la oye dos veces.
const MobileLabel = ({ children }: { children: string }) => (
  <span
    aria-hidden="true"
    className={cn(
      typography.labelSm,
      "mb-1 block text-muted-foreground uppercase lg:hidden"
    )}
  >
    {children}
  </span>
)

// Bloque 4: tabla de usuarios con su paginación.
const UsersTable = () => {
  const { page, search, role, setPage, hrefForPage } = useUsersSearchParams()
  // La búsqueda espera 300 ms sin teclear antes de consultar: una petición por búsqueda,
  // no por tecla. El campo de la barra sigue mostrando el texto al instante.
  const debouncedSearch = useDebouncedValue(search)
  // ID del usuario cuyo detalle está abierto; null con la ventana cerrada.
  const [detailUserId, setDetailUserId] = useState<string | null>(null)
  // Usuario en edición (lápiz) y usuario a eliminar (papelera); null sin ventana abierta.
  const [editUserId, setEditUserId] = useState<string | null>(null)
  const [userToDelete, setUserToDelete] = useState<CrewUser | null>(null)

  const params = {
    page,
    pageSize: USERS_PAGE_SIZE,
    search: debouncedSearch,
    role,
  }
  // La clave incluye los parámetros: cada página (y cada búsqueda o filtro) queda en
  // caché por separado, así volver a una página ya vista no repite la petición.
  // keepPreviousData: al cambiar de página se mantiene la tabla anterior hasta que
  // llega la nueva, en lugar de vaciarla y mostrar «Cargando».
  const { data, isPending, isError, isPlaceholderData } = useQuery({
    queryKey: ["users", "list", params],
    queryFn: () => getUsers(params),
    placeholderData: keepPreviousData,
  })

  // Páginas totales según lo que diga el backend (total ÷ registros por página).
  // Mínimo 1, para que la paginación tenga siempre una página aunque no haya datos.
  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : 1

  // Si la URL pide una página que no existe (ej. ?page=99), se corrige a la última
  // sin dejar la dirección inválida en el historial.
  useEffect(() => {
    if (data && !isPlaceholderData && page > totalPages) {
      setPage(totalPages, { replace: true })
    }
  }, [data, isPlaceholderData, page, totalPages, setPage])

  // Estados de la lista: cargando (status) o error (alert). Si falla, solo la tabla
  // muestra el error; los indicadores y la barra siguen funcionando.
  if (isPending) {
    return (
      <p
        role="status"
        className={cn(
          typography.bodySm,
          "rounded-xl bg-card p-6 text-muted-foreground shadow-sm"
        )}
      >
        Cargando usuarios…
      </p>
    )
  }

  if (isError) {
    return (
      <p
        role="alert"
        className={cn(
          typography.bodySm,
          "rounded-xl bg-card p-6 text-destructive shadow-sm"
        )}
      >
        No se pudieron cargar los usuarios.
      </p>
    )
  }

  return (
    <section
      aria-label="Directorio de personal"
      // aria-busy: mientras llega la página nueva, el lector sabe que la tabla se actualiza.
      aria-busy={isPlaceholderData}
      className="overflow-hidden rounded-xl bg-card shadow-sm"
    >
      {/* Sin resultados: mensaje según haya búsqueda o solo filtro, en vez de una
          tabla vacía. */}
      {data.items.length === 0 ? (
        <p className={cn(typography.bodyMd, "p-6 text-muted-foreground")}>
          {debouncedSearch
            ? `Ningún usuario coincide con «${debouncedSearch}».`
            : "No hay usuarios para este filtro."}
        </p>
      ) : (
        // Escritorio (lg): tabla. Celular y tablet: cada usuario es una tarjeta apilada.
        // Los role explícitos conservan la semántica de tabla aunque el CSS cambie el
        // display (algunos navegadores la pierden con display:block o grid).
        <div className="lg:overflow-x-auto">
          <table
            role="table"
            className="w-full border-collapse max-lg:block lg:min-w-3xl"
          >
            {/* Título de la tabla solo para el lector de pantalla, con la página actual. */}
            <caption className="sr-only">
              Usuarios, página {data.page} de {totalPages}
            </caption>
            {/* El encabezado solo se oculta a la vista en pantallas pequeñas. */}
            <thead role="rowgroup" className="bg-muted max-lg:sr-only">
              <tr role="row">
                <th role="columnheader" scope="col" className={headerClass}>
                  Nombre
                </th>
                <th role="columnheader" scope="col" className={headerClass}>
                  ID
                </th>
                <th role="columnheader" scope="col" className={headerClass}>
                  Rol
                </th>
                <th role="columnheader" scope="col" className={headerClass}>
                  Base
                </th>
                <th role="columnheader" scope="col" className={headerClass}>
                  Estado
                </th>
                <th
                  role="columnheader"
                  scope="col"
                  className={cn(headerClass, "text-right")}
                >
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody
              role="rowgroup"
              className="divide-y divide-brand-border max-lg:block"
            >
              {data.items.map((user) => {
                const name = fullName(user)
                const RoleIcon = roleIcon(user)
                return (
                  // Tarjeta (por debajo de lg): nombre arriba, luego ID, rol, base y
                  // estado en dos columnas, y los botones abajo a todo el ancho.
                  <tr
                    key={user.id}
                    role="row"
                    className="max-lg:grid max-lg:grid-cols-2 max-lg:gap-x-4 max-lg:gap-y-3 max-lg:p-4"
                  >
                    {/* Nombre: avatar con iniciales (mismo azul que el avatar del navbar), nombre y correo. */}
                    <td
                      role="cell"
                      className={cn(cellClass, "max-lg:col-span-2")}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className={cn(
                            typography.labelLg,
                            "flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-secondary font-heading font-bold text-white"
                          )}
                        >
                          {initials(user)}
                        </span>
                        <div className="flex min-w-0 flex-col">
                          <span
                            className={cn(
                              typography.labelLg,
                              "font-bold text-brand-primary"
                            )}
                          >
                            {name}
                          </span>
                          <span
                            className={cn(
                              typography.bodySm,
                              "text-muted-foreground"
                            )}
                          >
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td role="cell" className={cellClass}>
                      <MobileLabel>ID</MobileLabel>
                      <span
                        className={cn(
                          typography.labelSm,
                          "rounded-sm bg-brand-neutral px-2 py-1 font-mono text-brand-primary"
                        )}
                      >
                        {user.id}
                      </span>
                    </td>
                    <td role="cell" className={cellClass}>
                      <MobileLabel>Rol</MobileLabel>
                      <span
                        className={cn(
                          typography.bodySm,
                          "flex items-center gap-1.5 font-medium text-brand-primary"
                        )}
                      >
                        <RoleIcon
                          aria-hidden="true"
                          className="size-4 shrink-0 text-brand-secondary"
                        />
                        {user.roleTitle}
                      </span>
                    </td>
                    <td role="cell" className={cellClass}>
                      <MobileLabel>Base</MobileLabel>
                      <span
                        className={cn(
                          typography.labelMd,
                          "flex items-center gap-1 font-semibold text-brand-primary"
                        )}
                      >
                        <BaseIcon
                          aria-hidden="true"
                          className="size-4 shrink-0 text-muted-foreground"
                        />
                        {user.base}
                      </span>
                    </td>
                    <td role="cell" className={cellClass}>
                      <MobileLabel>Estado</MobileLabel>
                      <UserStatusBadge status={user.status} />
                    </td>
                    {/* Acciones: el nombre en el aria-label dice a quién se refiere cada botón. */}
                    <td
                      role="cell"
                      className={cn(cellClass, "max-lg:col-span-2")}
                    >
                      {/* Ojo (detalle), lápiz (editar) y papelera (eliminar). En la tarjeta
                          de celular quedan a la derecha, separados del resto. */}
                      <div className="flex items-center justify-end gap-1 max-lg:border-t max-lg:border-brand-border max-lg:pt-2">
                        <button
                          type="button"
                          aria-label={`Ver más información de ${name}`}
                          title="Ver más información"
                          onClick={() => setDetailUserId(user.id)}
                          className={cn(
                            actionClass,
                            "bg-brand-neutral text-brand-secondary hover:bg-brand-border"
                          )}
                        >
                          <ViewIcon aria-hidden="true" className="size-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Editar a ${name}`}
                          title="Editar"
                          onClick={() => setEditUserId(user.id)}
                          className={cn(
                            actionClass,
                            "text-brand-primary hover:bg-brand-neutral"
                          )}
                        >
                          <EditIcon aria-hidden="true" className="size-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Eliminar a ${name}`}
                          title="Eliminar"
                          onClick={() => setUserToDelete(user)}
                          className={cn(
                            actionClass,
                            "text-destructive hover:bg-destructive/10"
                          )}
                        >
                          <DeleteIcon aria-hidden="true" className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pie: cuántos se muestran y la paginación. Móvil: apilados. Desde sm: en una fila. */}
      <div className="flex flex-col gap-3 bg-muted px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          className={cn(
            typography.labelSm,
            "font-semibold text-muted-foreground"
          )}
        >
          Mostrando {data.items.length} de {data.total} miembros registrados
        </p>
        <UsersPagination
          page={Math.min(page, totalPages)}
          totalPages={totalPages}
          hrefForPage={hrefForPage}
        />
      </div>

      {/* Ventana de detalle: se abre con «Ver más información» y pide los datos de ese usuario. */}
      <UserDetailDialog
        userId={detailUserId}
        onClose={() => setDetailUserId(null)}
      />
      {/* Edición: el formulario del alta, lleno con los datos del usuario. */}
      <EditUserDialog userId={editUserId} onClose={() => setEditUserId(null)} />
      {/* Confirmación de eliminación. */}
      <DeleteUserDialog
        user={userToDelete}
        onClose={() => setUserToDelete(null)}
      />
    </section>
  )
}

export default UsersTable
