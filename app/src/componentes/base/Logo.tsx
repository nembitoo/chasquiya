import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colores, espacio, fuentes, radio } from '../../tema/tema';
import { Icono } from './Icono';

/**
 * Marca de ChasquiYa!: símbolo en una pastilla roja + nombre.
 * Reemplaza el emoji suelto, que se veía distinto en cada teléfono.
 */
export function Logo({ tamano = 'md' }: { tamano?: 'sm' | 'md' | 'lg' }) {
  const config = {
    sm: { simbolo: 28, icono: 16, fuente: 18 },
    md: { simbolo: 40, icono: 22, fuente: 26 },
    lg: { simbolo: 56, icono: 30, fuente: 34 },
  }[tamano];

  return (
    <View style={styles.fila}>
      <View
        style={[
          styles.simbolo,
          { width: config.simbolo, height: config.simbolo, borderRadius: config.simbolo / 3 },
        ]}>
        <Icono nombre="flash" tamano={config.icono} color={colores.blanco} />
      </View>
      <Text style={[styles.nombre, { fontSize: config.fuente }]}>ChasquiYa!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: espacio.xs },
  simbolo: {
    backgroundColor: colores.primario,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radio.md,
  },
  nombre: { fontFamily: fuentes.extrabold, color: colores.primario, letterSpacing: -0.5 },
});
