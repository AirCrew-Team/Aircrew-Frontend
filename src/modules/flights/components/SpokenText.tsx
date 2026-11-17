// «3h 55m» → «3 horas 55 minutos»; «41h» → «41 horas».
const HOURS = /\b(\d+)h(?: (\d+)m)?\b/g

const count = (value: string, word: string) =>
  `${Number(value)} ${word}${Number(value) === 1 ? "" : "s"}`

const toSpoken = (text: string) =>
  text.replace(HOURS, (_, hours: string, minutes?: string) =>
    minutes === undefined
      ? count(hours, "hora")
      : `${count(hours, "hora")} ${count(minutes, "minuto")}`
  )

interface SpokenTextProps {
  text: string
}

// A11Y-MV-4: el lector oye las horas en palabras; lo visible no cambia.
// Sin horas en el texto, lo deja tal cual.
const SpokenText = ({ text }: SpokenTextProps) => {
  const spoken = toSpoken(text)
  if (spoken === text) return text

  return (
    <>
      <span aria-hidden="true">{text}</span>
      <span className="sr-only">{spoken}</span>
    </>
  )
}

export default SpokenText
