import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../api/cliente';
import { Solicitud } from '../api/tipos';
import { Boton } from '../componentes/Boton';
import { BotonChat } from '../componentes/BotonChat';
import { EstadoBadge } from '../componentes/EstadoBadge';
import { formatearFechaHoraTexto } from '../componentes/SelectorFechaHora';
import { OFICIOS } from '../datos/oficios';
import { useAuth } from '../estado/AuthContext';
import { RootStackParamList } from '../navegacion/Navegacion';
import { colores, espacio, radio, tipografia } from '../tema/tema';
import { formatearCLP } from '../utilidades/moneda';

type Props = NativeStackScreenProps<RootStackParamList, 'MisSolicitudes'>;

const ETIQUETA_OFICIO: Record<string, string> = Object.fromEntries(
  OFICIOS.map((o) => [o.valor, o.etiqueta]),
);

export function MisSolicitudesScreen({ navigation }: Props) {
  const { sesion } = useAuth();
  const token = sesion?.token ?? '';

  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [noLeidos, setNoLeidos] = useState<Record<string, number>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setError('');
    try {
      const [lista, pendientes] = await Promise.all([
        api.solicitudes.mias(token),
        api.mensajes.noLeidos(token).catch(() => ({})),
      ]);
      setSolicitudes(lista);
      setNoLeidos(pendientes);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar tus solicitudes.');
    } finally {
      setCargando(false);
    }
  }, [token]);

  // Recarga cada vez que la pantalla vuelve al frente (ej. tras crear una solicitud).
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  async function accion(id: number, fn: () => Promise<Solicitud>) {
    setError('');
    setProcesando(id);
    try {
      const actualizada = await fn();
      setSolicitudes((prev) => prev.map((s) => (s.id === id ? actualizada : s)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar la acción.');
    } finally {
      setProcesando(null);
    }
  }

  return (
    <SafeAreaView style={styles.contenedor}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.navigate('Inicio')} hitSlop={12}>
          <Text style={styles.volver}>‹ Inicio</Text>
        </Pressable>
        <Text style={styles.titulo}>Mis servicios</Text>
      </View>

      {cargando ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={colores.primario} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.lista}>
          {!!error && <Text style={styles.error}>{error}</Text>}

          {solicitudes.length === 0 && !error ? (
            <View style={styles.vacioCaja}>
              <Text style={styles.vacio}>Aún no has solicitado servicios.</Text>
              <Boton titulo="Buscar maestros" onPress={() => navigation.navigate('Buscar')} />
            </View>
          ) : (
            solicitudes.map((s) => (
              <View key={s.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.maestro}>{s.maestroNombre}</Text>
                  <EstadoBadge estado={s.estado} />
                </View>
                <Text style={styles.oficio}>{ETIQUETA_OFICIO[s.oficio] ?? s.oficio}</Text>
                <Text style={styles.descripcion}>{s.descripcion}</Text>
                <Text style={styles.dato}>📍 {s.direccion}</Text>
                {!!s.fechaPreferida && (
                  <Text style={styles.dato}>🗓️ {formatearFechaHoraTexto(s.fechaPreferida)}</Text>
                )}

                {s.cotizacionMonto != null && (
                  <View style={styles.cotizacion}>
                    <Text style={styles.cotizacionMonto}>
                      Cotización: {formatearCLP(s.cotizacionMonto)}
                    </Text>
                    {!!s.cotizacionMensaje && (
                      <Text style={styles.cotizacionMensaje}>{s.cotizacionMensaje}</Text>
                    )}
                  </View>
                )}

                {!!s.motivoCancelacion && <Text style={styles.motivo}>{s.motivoCancelacion}</Text>}

                <BotonChat
                  noLeidos={noLeidos[String(s.id)] ?? 0}
                  onPress={() =>
                    navigation.navigate('Chat', { solicitudId: s.id, contraparteNombre: s.maestroNombre })
                  }
                />

                {/* Acciones según el estado (la máquina de estados manda) */}
                {s.estado === 'COTIZADO' && (
                  <View style={styles.acciones}>
                    <View style={{ flex: 1 }}>
                      <Boton
                        titulo="Aceptar"
                        cargando={procesando === s.id}
                        onPress={() => accion(s.id, () => api.solicitudes.aceptar(token, s.id))}
                      />
                    </View>
                    <View style={{ width: espacio.sm }} />
                    <View style={{ flex: 1 }}>
                      <Boton
                        titulo="Rechazar"
                        variante="secundario"
                        deshabilitado={procesando === s.id}
                        onPress={() => accion(s.id, () => api.solicitudes.rechazar(token, s.id))}
                      />
                    </View>
                  </View>
                )}

                {(s.estado === 'SOLICITADO' || s.estado === 'ACEPTADO') && (
                  <View style={styles.acciones}>
                    <View style={{ flex: 1 }}>
                      <Boton
                        titulo="Cancelar solicitud"
                        variante="secundario"
                        cargando={procesando === s.id}
                        onPress={() =>
                          accion(s.id, () => api.solicitudes.cancelar(token, s.id, 'Cancelado por el cliente'))
                        }
                      />
                    </View>
                  </View>
                )}

                {s.estado === 'COMPLETADO' && (
                  <View style={styles.acciones}>
                    <View style={{ flex: 1 }}>
                      <Boton
                        titulo="Pagar servicio"
                        onPress={() => navigation.navigate('Pago', { solicitudId: s.id })}
                      />
                    </View>
                  </View>
                )}

                {s.estado === 'PAGADO' && (
                  <Text style={styles.nota}>Servicio pagado. La calificación llega en el próximo hito.</Text>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: espacio.lg, paddingTop: espacio.sm },
  volver: { color: colores.primario, fontSize: tipografia.cuerpo, fontWeight: '600', marginBottom: espacio.xs },
  titulo: { fontSize: tipografia.titulo, fontWeight: '800', color: colores.texto },
  lista: { padding: espacio.lg },
  vacioCaja: { marginTop: espacio.xl, gap: espacio.md },
  vacio: { textAlign: 'center', color: colores.textoSuave },
  card: {
    backgroundColor: colores.blanco,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espacio.md,
    marginBottom: espacio.md,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: espacio.sm },
  maestro: { fontSize: tipografia.subtitulo, fontWeight: '700', color: colores.texto, flexShrink: 1 },
  oficio: { color: colores.primario, fontWeight: '600', marginTop: espacio.xs },
  descripcion: { color: colores.texto, marginTop: espacio.sm },
  dato: { color: colores.textoSuave, marginTop: espacio.xs, fontSize: tipografia.pequeno },
  cotizacion: {
    marginTop: espacio.md,
    backgroundColor: colores.primarioSuave,
    borderRadius: radio.sm,
    padding: espacio.sm,
  },
  cotizacionMonto: { color: colores.primario, fontWeight: '800', fontSize: tipografia.cuerpo },
  cotizacionMensaje: { color: colores.texto, marginTop: espacio.xs, fontSize: tipografia.pequeno },
  motivo: { color: colores.textoSuave, fontStyle: 'italic', marginTop: espacio.sm, fontSize: tipografia.pequeno },
  acciones: { flexDirection: 'row', marginTop: espacio.md },
  nota: { color: colores.textoSuave, fontSize: tipografia.pequeno, marginTop: espacio.md, fontStyle: 'italic' },
  error: { color: colores.error, marginBottom: espacio.md, fontSize: tipografia.cuerpo },
});
