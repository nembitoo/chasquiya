import { Oficio } from '../api/tipos';

/** Oficios con su nombre legible. El icono de cada uno vive en componentes/base/Icono. */
export const OFICIOS: { valor: Oficio; etiqueta: string }[] = [
  { valor: 'ELECTRICIDAD', etiqueta: 'Electricidad' },
  { valor: 'GASFITERIA', etiqueta: 'Gasfitería' },
  { valor: 'CERRAJERIA', etiqueta: 'Cerrajería' },
  { valor: 'PINTURA', etiqueta: 'Pintura' },
  { valor: 'LIMPIEZA', etiqueta: 'Limpieza' },
  { valor: 'REPARACIONES', etiqueta: 'Reparaciones' },
  { valor: 'INSTALACIONES', etiqueta: 'Instalaciones' },
  { valor: 'MANTENCION', etiqueta: 'Mantención' },
  { valor: 'OTROS', etiqueta: 'Otros' },
];

/** Búsqueda rápida del nombre legible a partir del valor del enum. */
export const NOMBRE_OFICIO: Record<string, string> = Object.fromEntries(
  OFICIOS.map((o) => [o.valor, o.etiqueta]),
);

/**
 * Color de cada oficio para los iconos de categoria.
 *
 * El rojo de la marca se reserva para las acciones; si todas las categorias
 * fueran rojas no se distinguirian entre si de un vistazo.
 */
export const COLOR_OFICIO: Record<Oficio, { icono: string; fondo: string }> = {
  ELECTRICIDAD: { icono: '#D97706', fondo: '#FEF3C7' },
  GASFITERIA: { icono: '#2563EB', fondo: '#DBEAFE' },
  CERRAJERIA: { icono: '#B45309', fondo: '#FEF0DC' },
  PINTURA: { icono: '#7C3AED', fondo: '#EDE9FE' },
  LIMPIEZA: { icono: '#0891B2', fondo: '#CFFAFE' },
  REPARACIONES: { icono: '#DC2626', fondo: '#FEE2E2' },
  INSTALACIONES: { icono: '#059669', fondo: '#D1FAE5' },
  MANTENCION: { icono: '#4F46E5', fondo: '#E0E7FF' },
  OTROS: { icono: '#64748B', fondo: '#F1F5F9' },
};
