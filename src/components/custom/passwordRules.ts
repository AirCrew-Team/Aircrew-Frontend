// Una regla de contraseña: texto para mostrar y función que valida el valor
export type PasswordRule = {
  label: string
  test: (value: string) => boolean
}

// Reglas que debe cumplir una contraseña válida
export const PASSWORD_RULES: PasswordRule[] = [
  { label: "Al menos 8 caracteres", test: (value) => value.length >= 8 },
  { label: "Una letra mayúscula", test: (value) => /[A-Z]/.test(value) },
  { label: "Una letra minúscula", test: (value) => /[a-z]/.test(value) },
  { label: "Un número", test: (value) => /\d/.test(value) },
  {
    // Cualquier carácter que no sea letra ni número
    label: "Un carácter especial",
    test: (value) => /[^A-Za-z0-9]/.test(value),
  },
]

// True solo si la contraseña cumple todas las reglas
export const isPasswordValid = (value: string) =>
  PASSWORD_RULES.every((rule) => rule.test(value))