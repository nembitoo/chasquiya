import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../api/cliente';
import { Notificacion, TipoNotificacion } from '../api/tipos';
import { Icono, NombreIcono } from '../componentes/base/Icono';
import { EmptyState } from '../componentes/feedback/EmptyState';
import { SkeletonLista } from '../componentes/feedback/Skeleton';
import { useAuth } from '../estado/AuthContext';
import { RootStackParamList } from '../navegacion/Navegacion';
import { colores, espacio, margenPantalla, radio, texto as t } from '../tema/tema';
import { tiempoRelativo } from '../utilidades/tiempo';

type Props = NativeStackScreenProps<RootStackParamList, 'Notificaciones'>;

/** Icono y color de cada tipo de aviso. */
const ESTILO: Record<TipoNotificacion, { icono: NombreIcono; color: string }> = {
  SOLICITUD_NUEVA: { icono: 'file-tray-full', color: colores.primario },
  COTIZACION_RECIBIDA: { icono: 'pricetag', color: colores.primario },
  COTIZACION_ACEPTADA: { icono: 'checkmark-circle', color: colores.exito },
  COTIZACION_RECHAZADA: { icono: 'close-circle', color: colores.textoTenue },
  AJUSTE_PROPUESTO: { icono: 'swap-horizontal', color: colores.alerta },
  AJUSTE_APROBADO: { icono: 'checkmark-circle', color: colores.exito },
  AJUSTE_RECHAZADO: { icono: 'close-circle', color: colores.error },
  TRABAJO_INICIADO: { icono: 'construct', color: colores.primario },
  TRABAJO_COMPLETADO: { icono: 'checkmark-done-circle', color: colores.exito },
  PAGO_RECIBIDO: { icono: 'cash', color: colores.exito },
  CALIFICACION_RECIBIDA: { icono: 'star', color: colores.alerta },
  SERVICIO_CANCELADO: { icono: 'ban', color: colores.error },
  VERIFICACION_APROBADA: { icono: 'shield-checkmark', color: colores.exito },
  VERIFICACION_RECHAZADA: { icono: 'alert-circle', color: colores.error },
  RECLAMO_RESPONDIDO: { icono: 'chatbubble-ellipses', color: colores.primario },
};

export function NotificacionesScreen({ navigation }: Props) {
  const { sesion } = useAuth();
  const token = sesion?.token ?? '';
  const esMaestro = sesion?.rol === 'MAESTRO';

  const [lista, setLista] = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setError('');
    try {
      const bandeja = await api.notificaciones.bandeja(token);
      setLista(bandeja.notificaciones);
      setNoLeidas(bandeja.noLeidas);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar tus notificaciones.');
    } finally {
      setCargando(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  async function abrir(n: Notificacion) {
    // Se marca leída al instante; si el servidor falla, la próxima carga corrige.
    if (!n.leida) {
      setLista((prev) => prev.map((x) => (x.id === n.id ? { ...x, leida: true } : x)));
      setNoLeidas((prev) => Math.max(0, prev - 1));
      api.notificaciones.leer(token, n.id).catch(() => undefined);
    }
    irADonde(n);
  }

  /**
   * A donde lleva cada aviso.
   *
   * Antes solo se miraba si traia solicitudId, y eso fallaba en los dos
   * extremos: "Te calificaron" aterrizaba en la lista de solicitudes ACTIVAS,
   * donde ese trabajo ya no esta porque quedo en el historial; y cualquier
   * aviso sin solicitud mandaba al perfil profesional, una pantalla que un
   * cliente ni siquiera tiene.
   */
  function irADonde(n: Notificacion) {
    if (n.tipo === 'CALIFICACION_RECIBIDA') {
      navigation.navigate('MisCalificaciones');
      return;
    }
    if (n.tipo === 'VERIFICACION_APROBADA' || n.tipo === 'VERIFICACION_RECHAZADA') {
      navigation.navigate('PerfilMaestro');
      return;
    }
    // Antes que el caso de la solicitud: un reclamo puede colgar de un servicio,
    // pero de lo que habla el aviso es del reclamo.
    if (n.tipo === 'RECLAMO_RESPONDIDO') {
      navigation.navigate('Ayuda');
      return;
    }
    if (n.solicitudId) {
      navigation.navigate('Tabs', {
        screen: esMaestro ? 'SolicitudesRecibidas' : 'MisSolicitudes',
      });
    }
    // Sin destino claro no se navega: mejor quedarse que mandar a otra parte.
  }

  async function marcarTodas() {
    setLista((prev) => prev.map((n) => ({ ...n, leida: true })));
    setNoLeidas(0);
    try {
      await api.notificaciones.leerTodas(token);
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
        <View style={styles.filaTitulo}>
          <Text style={[t.h1, { flex: 1 }]}>Notificaciones</Text>
          {noLeidas > 0 && (
            <Pressable onPress={marcarTodas} hitSlop={8}>
              <Text style={styles.enlace}>Marcar todas</Text>
            </Pressable>
          )}
        </View>
      </View>

      {cargando ? (
        <View style={styles.lista}>
          <SkeletonLista cantidad={4} />
        </View>
      ) : lista.length === 0 ? (
        <EmptyState
          icono="notifications-outline"
          titulo="Sin novedades"
          descripcion="Aquí te avisaremos cuando pase algo con tus servicios: cotizaciones, pagos y calificaciones."
        />
      ) : (
        <ScrollView contentContainerStyle={styles.lista}>
          {!!error && <Text style={styles.error}>{error}</Text>}
          {lista.map((n) => {
            const estilo = ESTILO[n.tipo] ?? { icono: 'notifications', color: colores.primario };
            return (
              <Pressable
                key={n.id}
                onPress={() => abrir(n)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.item,
                  !n.leida && styles.itemNoLeido,
                  pressed && styles.presionado,
                ]}>
                <View style={[styles.icono, { backgroundColor: estilo.color + '1A' }]}>
                  <Icono nombre={estilo.icono} tamano="lg" color={estilo.color} />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.filaTexto}>
                    <Text style={[t.cuerpoFuerte, { flex: 1 }]} numberOfLines={1}>
                      {n.titulo}
                    </Text>
                    <Text style={styles.fecha}>{tiempoRelativo(n.fechaCreacion)}</Text>
                  </View>
                  <Text style={t.pequeno}>{n.cuerpo}</Text>
                </View>

                {!n.leida && <View style={styles.punto} />}
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
  header: { paddingHorizontal: margenPantalla, paddingTop: espacio.sm },
  volver: { flexDirection: 'row', alignItems: 'center', marginBottom: espacio.xxs },
  volverTexto: { ...t.pequenoFuerte, color: colores.primario },
  filaTitulo: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
  enlace: { ...t.pequenoFuerte, color: colores.primario },
  lista: { padding: margenPantalla },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    backgroundColor: colores.superficie,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espacio.md,
    marginBottom: espacio.sm,
  },
  itemNoLeido: { borderColor: colores.primario },
  presionado: { opacity: 0.7 },
  icono: {
    width: 44,
    height: 44,
    borderRadius: radio.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filaTexto: { flexDirection: 'row', alignItems: 'center', gap: espacio.xs },
  fecha: { ...t.etiqueta, color: colores.textoTenue },
  punto: { width: 8, height: 8, borderRadius: 4, backgroundColor: colores.primario },
  error: { ...t.pequeno, color: colores.error, marginBottom: espacio.sm },
});
