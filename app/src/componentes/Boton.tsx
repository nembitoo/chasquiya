import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colores, espacio, radio, tipografia } from '../tema/tema';

type Props = {
  titulo: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario';
  cargando?: boolean;
  deshabilitado?: boolean;
};

/** Botón reutilizable de la app. Variante primaria (rojo) o secundaria (borde). */
export function Boton({
  titulo,
  onPress,
  variante = 'primario',
  cargando = false,
  deshabilitado = false,
}: Props) {
  const esSecundario = variante === 'secundario';
  const inactivo = deshabilitado || cargando;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      style={({ pressed }) => [
        styles.base,
        esSecundario ? styles.secundario : styles.primario,
        pressed && !inactivo && { opacity: 0.85 },
        inactivo && { opacity: 0.6 },
      ]}>
      {cargando ? (
        <ActivityIndicator color={esSecundario ? colores.primario : colores.blanco} />
      ) : (
        <Text style={[styles.texto, esSecundario ? styles.textoSecundario : styles.textoPrimario]}>
          {titulo}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radio.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espacio.lg,
  },
  primario: { backgroundColor: colores.primario },
  secundario: { backgroundColor: colores.blanco, borderWidth: 1.5, borderColor: colores.primario },
  texto: { fontSize: tipografia.cuerpo, fontWeight: '700' },
  textoPrimario: { color: colores.blanco },
  textoSecundario: { color: colores.primario },
});
