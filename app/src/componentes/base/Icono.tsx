import { Ionicons } from '@expo/vector-icons';
import React from 'react';

import { colores } from '../../tema/tema';

/**
 * Iconos de la app. Envuelve Ionicons (viene incluido en Expo, sin costo)
 * para que todas las pantallas usen los mismos nombres y tamaños.
 */
export type NombreIcono = keyof typeof Ionicons.glyphMap;

export const tamanoIcono = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const;

type Props = {
  nombre: NombreIcono;
  tamano?: keyof typeof tamanoIcono | number;
  color?: string;
};

export function Icono({ nombre, tamano = 'md', color = colores.texto }: Props) {
  const px = typeof tamano === 'number' ? tamano : tamanoIcono[tamano];
  return <Ionicons name={nombre} size={px} color={color} />;
}

/** Icono de cada oficio, para categorías y tarjetas. */
export const ICONO_OFICIO: Record<string, NombreIcono> = {
  ELECTRICIDAD: 'flash',
  GASFITERIA: 'water',
  CERRAJERIA: 'key',
  PINTURA: 'color-palette',
  LIMPIEZA: 'sparkles',
  REPARACIONES: 'hammer',
  INSTALACIONES: 'cube',
  MANTENCION: 'construct',
  OTROS: 'ellipsis-horizontal',
};
