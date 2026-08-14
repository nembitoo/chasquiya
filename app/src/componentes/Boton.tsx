import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colores, espacio, fuentes, radio } from '../tema/tema';
import { Icono, NombreIcono } from './base/Icono';

type Variante = 'primario' | 'secundario' | 'terciario' | 'peligro';
type Tamano = 'sm' | 'md' | 'lg';

type Props = {
  titulo: string;
  onPress: () => void;
  variante?: Variante;
  tamano?: Tamano;
  cargando?: boolean;
  deshabilitado?: boolean;
  icono?: NombreIcono;
  /** Ocupa todo el ancho disponible (por defecto sí). */
  ancho?: boolean;
  style?: ViewStyle;
};

const ALTURA: Record<Tamano, number> = { sm: 36, md: 44, lg: 52 };
const FUENTE: Record<Tamano, number> = { sm: 14, md: 15, lg: 16 };

/**
 * Botón de la app. La jerarquía importa: una sola acción "primario" por
 * pantalla; el resto secundario o terciario.
 */
export function Boton({
  titulo,
  onPress,
  variante = 'primario',
  tamano = 'lg',
  cargando = false,
  deshabilitado = false,
  icono,
  ancho = true,
  style,
}: Props) {
  const inactivo = deshabilitado || cargando;
  const colorContenido = COLOR_CONTENIDO[variante];

  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      style={({ pressed }) => [
        styles.base,
        { height: ALTURA[tamano] },
        FONDO[variante],
        ancho ? styles.completo : styles.ajustado,
        pressed && !inactivo && styles.presionado,
        inactivo && styles.inactivo,
        style,
      ]}>
      {cargando ? (
        <ActivityIndicator color={colorContenido} size="small" />
      ) : (
        <View style={styles.contenido}>
          {!!icono && <Icono nombre={icono} tamano="md" color={colorContenido} />}
          <Text style={[styles.texto, { color: colorContenido, fontSize: FUENTE[tamano] }]}>
            {titulo}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const FONDO: Record<Variante, ViewStyle> = {
  primario: { backgroundColor: colores.primario },
  secundario: {
    backgroundColor: colores.blanco,
    borderWidth: 1.5,
    borderColor: colores.primario,
  },
  terciario: { backgroundColor: 'transparent' },
  peligro: { backgroundColor: colores.blanco, borderWidth: 1.5, borderColor: colores.error },
};

const COLOR_CONTENIDO: Record<Variante, string> = {
  primario: colores.blanco,
  secundario: colores.primario,
  terciario: colores.primario,
  peligro: colores.error,
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radio.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espacio.md,
  },
  completo: { alignSelf: 'stretch' },
  ajustado: { alignSelf: 'flex-start' },
  contenido: { flexDirection: 'row', alignItems: 'center', gap: espacio.xs },
  texto: { fontFamily: fuentes.bold },
  presionado: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  inactivo: { opacity: 0.45 },
});
