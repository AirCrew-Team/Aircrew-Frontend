import { isValidPhoneNumber } from "react-phone-number-input/mobile"
import * as z from "zod/mini"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Texto obligatorio: se recortan los espacios antes de validar.
const required = (message: string) =>
  z.string().check(z.trim(), z.minLength(1, message))

type FormInput = {
  roleGroup: string
  roleTitle: string
  licenseNumber: string
}

// Obligatorio solo para algunos roles: el error se muestra en `field` cuando el rol
// elegido lo pide y el campo está vacío. Sin rol elegido no se marca (ya falla el rol).
const requiredFor = (
  field: keyof FormInput,
  roles: string[],
  message: string
) =>
  z.refine<FormInput>(
    (values) =>
      !roles.includes(values.roleGroup) || values[field].trim() !== "",
    {
      path: [field],
      message,
      // Si el campo ya tiene otro error, no se suma este.
      when: (payload) =>
        !payload.issues.some((issue) => issue.path?.[0] === field),
    }
  )

// Reglas del formulario «Añadir usuario». Las listas empiezan vacías, así que
// «obligatorio» también obliga a elegir una opción.
// - Cargo, licencia y certificados: solo Tripulación (Supervisor y Administrador
//   no tienen cargo, horas de vuelo ni licencia).
export const createUserSchema = z
  .object({
    firstName: required("Ingresa los nombres."),
    lastName: required("Ingresa los apellidos."),
    email: z
      .string()
      .check(
        z.trim(),
        z.minLength(1, "Ingresa el correo."),
        z.regex(
          EMAIL_PATTERN,
          "Formato no válido. Usa un correo como nombre@aircrew-ops.com."
        )
      ),
    // Celular en formato internacional (E.164), ej. "+14045550123": lo arma el campo
    // de react-phone-number-input con el país elegido y el número escrito.
    // isValidPhoneNumber (versión «mobile» de libphonenumber, de Google) revisa que sea
    // un celular válido para ese país: cantidad de dígitos, prefijos y rangos reales.
    phone: z.string().check(
      z.minLength(1, "Ingresa el celular de contacto."),
      z.refine(
        (value) => value === "" || isValidPhoneNumber(value),
        "Número de celular no válido para el país elegido."
      )
    ),
    roleGroup: required("Selecciona el rol."),
    roleTitle: z.string(),
    base: required("Selecciona la base."),
    licenseNumber: z
      .string()
      .check(
        z.trim(),
        z.maxLength(30, "El número de licencia no puede superar 30 caracteres.")
      ),
    // Certificados marcados en las casillas; dependen del cargo.
    certificates: z.array(z.string()),
  })
  .check(
    requiredFor("roleTitle", ["tripulacion"], "Selecciona el cargo."),
    // Número de licencia: Tripulación con cargo elegido (la sección aparece con el cargo).
    z.refine(
      (values) =>
        values.roleGroup !== "tripulacion" ||
        values.roleTitle === "" ||
        values.licenseNumber.trim() !== "",
      {
        path: ["licenseNumber"],
        message: "Ingresa el número de licencia.",
        when: (payload) =>
          !payload.issues.some((issue) => issue.path?.[0] === "licenseNumber"),
      }
    ),
    // Un tripulante debe tener al menos un certificado de su cargo. Sin cargo elegido
    // no se marca: las casillas aparecen al elegirlo (y ya falla el cargo).
    z.refine(
      (values) =>
        values.roleGroup !== "tripulacion" ||
        values.roleTitle === "" ||
        values.certificates.length > 0,
      {
        path: ["certificates"],
        message: "Selecciona al menos un certificado.",
      }
    )
  )

export type CreateUserFormValues = z.infer<typeof createUserSchema>
