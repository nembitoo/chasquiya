import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';

import { colores, espacio, radio } from '../../tema/tema';

/** Bloque gris que late mientras carga el contenido real. */
export function Skeleton({
  alto = 16,
  ancho = '100%',
  style,
}: {
  alto?: number;
  ancho?: number | `${number}%`;
  style?: ViewStyle;
}) {
  const opacidad = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const animacion = Animated.loop(
      Animated.sequence([
        Animated.timing(opacidad, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacidad, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    animacion.start();
    return () => animacion.stop();
  }, [opacidad]);

  return (
    <Animated.View
      style={[{ height: alto, width: ancho, opacity: opacidad }, styles.bloque, style]}
    />
  );
}

/** Varias tarjetas fantasma, con la forma del contenido que viene. */
export function SkeletonLista({ cantidad = 3 }: { cantidad?: number }) {
  return (
    <View>
      {Array.from({ length: cantidad }).map((_, i) => (
        <View key={i} style={styles.card}>
          <Skeleton alto={18} ancho="55%" />
          <Skeleton alto={13} ancho="35%" style={{ marginTop: espacio.xs }} />
          <Skeleton alto={13} ancho="80%" style={{ marginTop: espacio.sm }} />
          <Skeleton alto={36} style={{ marginTop: espacio.md, borderRadius: radio.sm }} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bloque: { backgroundColor: colores.neutral[200], borderRadius: radio.sm },
  card: {
    backgroundColor: colores.superficie,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espacio.md,
    marginBottom: espacio.sm,
  },
});
