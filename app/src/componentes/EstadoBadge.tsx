import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { EstadoServicio } from '../api/tipos';
import { espacio, radio, tipografia } from '../tema/tema';

/** Cómo se ve cada estado del servicio para el usuario. */
export const ESTADO_INFO: Record<EstadoServicio, { texto: string; fondo: string; color: string }> = {
  SOLICITADO: { texto: 'Solicitud enviada', fondo: '#FEF3C7', color: '#92400E' },
  COTIZADO: { texto: 'Cotizado', fondo: '#DBEAFE', color: '#1E40AF' },
  ACEPTADO: { texto: 'Aceptado', fondo: '#E0E7FF', color: '#3730A3' },
  EN_CURSO: { texto: 'En ejecución', fondo: '#FEF3C7', color: '#92400E' },
  COMPLETADO: { texto: 'Completado ✓', fondo: '#DCFCE7', color: '#166534' },
  PAGADO: { texto: 'Pagado', fondo: '#DCFCE7', color: '#166534' },
  CALIFICADO: { texto: 'Calificado', fondo: '#DCFCE7', color: '#166534' },
  CANCELADO: { texto: 'Cancelado', fondo: '#F3F4F6', color: '#4B5563' },
  EN_DISPUTA: { texto: 'En disputa', fondo: '#FEE2E2', color: '#991B1B' },
};

export function EstadoBadge({ estado }: { estado: EstadoServicio }) {
  const info = ESTADO_INFO[estado];
  return (
    <View style={[styles.badge, { backgroundColor: info.fondo }]}>
      <Text style={[styles.texto, { color: info.color }]}>{info.texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radio.completo,
    paddingHorizontal: espacio.sm + 2,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  texto: { fontWeight: '700', fontSize: tipografia.pequeno },
});
