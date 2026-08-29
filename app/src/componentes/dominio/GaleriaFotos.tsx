import React, { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../estado/AuthContext';
import { colores, espacio, radio, texto as t } from '../../tema/tema';
import { Icono } from '../base/Icono';

type Props = {
  /** Viene en la solicitud o en el reclamo; si es 0 no se pide nada al servidor. */
  cantidad: number;
  /** Ids de las fotos. Cambia según de qué cuelguen: una solicitud o un reclamo. */
  listar: () => Promise<number[]>;
  urlDe: (fotoId: number) => string;
  etiqueta?: string;
};

/**
 * Miniaturas en fila y, al tocar una, se ve completa. Las sirve el backend con
 * permisos, así que van con el token en la cabecera.
 *
 * De dónde salen las fotos lo decide quien la usa: sirve igual para las del
 * problema de una solicitud que para las evidencias de un reclamo.
 */
export function GaleriaFotos({ cantidad, listar, urlDe, etiqueta = 'Ver foto' }: Props) {
  const { sesion } = useAuth();
  const token = sesion?.token ?? '';
  const [ids, setIds] = useState<number[]>([]);
  const [abierta, setAbierta] = useState<number | null>(null);

  useEffect(() => {
    if (cantidad === 0) {
      setIds([]);
      return;
    }
    let vigente = true;
    listar()
      .then((lista) => {
        if (vigente) setIds(lista);
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
    // listar viene inline de cada pantalla: se re-pide cuando cambia la cantidad.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cantidad]);

  if (cantidad === 0 || ids.length === 0) {
    return null;
  }

  const cabecera = { Authorization: `Bearer ${token}` };

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fila}>
        {ids.map((id) => (
          <Pressable
            key={id}
            onPress={() => setAbierta(id)}
            accessibilityRole="button"
            accessibilityLabel={etiqueta}>
            <Image
              source={{ uri: urlDe(id), headers: cabecera }}
              style={styles.miniatura}
            />
          </Pressable>
        ))}
      </ScrollView>

      <Modal visible={abierta !== null} transparent animationType="fade" onRequestClose={() => setAbierta(null)}>
        <Pressable style={styles.fondo} onPress={() => setAbierta(null)}>
          {abierta !== null && (
            <Image
              source={{ uri: urlDe(abierta), headers: cabecera }}
              style={styles.completa}
              resizeMode="contain"
            />
          )}
          <View style={styles.cerrar}>
            <Icono nombre="close" tamano="lg" color={colores.textoInverso} />
            <Text style={styles.cerrarTexto}>Cerrar</Text>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fila: { marginTop: espacio.sm },
  miniatura: {
    width: 72,
    height: 72,
    borderRadius: radio.sm,
    marginRight: espacio.xs,
    backgroundColor: colores.neutral[200],
  },
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  completa: { width: '100%', height: '80%' },
  cerrar: { position: 'absolute', top: 48, right: 24, alignItems: 'center' },
  cerrarTexto: { ...t.pequenoFuerte, color: colores.textoInverso },
});
