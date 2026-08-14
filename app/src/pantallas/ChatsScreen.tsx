import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../api/cliente';
import { Solicitud } from '../api/tipos';
import { Avatar } from '../componentes/base/Avatar';
import { EstadoBadge } from '../componentes/EstadoBadge';
import { EmptyState } from '../componentes/feedback/EmptyState';
import { useAuth } from '../estado/AuthContext';
import { colores, espacio, margenPantalla, radio, texto as t } from '../tema/tema';

/**
 * Lista de conversaciones. Se arma con los endpoints que ya existen:
 * las solicitudes del usuario + el contador de mensajes sin leer.
 */
export function ChatsScreen({ navigation }: { navigation: any }) {
  const { sesion } = useAuth();
  const token = sesion?.token ?? '';
  const esMaestro = sesion?.rol === 'MAESTRO';

  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [noLeidos, setNoLeidos] = useState<Record<string, number>>({});
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const [lista, pendientes] = await Promise.all([
        esMaestro ? api.solicitudes.recibidas(token) : api.solicitudes.mias(token),
        api.mensajes.noLeidos(token).catch(() => ({})),
      ]);
      setSolicitudes(lista);
      setNoLeidos(pendientes);
    } catch {
      // Si falla, mostramos la lista vacía; el usuario puede reintentar volviendo.
    } finally {
      setCargando(false);
    }
  }, [token, esMaestro]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  // Primero las conversaciones con mensajes sin leer.
  const ordenadas = [...solicitudes].sort(
    (a, b) => (noLeidos[String(b.id)] ?? 0) - (noLeidos[String(a.id)] ?? 0),
  );

  return (
    <SafeAreaView style={styles.contenedor} edges={['top']}>
      <View style={styles.header}>
        <Text style={t.h1}>Mensajes</Text>
      </View>

      {cargando ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={colores.primario} />
        </View>
      ) : ordenadas.length === 0 ? (
        <EmptyState
          icono="chatbubbles-outline"
          titulo="Sin conversaciones"
          descripcion={
            esMaestro
              ? 'Cuando un cliente te contacte, la conversación aparecerá aquí.'
              : 'Solicita un servicio para empezar a conversar con un maestro.'
          }
        />
      ) : (
        <ScrollView contentContainerStyle={styles.lista}>
          {ordenadas.map((s) => {
            const nombre = esMaestro ? s.clienteNombre : s.maestroNombre;
            const sinLeer = noLeidos[String(s.id)] ?? 0;
            return (
              <Pressable
                key={s.id}
                style={({ pressed }) => [styles.fila, pressed && styles.filaPresionada]}
                onPress={() =>
                  navigation.navigate('Chat', { solicitudId: s.id, contraparteNombre: nombre })
                }>
                <Avatar nombre={nombre} tamano={48} />
                <View style={styles.filaTexto}>
                  <Text style={t.cuerpoFuerte} numberOfLines={1}>
                    {nombre}
                  </Text>
                  <Text style={styles.descripcion} numberOfLines={1}>
                    {s.descripcion}
                  </Text>
                  <View style={styles.filaEstado}>
                    <EstadoBadge estado={s.estado} />
                  </View>
                </View>
                {sinLeer > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeTexto}>{sinLeer > 9 ? '9+' : sinLeer}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: margenPantalla, paddingTop: espacio.sm, paddingBottom: espacio.md },
  lista: { paddingHorizontal: margenPantalla, paddingBottom: espacio.lg },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    backgroundColor: colores.superficie,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espacio.sm,
    marginBottom: espacio.sm,
  },
  filaPresionada: { opacity: 0.7 },
  filaTexto: { flex: 1, gap: 2 },
  descripcion: { ...t.pequeno },
  filaEstado: { flexDirection: 'row', marginTop: espacio.xxs },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: radio.completo,
    backgroundColor: colores.primario,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeTexto: { ...t.etiqueta, color: colores.blanco, fontWeight: '800' },
});
