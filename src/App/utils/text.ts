// Sin mayúsculas ni tildes, y los espacios repetidos cuentan como uno: «medellin» encuentra «Medellín».
export const normalizeForSearch = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")

// Iniciales del primer nombre y del último apellido (ej. «Juan Pablo Navarro» → «JN»).
export const initialsOf = (fullName: string) => {
  const words = fullName.split(" ")
  return `${words[0]?.[0] ?? ""}${words.length > 1 ? (words.at(-1)?.[0] ?? "") : ""}`
}
