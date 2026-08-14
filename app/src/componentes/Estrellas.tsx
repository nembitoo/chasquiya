import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colores, espacio, tipografia } from '../tema/tema';

/** Muestra la calificación en estrellas (solo lectura). */
export function Estrellas({
  valor,
  cantidad,
  tamano = 14,
}: {
  valor: number;
  cantidad?: number;
  tamano?: number;
}) {
  if (!valor) {
    return <Text style={[styles.sinNota, { fontSize: tamano }]}>Sin calificaciones aún</Text>;
  }
  return (
    <View style={styles.fila}>
      <Text style={{ fontSize: tamano }}>⭐</Text>
      <Text style={[styles.nota, { fontSize: tamano }]}>{valor.toFixed(1)}</Text>
      {cantidad != null && cantidad > 0 && (
        <Text style={[styles.cantidad, { fontSize: tamano - 1 }]}>
          ({cantidad} {cantidad === 1 ? 'reseña' : 'reseñas'})
        </Text>
      )}
    </View>
  );
}

/** Selector de 1 a 5 estrellas (para calificar). */
export function SelectorEstrellas({
  valor,
  onCambio,
  etiqueta,
}: {
  valor: number;
  onCambio: (v: number) => void;
  etiqueta?: string;
}) {
  return (
    <View style={styles.selectorCaja}>
      {!!etiqueta && <Text style={styles.etiqueta}>{etiqueta}</Text>}
      <View style={styles.selectorFila}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => onCambio(n)} hitSlop={6}>
            <Text style={styles.estrellaGrande}>{n <= valor ? '⭐' : '☆'}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nota: { fontWeight: '800', color: colores.texto },
  cantidad: { color: colores.textoSuave },
  sinNota: { color: colores.textoSuave, fontStyle: 'italic' },
  selectorCaja: { marginBottom: espacio.md },
  etiqueta: {
    fontSize: tipografia.pequeno,
    color: colores.textoSuave,
    fontWeight: '600',
    marginBottom: espacio.xs,
  },
  selectorFila: { flexDirection: 'row', gap: espacio.sm },
  estrellaGrande: { fontSize: 32 },
});
