import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colores, espacio, radio, tipografia } from '../tema/tema';

type Props = {
  onPress: () => void;
  noLeidos?: number;
};

/** Abre el chat de la solicitud, con un badge si hay mensajes sin leer. */
export function BotonChat({ onPress, noLeidos = 0 }: Props) {
  return (
    <Pressable style={styles.boton} onPress={onPress}>
      <Text style={styles.texto}>💬 Chat</Text>
      {noLeidos > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeTexto}>{noLeidos > 9 ? '9+' : noLeidos}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: espacio.sm,
    marginTop: espacio.md,
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.sm,
    borderRadius: radio.completo,
    borderWidth: 1.5,
    borderColor: colores.primario,
    backgroundColor: colores.blanco,
  },
  texto: { color: colores.primario, fontWeight: '700' },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colores.primario,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeTexto: { color: colores.blanco, fontSize: tipografia.pequeno, fontWeight: '800' },
});
