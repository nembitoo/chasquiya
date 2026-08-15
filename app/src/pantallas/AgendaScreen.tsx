import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../api/cliente';
import { Solicitud } from '../api/tipos';
import { EstadoBadge } from '../componentes/EstadoBadge';
import { Dato } from '../componentes/base/Dato';
import { Icono } from '../componentes/base/Icono';
import { EmptyState } from '../componentes/feedback/EmptyState';
import { SkeletonLista } from '../componentes/feedback/Skeleton';
import { NOMBRE_OFICIO } from '../datos/oficios';
import { useAuth } from '../estado/AuthContext';
import { RootStackParamList } from '../navegacion/Navegacion';
import { colores, espacio, margenPantalla, radio, texto as t } from '../tema/tema';

type Props = NativeStackScreenProps<RootStackParamList, 'Agenda'>;

/** Trabajos comprometidos: aceptados y en curso. Lo cotizado todavía no es un compromiso. */
const AGENDABLES = ['ACEPTADO', 'EN_CURSO'];

/**
 * Agenda del maestro: sus trabajos comprometidos, agrupados por día.
 *
 * Es una lista por fecha, no un calendario con librería: para este volumen un
 * calendario sería más peso que ayuda.
 *
 * Nota de diseño (Ley 21.431): la agenda MUESTRA lo que el maestro aceptó por su
 * cuenta. La plataforma no le asigna trabajos ni le impone horarios.
 */
export function AgendaScreen({ navigation }: Props) {
  const { sesion } = useAuth();
  const token = sesion?.token ?? '';

  const [trabajos, setTrabajos] = useState<Solicitud[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setError('');
    try {
      const todas = await api.solicitudes.recibidas(token);
      setTrabajos(todas.filter((s) => AGENDABLES.includes(s.estado)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar tu agenda.');
    } finally {
      setCargando(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const grupos = agruparPorDia(trabajos);

  return (
    <SafeAreaView style={styles.contenedor} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.volver}>
          <Icono nombre="chevron-back" tamano="md" color={colores.primario} />
          <Text style={styles.volverTexto}>Volver</Text>
        </Pressable>
        <Text style={t.h1}>Mi agenda</Text>
        <Text style={t.pequeno}>Los trabajos que aceptaste, ordenados por fecha.</Text>
      </View>

      {cargando ? (
        <View style={styles.lista}>
          <SkeletonLista cantidad={3} />
        </View>
      ) : grupos.length === 0 ? (
        <EmptyState
          icono="calendar-outline"
          titulo="Sin trabajos agendados"
          descripcion="Cuando aceptes una cotización, el trabajo aparecerá aquí con su fecha."
          accion={{
            titulo: 'Ver solicitudes',
            onPress: () => navigation.navigate('Tabs', { screen: 'SolicitudesRecibidas' }),
          }}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.lista}>
          {!!error && <Text style={styles.error}>{error}</Text>}
          {grupos.map((g) => (
            <View key={g.clave}>
              <Text style={styles.dia}>{g.titulo}</Text>
              {g.trabajos.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => navigation.navigate('Tabs', { screen: 'SolicitudesRecibidas' })}
                  style={({ pressed }) => [styles.tarjeta, pressed && styles.presionada]}>
                  <View style={styles.filaTitulo}>
                    <Text style={[t.cuerpoFuerte, { flex: 1 }]} numberOfLines={1}>
                      {s.clienteNombre}
                    </Text>
                    <EstadoBadge estado={s.estado} />
                  </View>
                  <Text style={styles.oficio}>{NOMBRE_OFICIO[s.oficio] ?? s.oficio}</Text>
                  <Text style={t.pequeno} numberOfLines={2}>
                    {s.descripcion}
                  </Text>
                  <Dato icono="location-outline" texto={s.direccion} />
                  {!!s.fechaPreferida && <Dato icono="time-outline" texto={soloHora(s.fechaPreferida)} />}
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

type Grupo = { clave: string; titulo: string; trabajos: Solicitud[] };

/**
 * Agrupa por día. Los trabajos sin fecha acordada van al final, no arriba:
 * lo que tiene fecha es lo que hay que organizar primero.
 */
function agruparPorDia(trabajos: Solicitud[]): Grupo[] {
  const conFecha = trabajos.filter((s) => !!s.fechaPreferida);
  const sinFecha = trabajos.filter((s) => !s.fechaPreferida);

  const mapa = new Map<string, Solicitud[]>();
  for (const s of conFecha.sort((a, b) => (a.fechaPreferida ?? '').localeCompare(b.fechaPreferida ?? ''))) {
    const clave = (s.fechaPreferida ?? '').slice(0, 10);
    mapa.set(clave, [...(mapa.get(clave) ?? []), s]);
  }

  const grupos: Grupo[] = [...mapa.entries()].map(([clave, lista]) => ({
    clave,
    titulo: tituloDia(clave),
    trabajos: lista,
  }));

  if (sinFecha.length > 0) {
    grupos.push({ clave: 'sin-fecha', titulo: 'Por coordinar', trabajos: sinFecha });
  }
  return grupos;
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "2026-08-16" -> "Mañana · domingo 16 ago". */
function tituloDia(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number);
  const fecha = new Date(a, m - 1, d);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const dias = Math.round((fecha.getTime() - hoy.getTime()) / 86_400_000);

  const largo = `${DIAS[fecha.getDay()]} ${d} ${MESES[m - 1]}`;
  if (dias === 0) return `Hoy · ${largo}`;
  if (dias === 1) return `Mañana · ${largo}`;
  if (dias < 0) return `Atrasado · ${largo}`;
  return largo.charAt(0).toUpperCase() + largo.slice(1);
}

/** De un ISO local saca solo "14:30". */
function soloHora(iso: string): string {
  const hora = iso.slice(11, 16);
  return hora ? `${hora} h` : 'Hora por coordinar';
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  header: { paddingHorizontal: margenPantalla, paddingTop: espacio.sm },
  volver: { flexDirection: 'row', alignItems: 'center', marginBottom: espacio.xxs },
  volverTexto: { ...t.pequenoFuerte, color: colores.primario },
  lista: { padding: margenPantalla },
  dia: { ...t.h3, marginTop: espacio.sm, marginBottom: espacio.sm },
  tarjeta: {
    backgroundColor: colores.superficie,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espacio.md,
    marginBottom: espacio.sm,
    gap: 2,
  },
  presionada: { opacity: 0.75 },
  filaTitulo: { flexDirection: 'row', alignItems: 'center', gap: espacio.xs },
  oficio: { ...t.pequeno, color: colores.primario },
  error: { ...t.pequeno, color: colores.error, marginBottom: espacio.sm },
});
