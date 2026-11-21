import { useEffect, useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { DeleteIcon, ViewIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import Pagination from "@/components/custom/Pagination"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { cn } from "@/lib/utils"
import AircraftFormDialog, {
  type AircraftFormTarget,
} from "@/modules/aircraft/components/AircraftFormDialog"
import AircraftReportDialog from "@/modules/aircraft/components/AircraftReportDialog"
import DeleteAircraftDialog from "@/modules/aircraft/components/DeleteAircraftDialog"
import { AIRCRAFT_PAGE_SIZE } from "@/modules/aircraft/data/aircraft.data"
import {
  useAircraftApi,
  useMaintenanceLabel,
} from "@/modules/aircraft/hooks/useAircraftApi"
import { useAircraftSearchParams } from "@/modules/aircraft/hooks/useAircraftSearchParams"
import { aircraftPhotoSrc } from "@/modules/aircraft/utils/aircraftPhoto"
import type { Aircraft } from "@/App/types/aircraft.types"
import {
  AIRCRAFT_STATUS,
  categoryLabel,
  crewTextOf,
  statusLabelOf,
} from "@/modules/aircraft/utils/aircraftStatus"

// Encabezados de columna: etiqueta pequeña en mayúsculas, como en Certificaciones.
const headerClass = cn(
  typography.labelSm,
  "px-4 py-3 text-left font-semibold text-muted-foreground uppercase first:pl-6 last:pr-6"
)
// En pantallas grandes es una celda normal; por debajo de lg cada fila es una tarjeta
// (ver <tr>) y la celda pasa a ser un bloque sin relleno propio.
const cellClass =
  "min-w-0 align-middle max-lg:block lg:px-4 lg:py-3 lg:first:pl-6 lg:last:pr-6"

// Botón de acción de la fila: solo ícono, con nombre para el lector de pantalla
// (aria-label) y el mismo texto como ayuda al pasar el mouse (title). Colores como en
// Certificaciones: el ojo en azul y la papelera en rojo.
const actionClass =
  "inline-flex size-11 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden lg:size-8"
const viewClass = cn(
  actionClass,
  "bg-brand-neutral text-brand-secondary hover:bg-brand-border"
)

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

// Bloque 4: tabla de la flota con su paginación (5 por página, como Usuarios y
// Certificaciones).
const AircraftTable = () => {
  const { page, search, filter, setPage, hrefForPage } =
    useAircraftSearchParams()
  const { getAircraft } = useAircraftApi()
  const maintenanceLabel = useMaintenanceLabel()
  // La búsqueda espera 300 ms sin teclear antes de consultar: una petición por búsqueda,
  // no por tecla. El campo de la barra sigue mostrando el texto al instante.
  const debouncedSearch = useDebouncedValue(search)
  // Ventanas de la fila. null: cerrada.
  const [reportOf, setReportOf] = useState<Aircraft | null>(null)
  const [toDelete, setToDelete] = useState<Aircraft | null>(null)
  const [formTarget, setFormTarget] = useState<AircraftFormTarget | null>(null)

  const params = {
    page,
    pageSize: AIRCRAFT_PAGE_SIZE,
    search: debouncedSearch,
    status: filter,
  }
  // La clave incluye los parámetros: cada página (y cada búsqueda o filtro) queda en
  // caché por separado. keepPreviousData: al cambiar de página se mantiene la tabla
  // anterior hasta que llega la nueva, en lugar de vaciarla y mostrar «Cargando».
  const { data, isPending, isError, isPlaceholderData } = useQuery({
    queryKey: ["aircraft", "list", params],
    queryFn: () => getAircraft(params),
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
        Cargando aeronaves…
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
        No se pudieron cargar las aeronaves.
      </p>
    )
  }

  return (
    <section
      aria-label="Flota de aeronaves"
      // aria-busy: mientras llega la página nueva, el lector sabe que la tabla se actualiza.
      aria-busy={isPlaceholderData}
      className="overflow-hidden rounded-xl bg-card shadow-sm"
    >
      {/* Sin resultados: mensaje según haya búsqueda o solo filtro. */}
      {data.items.length === 0 ? (
        <p className={cn(typography.bodyMd, "p-6 text-muted-foreground")}>
          {debouncedSearch
            ? `Ninguna aeronave coincide con «${debouncedSearch}».`
            : "No hay aeronaves para este filtro."}
        </p>
      ) : (
        // Escritorio (lg): tabla. Celular y tablet: cada aeronave es una tarjeta.
        // Los role explícitos conservan la semántica de tabla aunque el CSS cambie el
        // display (algunos navegadores la pierden con display:block o grid).
        <div className="lg:overflow-x-auto">
          <table
            role="table"
            className="w-full border-collapse max-lg:block lg:min-w-4xl"
          >
            {/* Título de la tabla solo para el lector de pantalla, con la página actual. */}
            <caption className="sr-only">
              Aeronaves, página {data.page} de {totalPages}
            </caption>
            {/* El encabezado solo se oculta a la vista en pantallas pequeñas. */}
            <thead role="rowgroup" className="bg-muted max-lg:sr-only">
              <tr role="row">
                {["Aeronave", "Categoría", "Capacidad", "Base", "Estado"].map(
                  (label) => (
                    <th
                      key={label}
                      role="columnheader"
                      scope="col"
                      className={headerClass}
                    >
                      {label}
                    </th>
                  )
                )}
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
              {data.items.map((aircraft) => {
                const status = AIRCRAFT_STATUS[aircraft.status]
                const { registration } = aircraft
                return (
                  // Tarjeta (por debajo de lg): matrícula arriba, luego los datos en dos
                  // columnas y los botones abajo a la derecha.
                  <tr
                    key={aircraft.id}
                    role="row"
                    className="max-lg:grid max-lg:grid-cols-2 max-lg:gap-x-4 max-lg:gap-y-3 max-lg:p-4"
                  >
                    {/* Aeronave: foto en miniatura, matrícula, modelo y número de serie. */}
                    <td
                      role="cell"
                      className={cn(cellClass, "max-lg:col-span-2")}
                    >
                      <div className="flex items-center gap-3">
                        {/* La foto acompaña a la matrícula, que ya nombra la fila. */}
                        <img
                          src={aircraftPhotoSrc(aircraft.photoUrl)}
                          alt=""
                          loading="lazy"
                          className="h-12 w-18 shrink-0 rounded-md object-cover"
                        />
                        <div className="flex min-w-0 flex-col">
                          <span
                            className={cn(
                              typography.labelLg,
                              "font-mono font-bold text-brand-primary"
                            )}
                          >
                            {registration}
                          </span>
                          <span
                            className={cn(
                              typography.bodySm,
                              "text-muted-foreground"
                            )}
                          >
                            {aircraft.modelName} · MSN {aircraft.msn}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td role="cell" className={cellClass}>
                      <MobileLabel>Categoría</MobileLabel>
                      <span
                        className={cn(
                          typography.labelSm,
                          "rounded-sm bg-brand-neutral px-2 py-1 font-semibold text-brand-secondary uppercase"
                        )}
                      >
                        {categoryLabel(aircraft.category)}
                      </span>
                    </td>
                    {/* Capacidad y tripulación mínima del modelo. */}
                    <td role="cell" className={cellClass}>
                      <MobileLabel>Capacidad</MobileLabel>
                      <span
                        className={cn(
                          typography.bodySm,
                          "block font-medium text-brand-primary"
                        )}
                      >
                        {aircraft.capacity} pasajeros
                      </span>
                      <span
                        className={cn(
                          typography.bodySm,
                          "block text-muted-foreground"
                        )}
                      >
                        {crewTextOf(aircraft.minimumCrew)}
                      </span>
                    </td>
                    <td role="cell" className={cellClass}>
                      <MobileLabel>Base</MobileLabel>
                      <span
                        className={cn(typography.bodySm, "text-brand-primary")}
                      >
                        {aircraft.baseName}
                      </span>
                    </td>
                    <td role="cell" className={cellClass}>
                      <MobileLabel>Estado</MobileLabel>
                      <span
                        className={cn(
                          typography.labelSm,
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold whitespace-nowrap",
                          status.badgeClass
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "size-2 shrink-0 rounded-full",
                            status.dotClass
                          )}
                        />
                        {statusLabelOf(aircraft)}
                      </span>
                      {aircraft.maintenanceType ? (
                        <span
                          className={cn(
                            typography.bodySm,
                            "mt-1 block text-muted-foreground"
                          )}
                        >
                          {maintenanceLabel(aircraft.maintenanceType)}
                        </span>
                      ) : null}
                    </td>
                    {/* Acciones, como en Certificaciones: ojo (informe, desde donde
                        también se edita) y papelera (eliminar). La matrícula en el
                        aria-label dice a qué aeronave se refiere. */}
                    <td
                      role="cell"
                      className={cn(cellClass, "max-lg:col-span-2")}
                    >
                      <div className="flex items-center justify-end gap-1 max-lg:border-t max-lg:border-brand-border max-lg:pt-2">
                        <button
                          type="button"
                          aria-label={`Ver informe de ${registration}`}
                          title="Ver informe"
                          onClick={() => setReportOf(aircraft)}
                          className={viewClass}
                        >
                          <ViewIcon aria-hidden="true" className="size-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Eliminar aeronave ${registration}`}
                          title="Eliminar aeronave"
                          onClick={() => setToDelete(aircraft)}
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

      {/* Pie: cuántas se muestran y la paginación. Móvil: apilados. Desde sm: en una fila. */}
      <div className="flex flex-col gap-3 bg-muted px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          className={cn(
            typography.labelSm,
            "font-semibold text-muted-foreground"
          )}
        >
          Mostrando {data.items.length} de {data.total} aeronaves
        </p>
        {/* Paginación genérica (components/custom): solo cambia ?page= en la URL. */}
        <Pagination
          label="Paginación de aeronaves"
          page={Math.min(page, totalPages)}
          totalPages={totalPages}
          hrefForPage={hrefForPage}
        />
      </div>

      {/* Informe (ojo). «Editar» cierra el informe y abre el formulario. */}
      <AircraftReportDialog
        aircraft={reportOf}
        onClose={() => setReportOf(null)}
        onEdit={(selected) => {
          setReportOf(null)
          setFormTarget({ aircraft: selected })
        }}
      />
      {/* Confirmación de la papelera. */}
      <DeleteAircraftDialog
        aircraft={toDelete}
        onClose={() => setToDelete(null)}
      />
      <AircraftFormDialog
        target={formTarget}
        onClose={() => setFormTarget(null)}
      />
    </section>
  )
}

export default AircraftTable
