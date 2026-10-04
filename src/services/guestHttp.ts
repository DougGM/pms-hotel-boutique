import { HttpError } from './http-client';

/**
 * Errores de las rutas `/guest/...` (INT-12). La reserva siempre sale del JWT de
 * huésped: el frontend nunca envía un `bookingId`, así que un `403` significa que
 * el recurso no es de su estancia o que la estancia ya no está activa.
 */
export function guestErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpError)) return error instanceof Error ? error.message : fallback;
  if (error.status === 401) return 'Tu acceso de huésped venció. Ingresa de nuevo tu código.';
  if (error.status === 403) {
    return 'Esta información no pertenece a tu estancia o tu estancia ya no está activa.';
  }
  if (error.status === 400) return `${fallback} El hotel no permite ese cambio en este momento.`;
  if (error.status === 404) return `${fallback} No encontramos ese registro en tu estancia.`;
  return fallback;
}

export async function guestRequest<T>(call: () => Promise<T>, fallback: string): Promise<T> {
  try {
    return await call();
  } catch (error) {
    throw new Error(guestErrorMessage(error, fallback));
  }
}
