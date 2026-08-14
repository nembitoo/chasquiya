import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colores, espacio, radio, tipografia } from '../tema/tema';
import { Boton } from './Boton';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** "sábado 20 de agosto" */
export function formatearFecha(d: Date): string {
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

/** "15:00" */
export function formatearHora(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Fecha en formato ISO local "2026-08-20T15:00" (sin zona horaria).
 * Lo construimos a mano para que no se corra por UTC, y así queda ordenable.
 */
export function aIsoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * Muestra "sábado 20 de agosto, 15:00" a partir del ISO guardado.
 * Si el texto no es una fecha válida (solicitudes antiguas escritas a mano),
 * lo devuelve tal cual.
 */
export function formatearFechaHoraTexto(texto: string): string {
  const m = texto.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) {
    return texto;
  }
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
  if (Number.isNaN(d.getTime())) {
    return texto;
  }
  return `${formatearFecha(d)}, ${formatearHora(d)}`;
}

type Modo = 'date' | 'time';

type Props = {
  etiqueta: string;
  valor: Date | null;
  onCambio: (fecha: Date) => void;
};

/** Selecciona fecha y hora con los selectores nativos del teléfono. */
export function SelectorFechaHora({ etiqueta, valor, onCambio }: Props) {
  const [modo, setModo] = useState<Modo | null>(null);
  // Mientras el usuario elige en iOS, guardamos aquí el valor tentativo.
  const [temporal, setTemporal] = useState<Date>(valor ?? proximaHoraRedonda());

  function abrir(m: Modo) {
    setTemporal(valor ?? proximaHoraRedonda());
    setModo(m);
  }

  function alCambiar(evento: { type: string }, fecha?: Date) {
    if (Platform.OS === 'android') {
      // En Android el selector es un diálogo: se cierra solo al elegir o cancelar.
      setModo(null);
      if (evento.type === 'set' && fecha) {
        onCambio(fecha);
      }
      return;
    }
    // En iOS el selector es inline: acumulamos y confirmamos con "Listo".
    if (fecha) {
      setTemporal(fecha);
    }
  }

  function confirmarIOS() {
    onCambio(temporal);
    setModo(null);
  }

  return (
    <View style={styles.contenedor}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <View style={styles.fila}>
        <Pressable style={styles.caja} onPress={() => abrir('date')}>
          <Text style={styles.icono}>🗓️</Text>
          <Text style={[styles.valor, !valor && styles.placeholder]}>
            {valor ? formatearFecha(valor) : 'Elegir fecha'}
          </Text>
        </Pressable>
        <Pressable style={[styles.caja, styles.cajaHora]} onPress={() => abrir('time')}>
          <Text style={styles.icono}>🕒</Text>
          <Text style={[styles.valor, !valor && styles.placeholder]}>
            {valor ? formatearHora(valor) : 'Hora'}
          </Text>
        </Pressable>
      </View>

      {/* Android: el propio componente se muestra como diálogo nativo. */}
      {modo && Platform.OS === 'android' && (
        <DateTimePicker
          value={temporal}
          mode={modo}
          minimumDate={modo === 'date' ? new Date() : undefined}
          onChange={alCambiar}
        />
      )}

      {/* iOS: lo mostramos dentro de un modal con botón de confirmar. */}
      {modo && Platform.OS === 'ios' && (
        <Modal transparent animationType="slide" visible>
          <View style={styles.modalFondo}>
            <View style={styles.modalCaja}>
              <DateTimePicker
                value={temporal}
                mode={modo}
                display="spinner"
                minimumDate={modo === 'date' ? new Date() : undefined}
                onChange={alCambiar}
              />
              <Boton titulo="Listo" onPress={confirmarIOS} />
              <View style={{ height: espacio.sm }} />
              <Boton titulo="Cancelar" variante="secundario" onPress={() => setModo(null)} />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

/** Sugerencia inicial: la próxima hora en punto. */
function proximaHoraRedonda(): Date {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
}

const styles = StyleSheet.create({
  contenedor: { marginBottom: espacio.md },
  etiqueta: {
    fontSize: tipografia.pequeno,
    color: colores.textoSuave,
    marginBottom: espacio.xs,
    fontWeight: '600',
  },
  fila: { flexDirection: 'row', gap: espacio.sm },
  caja: {
    flex: 2,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.sm,
    backgroundColor: colores.blanco,
    paddingHorizontal: espacio.md,
    gap: espacio.sm,
  },
  cajaHora: { flex: 1 },
  icono: { fontSize: 16 },
  valor: { color: colores.texto, fontSize: tipografia.cuerpo, flexShrink: 1 },
  placeholder: { color: colores.textoSuave },
  modalFondo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCaja: {
    backgroundColor: colores.blanco,
    borderTopLeftRadius: radio.lg,
    borderTopRightRadius: radio.lg,
    padding: espacio.lg,
  },
});
