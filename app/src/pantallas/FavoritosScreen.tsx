import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../api/cliente';
import { MaestroCercano } from '../api/tipos';
import { Icono } from '../componentes/base/Icono';
import { TarjetaMaestro } from '../componentes/dominio/TarjetaMaestro';
import { EmptyState } from '../componentes/feedback/EmptyState';
import { SkeletonLista } from '../componentes/feedback/Skeleton';
import { useAuth } from '../estado/AuthContext';
import { RootStackParamList } from '../navegacion/Navegacion';
import { colores, espacio, margenPantalla, texto as t } from '../tema/tema';

type Props = NativeStackScreenProps<RootStackParamList, 'Favoritos'>;

/** "Mis maestros": los que el cliente guardó para volver a contratarlos. */
export function FavoritosScreen({ navigation }: Props) {
  const { sesion } = useAuth();
  const token = sesion?.token ?? '';

  const [maestros, setMaestros] = useState<MaestroCercano[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setError('');
    try {
      setMaestros(await api.favoritos.mios(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar tus favoritos.');
    } finally {
      setCargando(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  async function quitar(maestroId: number) {
    // Se quita al instante y, si falla, se recarga la lista real.
    setMaestros((prev) => prev.filter((m) => m.usuarioId !== maestroId));
    try {
      await api.favoritos.alternar(token, maestroId);
    } catch {
      cargar();
    }
  }

  return (
    <SafeAreaView style={styles.contenedor} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.volver}>
          <Icono nombre="chevron-back" tamano="md" color={colores.primario} />
          <Text style={styles.volverTexto}>Volver</Text>
        </Pressable>
        <Text style={t.h1}>Mis maestros</Text>
      </View>

      {cargando ? (
        <View style={styles.lista}>
          <SkeletonLista cantidad={3} />
        </View>
      ) : maestros.length === 0 ? (
        <EmptyState
          icono="heart-outline"
          titulo="Sin maestros guardados"
          descripcion="Toca el corazón en un maestro para guardarlo y encontrarlo rápido la próxima vez."
          accion={{ titulo: 'Buscar maestros', onPress: () => navigation.navigate('Tabs', { screen: 'Buscar' }) }}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.lista}>
          {!!error && <Text style={styles.error}>{error}</Text>}
          {maestros.map((m) => (
            <TarjetaMaestro
              key={m.usuarioId}
              maestro={m}
              mostrarDistancia={false}
              onPress={() => navigation.navigate('MaestroPublico', { usuarioId: m.usuarioId })}
              onFavorito={() => quitar(m.usuarioId)}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  header: { paddingHorizontal: margenPantalla, paddingTop: espacio.sm },
  volver: { flexDirection: 'row', alignItems: 'center', marginBottom: espacio.xxs },
  volverTexto: { ...t.pequenoFuerte, color: colores.primario },
  lista: { padding: margenPantalla },
  error: { ...t.pequeno, color: colores.error, marginBottom: espacio.sm },
});
