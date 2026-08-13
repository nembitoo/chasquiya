import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { colores, espacio, radio, tipografia } from '../tema/tema';

type Props = TextInputProps & {
  etiqueta: string;
  error?: string;
};

/** Campo de texto con etiqueta y mensaje de error opcional. */
export function CampoTexto({ etiqueta, error, style, ...rest }: Props) {
  return (
    <View style={styles.contenedor}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <TextInput
        placeholderTextColor={colores.textoSuave}
        style={[styles.input, !!error && styles.inputError, style]}
        {...rest}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { marginBottom: espacio.md },
  etiqueta: {
    fontSize: tipografia.pequeno,
    color: colores.textoSuave,
    marginBottom: espacio.xs,
    fontWeight: '600',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.sm,
    paddingHorizontal: espacio.md,
    fontSize: tipografia.cuerpo,
    color: colores.texto,
    backgroundColor: colores.blanco,
  },
  inputError: { borderColor: colores.error },
  error: { color: colores.error, fontSize: tipografia.pequeno, marginTop: espacio.xs },
});
