import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colores, espacio, radio, texto as t } from '../../tema/tema';

type Opcion<T extends string> = { valor: T; etiqueta: string; cantidad?: number };

type Props<T extends string> = {
  opciones: Opcion<T>[];
  valor: T;
  onCambio: (v: T) => void;
};

/** Selector de dos o tres vistas dentro de una pantalla (ej. Activos / Historial). */
export function Segmentos<T extends string>({ opciones, valor, onCambio }: Props<T>) {
  return (
    <View style={styles.contenedor}>
      {opciones.map((o) => {
        const activo = o.valor === valor;
        return (
          <Pressable
            key={o.valor}
            onPress={() => onCambio(o.valor)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activo }}
            style={[styles.segmento, activo && styles.segmentoActivo]}>
            <Text style={[styles.texto, activo && styles.textoActivo]}>
              {o.etiqueta}
              {o.cantidad != null && o.cantidad > 0 ? ` (${o.cantidad})` : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    backgroundColor: colores.neutral[100],
    borderRadius: radio.md,
    padding: 4,
    gap: 4,
  },
  segmento: {
    flex: 1,
    height: 38,
    borderRadius: radio.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espacio.xs,
  },
  segmentoActivo: { backgroundColor: colores.superficie },
  texto: { ...t.pequenoFuerte, color: colores.textoSuave },
  textoActivo: { color: colores.primario },
});
