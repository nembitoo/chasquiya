import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../api/cliente';
import { MaestroCercano, Oficio } from '../api/tipos';
import { OFICIOS } from '../datos/oficios';
import { useAuth } from '../estado/AuthContext';
import { RootStackParamList } from '../navegacion/Navegacion';
import { colores, espacio, radio, tipografia } from '../tema/tema';

type Props = NativeStackScreenProps<RootStackParamList, 'Buscar'>;

// Si el cliente no da permiso de ubicación, usamos el centro de Santiago.
const UBICACION_POR_DEFECTO = { lat: -33.4489, lon: -70.6693 };

const ETIQUETA_OFICIO: Record<string, string> = Object.fromEntries(
  OFICIOS.map((o) => [o.valor, o.etiqueta]),
);

export function BuscarScreen({ navigation }: Props) {
  const { sesion } = useAuth();
  const token = sesion?.token ?? '';

  const [ubicacion, setUbicacion] = useState<{ lat: number; lon: number } | null>(null);
  const [usandoDefecto, setUsandoDefecto] = useState(false);
  const [oficio, setOficio] = useState<Oficio | null>(null);
  const [maestros, setMaestros] = useState<MaestroCercano[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Obtiene la ubicación una vez al abrir la pantalla.
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setUsandoDefecto(true);
          setUbicacion(UBICACION_POR_DEFECTO);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        setUbicacion({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      } catch {
        setUsandoDefecto(true);
        setUbicacion(UBICACION_POR_DEFECTO);
      }
    })();
  }, []);

  const cargar = useCallback(async () => {
    if (!ubicacion) return;
    setError('');
    setCargando(true);
    try {
      setMaestros(await api.descubrimiento.buscar(token, ubicacion.lat, ubicacion.lon, oficio ?? undefined));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo buscar.');
    } finally {
      setCargando(false);
    }
  }, [ubicacion, oficio, token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <SafeAreaView style={styles.contenedor}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.volver}>‹ Volver</Text>
        </Pressable>
        <Text style={styles.titulo}>Maestros cerca de ti</Text>
        {usandoDefecto && <Text style={styles.aviso}>Sin permiso de ubicación: mostrando desde el centro de Santiago.</Text>}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtros} contentContainerStyle={styles.filtrosContenido}>
        <Pildora texto="Todos" activo={oficio === null} onPress={() => setOficio(null)} />
        {OFICIOS.map((o) => (
          <Pildora key={o.valor} texto={o.etiqueta} activo={oficio === o.valor} onPress={() => setOficio(o.valor)} />
        ))}
      </ScrollView>

      {cargando ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={colores.primario} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.lista}>
          {!!error && <Text style={styles.error}>{error}</Text>}
          {maestros.length === 0 && !error ? (
            <Text style={styles.vacio}>No hay maestros aprobados cerca. Prueba con otra categoría.</Text>
          ) : (
            maestros.map((m) => (
              <Pressable
                key={m.usuarioId}
                style={styles.card}
                onPress={() => navigation.navigate('MaestroPublico', { usuarioId: m.usuarioId })}>
                <View style={styles.cardTop}>
                  <Text style={styles.nombre}>
                    {m.nombre} {m.apellido}
                  </Text>
                  <Text style={styles.distancia}>{m.distanciaKm} km</Text>
                </View>
                <Text style={styles.oficios}>{m.oficios.map((o) => ETIQUETA_OFICIO[o] ?? o).join('  ')}</Text>
                <Text style={styles.dato}>
                  {(m.zonaCobertura ?? 'Sin comuna') + ' · ' + m.aniosExperiencia + ' años exp.'}
                  {m.tarifaReferencial ? ' · desde $' + m.tarifaReferencial : ''}
                </Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Pildora({ texto, activo, onPress }: { texto: string; activo: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.pildora, activo && styles.pildoraActiva]}>
      <Text style={[styles.pildoraTexto, activo && styles.pildoraTextoActivo]}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: espacio.lg, paddingTop: espacio.sm },
  volver: { color: colores.primario, fontSize: tipografia.cuerpo, fontWeight: '600', marginBottom: espacio.xs },
  titulo: { fontSize: tipografia.titulo, fontWeight: '800', color: colores.texto },
  aviso: { color: colores.textoSuave, fontSize: tipografia.pequeno, marginTop: espacio.xs },
  filtros: { maxHeight: 56, marginTop: espacio.sm },
  filtrosContenido: { paddingHorizontal: espacio.lg, gap: espacio.sm, alignItems: 'center' },
  pildora: {
    borderRadius: radio.completo,
    borderWidth: 1.5,
    borderColor: colores.borde,
    backgroundColor: colores.blanco,
    paddingHorizontal: espacio.md,
    height: 38,
    justifyContent: 'center',
  },
  pildoraActiva: { borderColor: colores.primario, backgroundColor: colores.primarioSuave },
  pildoraTexto: { color: colores.textoSuave, fontWeight: '600' },
  pildoraTextoActivo: { color: colores.primario },
  lista: { padding: espacio.lg },
  vacio: { textAlign: 'center', color: colores.textoSuave, marginTop: espacio.xl },
  card: {
    backgroundColor: colores.blanco,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espacio.md,
    marginBottom: espacio.md,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nombre: { fontSize: tipografia.subtitulo, fontWeight: '700', color: colores.texto, flexShrink: 1 },
  distancia: { color: colores.primario, fontWeight: '800' },
  oficios: { color: colores.primario, fontWeight: '600', marginTop: espacio.xs },
  dato: { color: colores.textoSuave, marginTop: espacio.xs },
  error: { color: colores.error, marginBottom: espacio.md, fontSize: tipografia.cuerpo },
});
