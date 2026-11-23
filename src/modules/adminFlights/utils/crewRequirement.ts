// Puestos que debe cubrir la tripulación de un vuelo. Son las mismas reglas del backend
// (services/flights/src/domain/entities/crewComplement.js), para mostrarle al admin qué
// le tocará asignar al supervisor en Programación:
// - Capitán y Primer Oficial, siempre.
// - Piloto de relevo si el vuelo dura más de 8 horas.
// - Jefe de Cabina + 1 auxiliar de vuelo por cada 50 sillas, contando al Jefe de Cabina.
//   (El backend los llama TCP, tripulante de cabina de pasajeros; aquí se usa el nombre
//   del cargo, como en Usuarios.)
const RELIEF_PILOT_AFTER_MINUTES = 8 * 60
const SEATS_PER_CABIN_CREW = 50

export const crewRequirement = (seats: number, minutes: number) => {
  const pilots = ["Capitán", "Primer Oficial"]
  if (minutes > RELIEF_PILOT_AFTER_MINUTES) pilots.push("Piloto de relevo")
  const cabin = Math.max(1, Math.ceil(seats / SEATS_PER_CABIN_CREW))
  const attendants = cabin - 1
  const parts = [...pilots, "Jefe de Cabina"]
  if (attendants > 0) {
    parts.push(
      `${attendants} ${attendants === 1 ? "auxiliar de vuelo" : "auxiliares de vuelo"}`
    )
  }
  return {
    slots: pilots.length + cabin,
    // «Capitán · Primer Oficial · Jefe de Cabina · 3 auxiliares de vuelo».
    text: parts.join(" · "),
  }
}
