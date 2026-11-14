import { useId, useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import {
  CertificationIcon,
  CloseIcon,
  ConfirmedIcon,
  UploadIcon,
} from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import CertificationDialogHeader from "@/modules/adminCertifications/components/CertificationDialogHeader"
import CertificationStatusBadge from "@/modules/adminCertifications/components/CertificationStatusBadge"
import {
  getCertificationDetail,
  getUncertifiedCrew,
  saveCertification,
} from "@/modules/adminCertifications/data/adminCertifications.data"
import {
  certificationSchema,
  type CertificationFormValues,
} from "@/modules/adminCertifications/schemas/certification.schema"
import type {
  CertificateFile,
  CrewCertification,
} from "@/modules/adminCertifications/types/adminCertifications.types"
import {
  certificateName,
  certificateOptionsFor,
} from "@/modules/adminCertifications/utils/certificates"
import {
  crewInitials,
  crewName,
  crewRoleLine,
} from "@/modules/adminCertifications/utils/crewFormat"

// Copia del certificado: PDF o imagen de hasta 5 MB.
const ACCEPTED_FILES = ".pdf,.png,.jpg,.jpeg"
const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg"]
const MAX_FILE_BYTES = 5 * 1024 * 1024

// Contra qué se verifica, según el cargo (texto de la sección «Verificación»).
const VERIFY_HELP: Record<
  CrewCertification["area"],
  { title: string; detail: string }
> = {
  cabina_mando: {
    title: "Compara con el certificado físico del piloto",
    detail: "O con Airmen Inquiry, el registro público de pilotos de la FAA.",
  },
  cabina: {
    title: "Compara con el certificado físico del tripulante",
    detail:
      "O con el sistema de certificación de tripulantes de cabina de la FAA, al que accede el Director de Operaciones.",
  },
}

// Campos de texto y listas con el mismo borde, foco y error que los formularios del proyecto.
// text-base por debajo de lg: con menos de 16 px iOS hace zoom al enfocar.
const controlClass = cn(
  typography.bodySm,
  "min-h-11 w-full min-w-0 rounded-sm border border-muted-foreground/70 bg-card px-3 py-2 text-brand-primary shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-brand-tertiary focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden aria-invalid:border-2 aria-invalid:border-destructive motion-reduce:transition-none max-lg:text-base max-lg:leading-6 lg:min-h-10"
)
const cardClass = "min-w-0 rounded-lg bg-card p-4 shadow-xs"
// float-left + w-full: la legend queda dentro de la tarjeta como un título normal; lo
// que sigue la despeja con clear-both.
const legendClass = cn(
  typography.labelSm,
  "float-left mb-3 w-full text-brand-secondary uppercase"
)
const fieldLabelClass = cn(
  typography.labelMd,
  "font-semibold text-brand-primary"
)
const errorClass = cn(typography.bodySm, "text-destructive")

// Asterisco de obligatorio: visual; el control ya lo dice (aria-required o el error).
const RequiredMark = () => (
  <span aria-hidden="true" className="text-destructive">
    {" "}
    *
  </span>
)

// Tarjeta del tripulante: avatar, nombre, cargo y base, ID y estado.
const CrewCard = ({ crew }: { crew: CrewCertification }) => (
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div className="flex min-w-0 items-center gap-3">
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
          className={cn(typography.labelLg, "font-bold text-brand-primary")}
        >
          {crewName(crew)}
        </span>
        <span className={cn(typography.bodySm, "text-muted-foreground")}>
          {crewRoleLine(crew)}
        </span>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <span
        className={cn(
          typography.labelSm,
          "rounded-sm bg-brand-neutral px-2 py-1 font-mono text-brand-primary"
        )}
      >
        {crew.id}
      </span>
      <CertificationStatusBadge status={crew.status} />
    </div>
  </div>
)

interface CertificationFormProps {
  // Tripulante fijo (al editar o al registrar desde su ficha), con su copia actual.
  fixedCrew?: CrewCertification & { file: CertificateFile | null }
  // Tripulantes sin certificado, para elegir al registrar desde la barra.
  crewOptions?: CrewCertification[]
  onSaved: () => void
}

// Formulario con los datos ya cargados. Se monta al abrir la ventana: cada apertura
// empieza con los valores del tripulante (o vacía).
const CertificationForm = ({
  fixedCrew,
  crewOptions = [],
  onSaved,
}: CertificationFormProps) => {
  const id = useId()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Copia del certificado: un archivo nuevo, null (quitar la que había) o undefined
  // (dejar la que había). Va fuera de react-hook-form porque es un File, no texto.
  const [newFile, setNewFile] = useState<File | null | undefined>(undefined)
  const [fileError, setFileError] = useState<string | null>(null)

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CertificationFormValues>({
    resolver: zodResolver(certificationSchema),
    defaultValues: {
      crewId: fixedCrew?.id ?? "",
      area: fixedCrew?.area ?? "",
      licenseNumber: fixedCrew?.licenseNumber ?? "",
      certificates: fixedCrew?.certificates ?? [],
      verified: fixedCrew?.status === "verificado",
    },
  })
  // useWatch: valores en vivo de los campos que cambian lo que se muestra.
  const crewId = useWatch({ control, name: "crewId" })
  const verified = useWatch({ control, name: "verified" })

  const crew =
    fixedCrew ?? crewOptions.find((option) => option.id === crewId) ?? null
  const certificateOptions = crew ? certificateOptionsFor(crew.roleTitle) : []
  // Copia que se verá: la nueva, ninguna si se quitó, o la que ya tenía.
  const shownFileName =
    newFile === undefined ? (fixedCrew?.file?.name ?? null) : newFile?.name

  // Guardar (con la API, un PUT de la certificación del tripulante).
  const mutation = useMutation({
    mutationFn: (values: CertificationFormValues) =>
      saveCertification(values.crewId, {
        licenseNumber: values.licenseNumber,
        certificates: values.certificates,
        verified: values.verified,
        file: newFile,
      }),
    onSuccess: (saved) => {
      // Refresca la tabla, los indicadores, los filtros y la ficha.
      queryClient.invalidateQueries({ queryKey: ["certifications"] })
      toast.success(
        saved.status === "verificado"
          ? "Certificado verificado"
          : "Certificado guardado",
        {
          description:
            saved.status === "verificado"
              ? `La certificación de ${crewName(saved)} quedó verificada.`
              : `La certificación de ${crewName(saved)} quedó por verificar.`,
        }
      )
      onSaved()
    },
  })

  // Revisa la copia elegida: formato y tamaño. Si no sirve, no se guarda y se avisa.
  const onFileChange = (file: File | undefined) => {
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFileError("Formato no válido. Adjunta un PDF, PNG o JPG.")
    } else if (file.size > MAX_FILE_BYTES) {
      setFileError("El archivo supera los 5 MB.")
    } else {
      setFileError(null)
      setNewFile(file)
    }
    // Permite volver a elegir el mismo archivo después de quitarlo.
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const numberError = errors.licenseNumber?.message
  const certificatesError = errors.certificates?.message

  return (
    // noValidate: los mensajes los pone el formulario (en español y accesibles).
    <form
      noValidate
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-5">
        {/* Tripulante: fijo, o una lista de los que no tienen certificado. */}
        <fieldset className={cardClass}>
          <legend className={legendClass}>Tripulante</legend>
          <div className="clear-both flex flex-col gap-3">
            {fixedCrew ? null : (
              <div className="flex flex-col gap-1">
                <label htmlFor={`${id}-crew`} className={fieldLabelClass}>
                  Tripulante
                  <RequiredMark />
                </label>
                <select
                  id={`${id}-crew`}
                  aria-required="true"
                  aria-invalid={errors.crewId ? true : undefined}
                  aria-describedby={
                    errors.crewId ? `${id}-crew-error` : undefined
                  }
                  className={controlClass}
                  {...register("crewId", {
                    // Al cambiar de tripulante cambian los certificados posibles.
                    onChange: (event) => {
                      const next = crewOptions.find(
                        (option) => option.id === event.target.value
                      )
                      setValue("area", next?.area ?? "")
                      setValue("certificates", [])
                    },
                  })}
                >
                  <option value="">Selecciona…</option>
                  {crewOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {crewName(option)} · {option.roleTitle} ({option.id})
                    </option>
                  ))}
                </select>
                {errors.crewId ? (
                  <p id={`${id}-crew-error`} className={errorClass}>
                    {errors.crewId.message}
                  </p>
                ) : null}
                {crewOptions.length === 0 ? (
                  <p className={cn(typography.bodySm, "text-muted-foreground")}>
                    Todos los tripulantes ya tienen certificado registrado.
                  </p>
                ) : null}
              </div>
            )}
            {crew ? <CrewCard crew={crew} /> : null}
          </div>
        </fieldset>

        {/* Licencia FAA: aparece con el tripulante (los certificados dependen de su cargo). */}
        {crew ? (
          <fieldset className={cardClass}>
            <legend className={legendClass}>Licencia FAA</legend>
            <div className="clear-both flex flex-col gap-4">
              {/* Celular: uno debajo del otro. Desde sm: número a la izquierda y
                  certificados a la derecha. */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] sm:items-start">
                <div className="flex min-w-0 flex-col gap-1">
                  <label htmlFor={`${id}-number`} className={fieldLabelClass}>
                    Número de certificado
                    <RequiredMark />
                  </label>
                  <input
                    id={`${id}-number`}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="Ej. 3904418"
                    aria-required="true"
                    aria-invalid={numberError ? true : undefined}
                    aria-describedby={[
                      `${id}-number-hint`,
                      numberError && `${id}-number-error`,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    className={cn(controlClass, "font-mono")}
                    {...register("licenseNumber")}
                  />
                  <p
                    id={`${id}-number-hint`}
                    className={cn(typography.bodySm, "text-muted-foreground")}
                  >
                    Solo números, como aparece en la tarjeta.
                  </p>
                  {numberError ? (
                    <p id={`${id}-number-error`} className={errorClass}>
                      {numberError}
                    </p>
                  ) : null}
                </div>

                {/* Certificados del cargo como chips: cada uno es una casilla real
                    (oculta a la vista), así funciona con teclado y lector. */}
                <fieldset
                  aria-invalid={certificatesError ? true : undefined}
                  aria-describedby={
                    certificatesError ? `${id}-certificates-error` : undefined
                  }
                  className="min-w-0"
                >
                  <legend
                    className={cn(fieldLabelClass, "float-left mb-1 w-full")}
                  >
                    Certificados
                    <RequiredMark />
                  </legend>
                  <div className="clear-both flex flex-col gap-1">
                    <div className="flex flex-wrap gap-2">
                      {certificateOptions.map((code) => (
                        <label
                          key={code}
                          className={cn(
                            typography.labelMd,
                            "group inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border border-brand-border bg-card px-3.5 font-semibold text-brand-primary transition-colors select-none hover:bg-brand-neutral has-checked:border-brand-primary has-checked:bg-brand-primary has-checked:text-white has-focus-visible:ring-2 has-focus-visible:ring-brand-tertiary has-focus-visible:ring-offset-2 motion-reduce:transition-none lg:min-h-8"
                          )}
                        >
                          <input
                            type="checkbox"
                            value={code}
                            className="sr-only"
                            {...register("certificates")}
                          />
                          {/* El ✓ solo se ve marcado; el estado ya lo anuncia la casilla. */}
                          <ConfirmedIcon
                            aria-hidden="true"
                            className="hidden size-4 shrink-0 group-has-checked:block"
                          />
                          {certificateName(code)}
                        </label>
                      ))}
                    </div>
                    {certificatesError ? (
                      <p id={`${id}-certificates-error`} className={errorClass}>
                        {certificatesError}
                      </p>
                    ) : null}
                  </div>
                </fieldset>
              </div>

              {/* Copia del certificado (opcional): PDF o imagen de hasta 5 MB. */}
              <div className="flex flex-col gap-2 border-t border-brand-border pt-4 sm:flex-row sm:items-center sm:gap-4">
                <span className={fieldLabelClass}>
                  Copia del certificado{" "}
                  <span className="font-normal text-muted-foreground">
                    (opcional)
                  </span>
                </span>
                {shownFileName ? (
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        typography.labelMd,
                        "font-semibold break-all text-brand-primary"
                      )}
                    >
                      {shownFileName}
                    </span>
                    <button
                      type="button"
                      aria-label={`Quitar ${shownFileName}`}
                      title="Quitar copia"
                      onClick={() => setNewFile(null)}
                      className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden lg:size-8"
                    >
                      <CloseIcon aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                ) : (
                  // La etiqueta funciona como botón: abre el selector de archivos.
                  <label
                    className={cn(
                      typography.labelMd,
                      "inline-flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-md border border-brand-border bg-card px-4 font-semibold text-brand-primary transition-colors hover:bg-brand-neutral has-focus-visible:ring-2 has-focus-visible:ring-brand-tertiary lg:min-h-9"
                    )}
                  >
                    <UploadIcon aria-hidden="true" className="size-4" />
                    Adjuntar PDF o imagen
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPTED_FILES}
                      aria-describedby={
                        fileError ? `${id}-file-error` : undefined
                      }
                      className="sr-only"
                      onChange={(event) =>
                        onFileChange(event.target.files?.[0])
                      }
                    />
                  </label>
                )}
              </div>
              {fileError ? (
                <p id={`${id}-file-error`} role="alert" className={errorClass}>
                  {fileError}
                </p>
              ) : null}
            </div>
          </fieldset>
        ) : null}

        {/* Verificación: contra qué cotejar y la confirmación del administrador. */}
        {crew ? (
          <fieldset className={cardClass}>
            <legend className={legendClass}>Verificación</legend>
            <div className="clear-both flex flex-col gap-3">
              <div className="rounded-md bg-muted p-3">
                <p
                  className={cn(
                    typography.labelMd,
                    "font-bold text-brand-primary"
                  )}
                >
                  {VERIFY_HELP[crew.area].title}
                </p>
                <p className={cn(typography.bodySm, "text-muted-foreground")}>
                  {VERIFY_HELP[crew.area].detail}
                </p>
              </div>
              {/* La etiqueta nombra la casilla; la ayuda va aparte como descripción,
                  para que el lector no la lea como parte del nombre. */}
              <div className="flex items-start gap-3">
                <input
                  id={`${id}-verified`}
                  type="checkbox"
                  aria-describedby={`${id}-verified-hint`}
                  className="mt-0.5 size-5 shrink-0 cursor-pointer accent-brand-secondary"
                  {...register("verified")}
                />
                <div className="flex flex-col">
                  <label
                    htmlFor={`${id}-verified`}
                    className={cn(
                      typography.labelMd,
                      "cursor-pointer font-semibold text-brand-primary"
                    )}
                  >
                    Confirmo que los datos coinciden con la FAA
                  </label>
                  <p
                    id={`${id}-verified-hint`}
                    className={cn(typography.bodySm, "text-muted-foreground")}
                  >
                    Si no lo marcas, se guarda como Por verificar y podrás
                    verificarlo después.
                  </p>
                </div>
              </div>
            </div>
          </fieldset>
        ) : null}
      </div>

      {/* Pie: error general (si lo hay) y los botones. */}
      <div className="flex justify-end border-t border-brand-border bg-card px-5 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {mutation.isError ? (
            <p role="alert" className={errorClass}>
              No se pudo guardar el certificado. Intenta de nuevo.
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <DialogClose
              className={cn(
                typography.labelMd,
                "inline-flex min-h-11 items-center rounded-md px-4 font-semibold text-brand-primary transition-colors hover:bg-brand-neutral focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden lg:min-h-9"
              )}
            >
              Cancelar
            </DialogClose>
            {/* Siempre activo: si falta algo, al pulsarlo cada campo muestra su mensaje
                y se enfoca el primero. El texto dice cómo se guardará. */}
            <button
              type="submit"
              disabled={mutation.isPending}
              className={cn(
                typography.labelMd,
                "inline-flex min-h-11 items-center justify-center rounded-md bg-brand-secondary px-4 font-semibold text-white transition-colors hover:bg-brand-secondary-hover focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:bg-brand-border disabled:text-muted-foreground lg:min-h-9"
              )}
            >
              {mutation.isPending
                ? "Guardando…"
                : verified
                  ? "Guardar y verificar"
                  : "Guardar sin verificar"}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}

