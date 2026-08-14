import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';

import { colores, espacio, radio, sombra } from '../../tema/tema';

type Props = {
  children: React.ReactNode;
  /** Si se pasa, la tarjeta responde al toque. */
  onPress?: () => void;
  style?: ViewStyle;
};

/** Contenedor estándar de contenido: fondo, borde, radio y sombra consistentes. */
export function Card({ children, onPress, style }: Props) {
  if (!onPress) {
    return <View style={[styles.card, style]}>{children}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.presionada, style]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colores.superficie,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espacio.md,
    marginBottom: espacio.sm,
    ...sombra.nivel1,
  },
  presionada: { opacity: 0.75 },
});
