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
