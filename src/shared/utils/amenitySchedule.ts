/**
 * Disponibilidad de una amenidad por horario (Lote D, WEB-12). Toma la
 * fecha de referencia como parámetro explícito — nunca `Date.now()` por
 * su cuenta — para que sea determinista en pruebas y no dependa de a qué
 * hora corre `npm run test`.
 */

export interface AmenitySchedule {
  opensAt?: string;
  closesAt?: string;
}

function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function parseHHmm(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * `true` si la amenidad está abierta en el instante `at`. Sin horario
 * (`opensAt`/`closesAt` ausentes) significa servicio continuo — siempre
 * abierta. Soporta una ventana que cruza medianoche (p. ej. `22:00`–`02:00`).
 */
export function isAmenityOpenAt(amenity: AmenitySchedule, at: Date): boolean {
  if (!amenity.opensAt || !amenity.closesAt) return true;

  const now = minutesOfDay(at);
  const opens = parseHHmm(amenity.opensAt);
  const closes = parseHHmm(amenity.closesAt);

  if (opens <= closes) return now >= opens && now < closes;
  return now >= opens || now < closes;
}
