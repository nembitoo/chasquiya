import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../api/cliente';
import { Calificacion, Reputacion } from '../api/tipos';
import { Estrellas } from '../componentes/Estrellas';
import { Card } from '../componentes/base/Card';
import { Icono } from '../componentes/base/Icono';
import { EmptyState } from '../componentes/feedback/EmptyState';
import { SkeletonLista } from '../componentes/feedback/Skeleton';
import { useAuth } from '../estado/AuthContext';
import { RootStackParamList } from '../navegacion/Navegacion';
import { colores, espacio, margenPantalla, radio, texto as t } from '../tema/tema';

type Props = NativeStackScreenProps<RootStackParamList, 'MisCalificaciones'>;

/** Las tres sub-notas que el cliente le pone al maestro, además de las estrellas. */
const SUBNOTAS = [
  { clave: 'puntualidad', etiqueta: 'Puntualidad', icono: 'time-outline' },
  { clave: 'calidad', etiqueta: 'Calidad', icono: 'ribbon-outline' },
  { clave: 'trato', etiqueta: 'Trato', icono: 'happy-outline' },
] as const;

/**
 * Lo que otros opinaron de mí.
 *
 * El maestro no tenía forma de leer sus propias reseñas: las escribía el
 * cliente y desaparecían en el perfil público, que él no visita.
 */
export function MisCalificacionesScreen({ navigation }: Props) {
  const { sesion } = useAuth();
  const token = sesion?.token ?? '';
  const miId = sesion?.id;

  const [resenas, setResenas] = useState<Calificacion[]>([]);
  const [reputacion, setReputacion] = useState<Reputacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    if (!miId) return;
    setError('');
    try {
      const [r, rep] = await Promise.all([
        api.calificaciones.resenasDe(token, miId),
        api.calificaciones.reputacionDe(token, miId),
      ]);
      setResenas(r);
      setReputacion(rep);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar tus calificaciones.');
    } finally {
      setCargando(false);
    }
  }, [token, miId]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  /**
   * Promedio de cada sub-nota, calculado aquí. Solo cuentan las reseñas que la
   * traen: al calificar a un cliente no se piden, y contarlas como cero
   * hundiría el promedio de un maestro por algo que nadie evaluó.
   */
  const promedios = useMemo(() => {
    return SUBNOTAS.map(({ clave, etiqueta, icono }) => {
      const valores = resenas.map((r) => r[clave]).filter((v): v is number => v != null);
      return {
        etiqueta,
        icono,
        promedio: valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null,
        cantidad: valores.length,
      };
    }).filter((s) => s.promedio != null);
  }, [resenas]);

  return (
    <SafeAreaView style={styles.contenedor} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.volver}>
          <Icono nombre="chevron-back" tamano="md" color={colores.primario} />
          <Text style={styles.volverTexto}>Volver</Text>
        </Pressable>
        <Text style={t.h1}>Mis calificaciones</Text>
      </View>

      {cargando ? (
        <View style={styles.lista}>
          <SkeletonLista cantidad={3} />
        </View>
      ) : resenas.length === 0 ? (
        <EmptyState
          icono="star-outline"
          titulo="Todavía sin calificaciones"
          descripcion="Cuando termines un trabajo y el cliente te evalúe, sus comentarios aparecerán aquí."
        />
      ) : (
        <ScrollView contentContainerStyle={styles.lista}>
          {!!error && <Text style={styles.error}>{error}</Text>}

          {/* Resumen: la nota general, que es la que se ve en tu perfil. */}
          <Card>
            <View style={styles.resumen}>
              <Text style={styles.promedioGrande}>{(reputacion?.promedio ?? 0).toFixed(1)}</Text>
              <View style={{ flex: 1 }}>
                <Estrellas
                  valor={reputacion?.promedio ?? 0}
                  cantidad={reputacion?.cantidad ?? 0}
                  tamano={18}
                />
                <Text style={styles.resumenAyuda}>Es la nota que ven los clientes en tu perfil.</Text>
              </View>
            </View>

            {promedios.length > 0 && (
              <View style={styles.subnotas}>
                {promedios.map((s) => (
                  <View key={s.etiqueta} style={styles.subnota}>
                    <Icono nombre={s.icono} tamano="md" color={colores.primario} />
                    <Text style={styles.subnotaValor}>{s.promedio!.toFixed(1)}</Text>
                    <Text style={styles.subnotaEtiqueta}>{s.etiqueta}</Text>
                  </View>
                ))}
              </View>
            )}
          </Card>

          <Text style={styles.tituloLista}>
            {resenas.length} {resenas.length === 1 ? 'reseña' : 'reseñas'}
          </Text>

          {resenas.map((r) => (
            <Card key={r.id}>
              <View style={styles.resenaTop}>
                <Text style={t.cuerpoFuerte} numberOfLines={1}>
                  {r.autorNombre}
                </Text>
                <Estrellas valor={r.estrellas} />
              </View>
              {!!r.comentario && <Text style={styles.comentario}>{r.comentario}</Text>}
              <Text style={styles.fecha}>{formatearFecha(r.fechaCreacion)}</Text>
            </Card>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

/** "18 de agosto de 2026" a partir del instante ISO que manda el backend. */
function formatearFecha(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  header: { paddingHorizontal: margenPantalla, paddingTop: espacio.sm },
  volver: { flexDirection: 'row', alignItems: 'center', marginBottom: espacio.xxs },
  volverTexto: { ...t.pequenoFuerte, color: colores.primario },
  lista: { padding: margenPantalla },
  resumen: { flexDirection: 'row', alignItems: 'center', gap: espacio.md },
  promedioGrande: { fontSize: 44, fontWeight: '800', color: colores.primario },
  resumenAyuda: { ...t.etiqueta, color: colores.textoSuave, marginTop: espacio.xxs },
  subnotas: {
    flexDirection: 'row',
    marginTop: espacio.md,
    paddingTop: espacio.md,
    borderTopWidth: 1,
    borderTopColor: colores.borde,
  },
  subnota: { flex: 1, alignItems: 'center', gap: 2 },
  subnotaValor: { ...t.cuerpoFuerte },
  subnotaEtiqueta: { ...t.etiqueta, color: colores.textoSuave },
  tituloLista: { ...t.h3, marginTop: espacio.lg, marginBottom: espacio.xs },
  resenaTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espacio.sm },
  comentario: { ...t.cuerpo, marginTop: espacio.xs },
  fecha: { ...t.etiqueta, color: colores.textoTenue, marginTop: espacio.xs },
  error: { ...t.pequeno, color: colores.error, marginBottom: espacio.sm },
});
