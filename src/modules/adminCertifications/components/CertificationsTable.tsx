import { useEffect, useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"

import {
  CabinCrewIcon,
  DeleteIcon,
  FlightIcon,
  ViewIcon,
} from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import Pagination from "@/components/custom/Pagination"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { cn } from "@/lib/utils"
import CertificationDetailDialog from "@/modules/adminCertifications/components/CertificationDetailDialog"
import CertificationFormDialog, {
  type CertificationFormTarget,
} from "@/modules/adminCertifications/components/CertificationFormDialog"
import CertificationStatusBadge from "@/modules/adminCertifications/components/CertificationStatusBadge"
import DeleteCertificationDialog from "@/modules/adminCertifications/components/DeleteCertificationDialog"
import {
  CERTIFICATIONS_PAGE_SIZE,
  getCertifications,
} from "@/modules/adminCertifications/data/adminCertifications.data"
import { useCertificationsSearchParams } from "@/modules/adminCertifications/hooks/useCertificationsSearchParams"
import type { CrewCertification } from "@/modules/adminCertifications/types/adminCertifications.types"
import { CERTIFICATES } from "@/modules/adminCertifications/utils/certificates"
import {
  crewInitials,
  crewName,
} from "@/modules/adminCertifications/utils/crewFormat"

// Encabezados de columna: etiqueta pequeña en mayúsculas, como en la referencia.
const headerClass = cn(
  typography.labelSm,
  "px-4 py-3 text-left font-semibold text-muted-foreground uppercase first:pl-6 last:pr-6"
)
// En pantallas grandes es una celda normal; por debajo de lg cada fila es una tarjeta
// (ver <tr>) y la celda pasa a ser un bloque sin relleno propio.
const cellClass =
  "min-w-0 align-middle max-lg:block lg:px-4 lg:py-3 lg:first:pl-6 lg:last:pr-6"

// Botón de acción de la fila: solo ícono, con nombre para el lector de pantalla
// (aria-label) y el mismo texto como ayuda al pasar el mouse (title).
const actionClass =
  "inline-flex size-11 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden lg:size-8"

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

// Bloque 4: tabla de certificaciones con su paginación (5 por página).
const CertificationsTable = () => {
  const { page, search, filter, setPage, hrefForPage } =
    useCertificationsSearchParams()
  // La búsqueda espera 300 ms sin teclear antes de consultar: una petición por búsqueda,
  // no por tecla. El campo de la barra sigue mostrando el texto al instante.
  const debouncedSearch = useDebouncedValue(search)
  // Ventanas de la fila: ficha (ojo), formulario (desde la ficha) y eliminar
  // (papelera). null: cerrada.
  const [detailId, setDetailId] = useState<string | null>(null)
  const [formTarget, setFormTarget] = useState<CertificationFormTarget | null>(
    null
  )
  const [toDelete, setToDelete] = useState<CrewCertification | null>(null)

  const params = {
    page,
    pageSize: CERTIFICATIONS_PAGE_SIZE,
    search: debouncedSearch,
    status: filter,
  }
  // La clave incluye los parámetros: cada página (y cada búsqueda o filtro) queda en
  // caché por separado, así volver a una página ya vista no repite la petición.
  // keepPreviousData: al cambiar de página se mantiene la tabla anterior hasta que
  // llega la nueva, en lugar de vaciarla y mostrar «Cargando».
  const { data, isPending, isError, isPlaceholderData } = useQuery({
    queryKey: ["certifications", "adminList", params],
    queryFn: () => getCertifications(params),
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
        Cargando certificaciones…
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
        No se pudieron cargar las certificaciones.
      </p>
    )
  }

  return (
    <section
      aria-label="Certificaciones FAA de la tripulación"
      // aria-busy: mientras llega la página nueva, el lector sabe que la tabla se actualiza.
      aria-busy={isPlaceholderData}
      className="overflow-hidden rounded-xl bg-card shadow-sm"
    >
      {/* Sin resultados: mensaje según haya búsqueda o solo filtro. */}
      {data.items.length === 0 ? (
        <p className={cn(typography.bodyMd, "p-6 text-muted-foreground")}>
          {debouncedSearch
            ? `Ninguna certificación coincide con «${debouncedSearch}».`
            : "No hay tripulantes para este filtro."}
        </p>
      ) : (
        // Escritorio (lg): tabla. Celular y tablet: cada tripulante es una tarjeta.
        // Los role explícitos conservan la semántica de tabla aunque el CSS cambie el
        // display (algunos navegadores la pierden con display:block o grid).
        <div className="lg:overflow-x-auto">
          <table
            role="table"
            className="w-full border-collapse max-lg:block lg:min-w-4xl"
          >
            {/* Título de la tabla solo para el lector de pantalla, con la página actual. */}
            <caption className="sr-only">
              Certificaciones, página {data.page} de {totalPages}
            </caption>
            {/* El encabezado solo se oculta a la vista en pantallas pequeñas. */}
            <thead role="rowgroup" className="bg-muted max-lg:sr-only">
              <tr role="row">
                {[
                  "Nombre",
                  "ID",
                  "Cargo",
                  "Licencia FAA",
                  "Certificados",
                  "Estado",
                ].map((label) => (
                  <th
                    key={label}
                    role="columnheader"
                    scope="col"
                    className={headerClass}
                  >
                    {label}
                  </th>
                ))}
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
              {data.items.map((crew) => {
                const name = crewName(crew)
                const AreaIcon =
                  crew.area === "cabina_mando" ? FlightIcon : CabinCrewIcon
                const hasCertification = crew.status !== "sin_certificado"
                return (
                  // Tarjeta (por debajo de lg): nombre arriba, luego los datos en dos
                  // columnas y los botones abajo a la derecha.
                  <tr
                    key={crew.id}
                    role="row"
                    className="max-lg:grid max-lg:grid-cols-2 max-lg:gap-x-4 max-lg:gap-y-3 max-lg:p-4"
                  >
                    {/* Nombre: avatar con iniciales (azul del navbar), nombre y correo. */}
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
                          {crewInitials(crew)}
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
                              "break-all text-muted-foreground"
                            )}
                          >
                            {crew.email}
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
                        {crew.id}
                      </span>
                    </td>
                    {/* Cargo con su ícono (avión: cabina de mando; asiento: cabina) y la base. */}
                    <td role="cell" className={cellClass}>
                      <MobileLabel>Cargo</MobileLabel>
                      <span
                        className={cn(
                          typography.bodySm,
                          "flex items-center gap-1.5 font-medium text-brand-primary"
                        )}
                      >
                        <AreaIcon
                          aria-hidden="true"
                          className="size-4 shrink-0 text-brand-secondary"
                        />
                        {crew.roleTitle}
                      </span>
                      <span
                        className={cn(
                          typography.bodySm,
                          "block pl-5.5 text-muted-foreground"
                        )}
                      >
                        Base {crew.base}
                      </span>
                    </td>
                    {/* Licencia: el número, o «Sin registrar» si no tiene certificación. */}
                    <td role="cell" className={cellClass}>
                      <MobileLabel>Licencia FAA</MobileLabel>
                      <span
                        className={cn(
                          typography.labelMd,
                          "font-mono",
                          crew.licenseNumber
                            ? "font-semibold text-brand-primary"
                            : "text-muted-foreground"
                        )}
                      >
                        {crew.licenseNumber ?? "Sin registrar"}
                      </span>
                    </td>
                    {/* Certificados: siglas con su nombre completo al pasar el mouse;
                        «—» (leído como «Ninguno») si no tiene. */}
                    <td role="cell" className={cellClass}>
                      <MobileLabel>Certificados</MobileLabel>
                      {crew.certificates.length > 0 ? (
                        <ul
                          aria-label="Certificados"
                          className="flex flex-wrap gap-1.5"
                        >
                          {crew.certificates.map((code) => (
                            <li
                              key={code}
                              title={CERTIFICATES[code]?.name}
                              className={cn(
                                typography.labelSm,
                                "rounded-full bg-brand-neutral px-2 py-0.5 text-brand-primary"
                              )}
                            >
                              {CERTIFICATES[code]?.short ?? code}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-muted-foreground">
                          <span aria-hidden="true">—</span>
                          <span className="sr-only">Ninguno</span>
                        </span>
                      )}
                    </td>
                    <td role="cell" className={cellClass}>
                      <MobileLabel>Estado</MobileLabel>
                      <CertificationStatusBadge status={crew.status} />
                    </td>
                    {/* Acciones: ojo (detalle) y papelera (solo si hay certificación que
                        eliminar). El nombre en el aria-label dice a quién se refiere. */}
                    <td
                      role="cell"
                      className={cn(cellClass, "max-lg:col-span-2")}
                    >
                      <div className="flex items-center justify-end gap-1 max-lg:border-t max-lg:border-brand-border max-lg:pt-2">
                        <button
                          type="button"
                          aria-label={`Ver certificación de ${name}`}
                          title="Ver certificación"
                          onClick={() => setDetailId(crew.id)}
                          className={cn(
                            actionClass,
                            "bg-brand-neutral text-brand-secondary hover:bg-brand-border"
                          )}
                        >
                          <ViewIcon aria-hidden="true" className="size-4" />
                        </button>
                        {hasCertification ? (
                          <button
                            type="button"
                            aria-label={`Eliminar la certificación de ${name}`}
                            title="Eliminar certificación"
                            onClick={() => setToDelete(crew)}
                            className={cn(
                              actionClass,
                              "text-destructive hover:bg-destructive/10"
                            )}
                          >
                            <DeleteIcon aria-hidden="true" className="size-4" />
                          </button>
                        ) : (
                          // Espacio del botón: los ojos quedan alineados entre filas.
                          <span
                            aria-hidden="true"
                            className="size-11 lg:size-8"
                          />
                        )}
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
          Mostrando {data.items.length} de {data.total} tripulantes
        </p>
        {/* Paginación genérica (components/custom): solo cambia ?page= en la URL. */}
        <Pagination
          label="Paginación de certificaciones"
          page={Math.min(page, totalPages)}
          totalPages={totalPages}
          hrefForPage={hrefForPage}
        />
      </div>

      {/* Ficha de la certificación (ojo). «Editar» o «Registrar certificado» cierran
          la ficha y abren el formulario con ese tripulante. */}
      <CertificationDetailDialog
        crewId={detailId}
        onClose={() => setDetailId(null)}
        onEdit={(crewId) => {
          setDetailId(null)
          setFormTarget({ crewId })
        }}
      />
      {/* Formulario para registrar o editar la certificación de un tripulante. */}
      <CertificationFormDialog
        target={formTarget}
        onClose={() => setFormTarget(null)}
      />
      {/* Confirmación para eliminar una certificación. */}
      <DeleteCertificationDialog
        crew={toDelete}
        onClose={() => setToDelete(null)}
      />
    </section>
  )
}

export default CertificationsTable
