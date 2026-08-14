import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { colores, espacio, fuentes, radio, texto as t } from '../tema/tema';
import { Icono, NombreIcono } from './base/Icono';

type Props = TextInputProps & {
  etiqueta: string;
  error?: string;
  /** Texto de apoyo bajo el campo (se oculta si hay error). */
  ayuda?: string;
  icono?: NombreIcono;
};

/** Campo de texto con etiqueta, estado de foco y mensajes de error/ayuda. */
export function CampoTexto({ etiqueta, error, ayuda, icono, style, ...rest }: Props) {
  const [enfocado, setEnfocado] = useState(false);

  return (
    <View style={styles.contenedor}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>

      <View
        style={[
          styles.caja,
          enfocado && styles.cajaEnfocada,
          !!error && styles.cajaError,
        ]}>
        {!!icono && (
          <Icono nombre={icono} tamano="md" color={enfocado ? colores.primario : colores.textoTenue} />
        )}
        <TextInput
          placeholderTextColor={colores.textoTenue}
          onFocus={(e) => {
            setEnfocado(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setEnfocado(false);
            rest.onBlur?.(e);
          }}
          style={[styles.input, style]}
          {...rest}
        />
      </View>

      {!!error && (
        <View style={styles.mensaje}>
          <Icono nombre="alert-circle" tamano="sm" color={colores.error} />
          <Text style={styles.error}>{error}</Text>
        </View>
      )}
      {!error && !!ayuda && <Text style={styles.ayuda}>{ayuda}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { marginBottom: espacio.md },
  etiqueta: { ...t.pequenoFuerte, marginBottom: espacio.xxs + 2 },
  caja: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.xs,
    minHeight: 52,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.sm,
    paddingHorizontal: espacio.md,
    backgroundColor: colores.superficie,
  },
  cajaEnfocada: { borderColor: colores.primario, borderWidth: 1.5 },
  cajaError: { borderColor: colores.error, backgroundColor: colores.errorFondo },
  input: {
    flex: 1,
    paddingVertical: espacio.sm,
    fontFamily: fuentes.regular,
    fontSize: 16,
    color: colores.texto,
  },
  mensaje: { flexDirection: 'row', alignItems: 'center', gap: espacio.xxs, marginTop: espacio.xxs },
  error: { ...t.etiqueta, color: colores.error },
  ayuda: { ...t.etiqueta, marginTop: espacio.xxs },
});
