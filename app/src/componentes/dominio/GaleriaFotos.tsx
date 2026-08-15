import React, { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api } from '../../api/cliente';
import { useAuth } from '../../estado/AuthContext';
import { colores, espacio, radio, texto as t } from '../../tema/tema';
import { Icono } from '../base/Icono';

type Props = {
  solicitudId: number;
  /** Viene en la solicitud; si es 0 no se pide nada al servidor. */
  cantidad: number;
};

/**
 * Fotos del problema. Miniaturas en fila y, al tocar una, se ve completa.
 * Las sirve el backend con permisos, así que van con el token en la cabecera.
 */
export function GaleriaFotos({ solicitudId, cantidad }: Props) {
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
    api.fotos
      .listar(token, solicitudId)
      .then((lista) => {
        if (vigente) setIds(lista);
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [token, solicitudId, cantidad]);

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
            accessibilityLabel="Ver foto del problema">
            <Image
              source={{ uri: api.fotos.url(solicitudId, id), headers: cabecera }}
              style={styles.miniatura}
            />
          </Pressable>
        ))}
      </ScrollView>

      <Modal visible={abierta !== null} transparent animationType="fade" onRequestClose={() => setAbierta(null)}>
        <Pressable style={styles.fondo} onPress={() => setAbierta(null)}>
          {abierta !== null && (
            <Image
              source={{ uri: api.fotos.url(solicitudId, abierta), headers: cabecera }}
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
