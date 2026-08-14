import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colores, espacio, texto as t } from '../../tema/tema';
import { Icono, NombreIcono } from './Icono';

/** Línea de información secundaria con icono: "📍 dirección" pero con icono real. */
export function Dato({ icono, texto: valor }: { icono: NombreIcono; texto: string }) {
  return (
    <View style={styles.fila}>
      <Icono nombre={icono} tamano="sm" color={colores.textoTenue} />
      <Text style={styles.texto} numberOfLines={2}>
        {valor}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: espacio.xxs + 2, marginTop: espacio.xxs },
  texto: { ...t.pequeno, flex: 1 },
});
