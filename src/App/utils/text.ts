// Sin mayúsculas ni tildes, y los espacios repetidos cuentan como uno: «medellin» encuentra «Medellín».
export const normalizeForSearch = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
