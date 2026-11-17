import { useEffect, useState } from "react"

// Devuelve el valor solo cuando deja de cambiar por `delayMs` ms
export const useDebouncedValue = <T>(value: T, delayMs = 300) => {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebounced(value), delayMs)
    // Si el valor cambia antes de tiempo, se cancela la espera anterior.
    return () => clearTimeout(timeoutId)
  }, [value, delayMs])

  return debounced
}
