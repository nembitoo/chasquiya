import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colores, fuentes } from '../../tema/tema';

type Props = {
  nombre?: string;
  /** URL de la foto; si no hay, se muestran las iniciales. */
  uri?: string | null;
  tamano?: number;
};

/** Foto de perfil. Sin foto, muestra las iniciales sobre el rojo de la marca. */
export function Avatar({ nombre = '', uri, tamano = 40 }: Props) {
  const estiloBase = {
    width: tamano,
    height: tamano,
    borderRadius: tamano / 2,
  };

  if (uri) {
    return <Image source={{ uri }} style={[estiloBase, styles.imagen]} />;
  }

  return (
    <View style={[estiloBase, styles.iniciales]}>
      <Text style={[styles.texto, { fontSize: tamano * 0.38 }]}>{obtenerIniciales(nombre)}</Text>
    </View>
  );
}

function obtenerIniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) {
    return '?';
  }
  if (partes.length === 1) {
    return partes[0].charAt(0).toUpperCase();
  }
  return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
}

const styles = StyleSheet.create({
  imagen: { backgroundColor: colores.neutral[200] },
  iniciales: {
    backgroundColor: colores.primarioSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: { fontFamily: fuentes.bold, color: colores.primario },
});
