import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { EstadoServicio } from '../../api/tipos';
import { colores, espacio, texto as t } from '../../tema/tema';
import { Icono } from '../base/Icono';

/**
 * Camino normal del servicio. Cancelado y en disputa quedan fuera a propósito:
 * no son pasos del avance, son salidas.
 */
const PASOS: { estado: EstadoServicio; etiqueta: string }[] = [
  { estado: 'SOLICITADO', etiqueta: 'Solicitado' },
  { estado: 'COTIZADO', etiqueta: 'Cotizado' },
  { estado: 'ACEPTADO', etiqueta: 'Aceptado' },
  { estado: 'EN_CURSO', etiqueta: 'En curso' },
  { estado: 'COMPLETADO', etiqueta: 'Terminado' },
  { estado: 'PAGADO', etiqueta: 'Pagado' },
];

/** CALIFICADO es el cierre del ciclo: el servicio ya pasó por PAGADO. */
function indiceDe(estado: EstadoServicio): number {
  if (estado === 'CALIFICADO') return PASOS.length - 1;
  return PASOS.findIndex((p) => p.estado === estado);
}

type Props = { estado: EstadoServicio };

export function LineaTiempo({ estado }: Props) {
  // En un servicio cancelado o en disputa, mostrar un avance sería engañoso.
  if (estado === 'CANCELADO' || estado === 'EN_DISPUTA') {
    const cancelado = estado === 'CANCELADO';
    return (
      <View style={styles.aviso}>
        <Icono
          nombre={cancelado ? 'close-circle' : 'alert-circle'}
          tamano="sm"
          color={cancelado ? colores.textoTenue : colores.error}
        />
        <Text style={[styles.avisoTexto, !cancelado && { color: colores.error }]}>
          {cancelado ? 'Este servicio fue cancelado' : 'Este servicio tiene una disputa abierta'}
        </Text>
      </View>
    );
  }

  const actual = indiceDe(estado);

  return (
    <View style={styles.fila} accessibilityLabel={`Estado del servicio: ${estado}`}>
      {PASOS.map((paso, i) => {
        const hecho = i <= actual;
        const esActual = i === actual;
        return (
          <View key={paso.estado} style={styles.paso}>
            <View style={styles.pistaFila}>
              {/* Tramo izquierdo: se pinta solo si el paso anterior ya ocurrió. */}
              <View style={[styles.tramo, i === 0 && styles.tramoInvisible, hecho && styles.tramoHecho]} />
              <View style={[styles.punto, hecho && styles.puntoHecho, esActual && styles.puntoActual]}>
                {hecho && !esActual && <Icono nombre="checkmark" tamano={10} color={colores.textoInverso} />}
              </View>
              <View
                style={[
                  styles.tramo,
                  i === PASOS.length - 1 && styles.tramoInvisible,
                  i < actual && styles.tramoHecho,
                ]}
              />
            </View>
            <Text style={[styles.etiqueta, esActual && styles.etiquetaActual]} numberOfLines={1}>
              {paso.etiqueta}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', marginTop: espacio.sm, marginBottom: espacio.xs },
  paso: { flex: 1, alignItems: 'center' },
  pistaFila: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  tramo: { flex: 1, height: 2, backgroundColor: colores.borde },
  tramoHecho: { backgroundColor: colores.primario },
  tramoInvisible: { backgroundColor: 'transparent' },
  punto: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colores.borde,
    backgroundColor: colores.superficie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  puntoHecho: { backgroundColor: colores.primario, borderColor: colores.primario },
  // El paso actual queda hueco y con anillo: se distingue de los ya cumplidos.
  puntoActual: { backgroundColor: colores.superficie, borderColor: colores.primario, borderWidth: 4 },
  etiqueta: { ...t.etiqueta, fontSize: 10, textAlign: 'center', marginTop: 4, color: colores.textoTenue },
  etiquetaActual: { color: colores.primario, fontWeight: '700' },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.xxs,
    marginTop: espacio.sm,
    marginBottom: espacio.xs,
  },
  avisoTexto: { ...t.pequeno, color: colores.textoTenue },
});