// Qué abre el formulario: sin crewId, se elige el tripulante (desde la barra); con
// crewId, ese tripulante queda fijo (al editar o al registrar desde su ficha).
export interface CertificationFormTarget {
  crewId?: string
}

interface CertificationFormDialogProps {
  target: CertificationFormTarget | null
  onClose: () => void
}

// Ventana «Registrar certificado» / «Editar certificado». Con tripulante fijo pide su
// ficha (["certifications", "adminDetail", id]); si no, la lista de tripulantes sin
// certificado (["certifications", "uncertified"]).
const CertificationFormDialog = ({
  target,
  onClose,
}: CertificationFormDialogProps) => {
  // Último destino abierto: el formulario sigue visible durante la animación de cierre.
  const [shown, setShown] = useState(target)
  if (target !== null && target !== shown) setShown(target)
  const crewId = shown?.crewId

  const detail = useQuery({
    queryKey: ["certifications", "adminDetail", crewId],
    queryFn: () => getCertificationDetail(crewId as string),
    enabled: Boolean(crewId),
  })
  const uncertified = useQuery({
    queryKey: ["certifications", "uncertified"],
    queryFn: getUncertifiedCrew,
    enabled: shown !== null && !crewId,
  })
  const query = crewId ? detail : uncertified
  // Editar: el tripulante ya tiene certificado; si no, es un registro.
  const isEdit = Boolean(crewId && detail.data?.licenseNumber)

  return (
    <Dialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      {/* Sin la X genérica de shadcn: la pone el encabezado, en español y en blanco. */}
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100svh-2rem)] flex-col gap-0 overflow-hidden bg-muted p-0 ring-0 sm:max-w-2xl"
      >
        <CertificationDialogHeader
          leading={
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-secondary"
            >
              <CertificationIcon className="size-5" />
            </span>
          }
          title={isEdit ? "Editar certificado" : "Registrar certificado"}
          description="Certificaciones FAA · Flight Ops Central"
          closeLabel="Cerrar formulario de certificado"
        />
        {query.isPending ? (
          <p
            role="status"
            className={cn(typography.bodySm, "p-5 text-muted-foreground")}
          >
            Cargando formulario…
          </p>
        ) : query.isError ? (
          <p
            role="alert"
            className={cn(typography.bodySm, "p-5 text-destructive")}
          >
            No se pudo cargar el formulario.
          </p>
        ) : (
          <CertificationForm
            // key: si se abre otro tripulante, el formulario empieza de nuevo.
            key={crewId ?? "nuevo"}
            fixedCrew={crewId ? detail.data : undefined}
            crewOptions={crewId ? undefined : uncertified.data}
            onSaved={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

export default CertificationFormDialog
