import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colores, espacio, margenPantalla, radio, texto as t } from '../../tema/tema';
import { Boton } from '../Boton';
import { Icono, NombreIcono } from '../base/Icono';

type Props = {
  icono: NombreIcono;
  titulo: string;
  descripcion?: string;
  /** Acción opcional para que la pantalla vacía no sea un callejón sin salida. */
  accion?: { titulo: string; onPress: () => void };
};

/** Estado vacío: en vez de una lista en blanco, explica y ofrece qué hacer. */
export function EmptyState({ icono, titulo, descripcion, accion }: Props) {
  return (
    <View style={styles.contenedor}>
      <View style={styles.circulo}>
        <Icono nombre={icono} tamano={40} color={colores.primario} />
      </View>
      <Text style={[t.h3, styles.titulo]}>{titulo}</Text>
      {!!descripcion && <Text style={styles.descripcion}>{descripcion}</Text>}
      {!!accion && (
        <View style={styles.accion}>
          <Boton titulo={accion.titulo} onPress={accion.onPress} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: margenPantalla,
    paddingVertical: espacio.xl,
  },
  circulo: {
    width: 88,
    height: 88,
    borderRadius: radio.completo,
    backgroundColor: colores.primarioSuave,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacio.md,
  },
  titulo: { textAlign: 'center' },
  descripcion: { ...t.pequeno, textAlign: 'center', marginTop: espacio.xs, maxWidth: 300 },
  accion: { marginTop: espacio.lg, alignSelf: 'stretch', paddingHorizontal: espacio.xl },
});
