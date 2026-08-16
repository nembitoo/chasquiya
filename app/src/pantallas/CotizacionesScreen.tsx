import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../api/cliente';
import { Cotizacion } from '../api/tipos';
import { Boton } from '../componentes/Boton';
import { Estrellas } from '../componentes/Estrellas';
import { AvatarUsuario } from '../componentes/base/AvatarUsuario';
import { Icono } from '../componentes/base/Icono';
import { EmptyState } from '../componentes/feedback/EmptyState';
import { SkeletonLista } from '../componentes/feedback/Skeleton';
import { useAuth } from '../estado/AuthContext';
import { RootStackParamList } from '../navegacion/Navegacion';
import { colores, espacio, margenPantalla, radio, sombra, texto as t } from '../tema/tema';
import { formatearCLP } from '../utilidades/moneda';

type Props = NativeStackScreenProps<RootStackParamList, 'Cotizaciones'>;

/**
 * Ofertas recibidas por una solicitud abierta, para comparar y elegir.
 *
 * Vienen ordenadas de la más barata a la más cara, pero se muestran también
 * reputación y trabajos hechos: elegir solo por precio es lo que hace que un
 * marketplace se llene de trabajos mal hechos.
 */
export function CotizacionesScreen({ route, navigation }: Props) {
  const { solicitudId, descripcion } = route.params;
  const { sesion } = useAuth();
  const token = sesion?.token ?? '';
  const insets = useSafeAreaInsets();

  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [confirmando, setConfirmando] = useState<Cotizacion | null>(null);
  const [aceptando, setAceptando] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setError('');
    try {
      setCotizaciones(await api.solicitudes.cotizaciones(token, solicitudId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las cotizaciones.');
    } finally {
      setCargando(false);
    }
  }, [token, solicitudId]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  async function aceptar() {
    if (!confirmando) return;
    setError('');
    try {
      setAceptando(true);
      await api.solicitudes.aceptarCotizacion(token, solicitudId, confirmando.id);
      setConfirmando(null);
      navigation.navigate('Tabs', { screen: 'MisSolicitudes' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo aceptar la cotización.');
      setConfirmando(null);
    } finally {
      setAceptando(false);
    }
  }

  const masBarata = cotizaciones.length > 1 ? cotizaciones[0].id : null;

  return (
    <SafeAreaView style={styles.contenedor} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.volver}>
          <Icono nombre="chevron-back" tamano="md" color={colores.primario} />
          <Text style={styles.volverTexto}>Volver</Text>
        </Pressable>
        <Text style={t.h1}>Cotizaciones</Text>
        <Text style={t.pequeno} numberOfLines={2}>
          {descripcion}
        </Text>
      </View>

      {cargando ? (
        <View style={styles.lista}>
          <SkeletonLista cantidad={3} />
        </View>
      ) : cotizaciones.length === 0 ? (
        <EmptyState
          icono="hourglass-outline"
          titulo="Todavía sin ofertas"
          descripcion="Los maestros de la zona ya pueden ver tu solicitud. Te avisaremos apenas alguien cotice."
        />
      ) : (
        <ScrollView contentContainerStyle={styles.lista}>
          {!!error && <Text style={styles.error}>{error}</Text>}

          {cotizaciones.map((c) => (
            <View key={c.id} style={styles.tarjeta}>
              {c.id === masBarata && (
                <View style={styles.cinta}>
                  <Text style={styles.cintaTexto}>Más económica</Text>
                </View>
              )}

              <View style={styles.filaTop}>
                <AvatarUsuario
                  usuarioId={c.maestroId}
                  nombre={c.maestroNombre}
                  tieneAvatar={c.maestroTieneAvatar}
                  tamano={48}
                />
                <View style={{ flex: 1 }}>
                  <Text style={t.h3} numberOfLines={1}>
                    {c.maestroNombre}
                  </Text>
                  <Estrellas valor={c.calificacionPromedio} cantidad={c.cantidadCalificaciones} />
                </View>
                <Text style={styles.monto}>{formatearCLP(c.monto)}</Text>
              </View>

              <View style={styles.filaDatos}>
                <Text style={styles.dato}>{c.trabajosCompletados} trabajos hechos</Text>
                <Text style={styles.separador}>·</Text>
                <Text style={styles.dato}>{c.aniosExperiencia} años exp.</Text>
              </View>

              {!!c.mensaje && <Text style={styles.mensaje}>{c.mensaje}</Text>}

              <View style={styles.acciones}>
                <View style={{ flex: 1 }}>
                  <Boton
                    titulo="Ver perfil"
                    variante="secundario"
                    tamano="sm"
                    onPress={() => navigation.navigate('MaestroPublico', { usuarioId: c.maestroId })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Boton titulo="Elegir" tamano="sm" onPress={() => setConfirmando(c)} />
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Elegir cierra la competencia: conviene confirmarlo. */}
      <Modal visible={!!confirmando} transparent animationType="slide" onRequestClose={() => setConfirmando(null)}>
        <View style={styles.modalFondo}>
          <View style={[styles.modalCaja, { paddingBottom: espacio.lg + insets.bottom }]}>
            <Text style={t.h2}>¿Elegir a {confirmando?.maestroNombre}?</Text>
            <Text style={styles.modalTexto}>
              Se cerrará la búsqueda por {formatearCLP(confirmando?.monto ?? 0)} y podrán coordinar
              por el chat. A los demás maestros les avisaremos que no siguieron.
            </Text>
            <Boton titulo="Sí, elegir" onPress={aceptar} cargando={aceptando} />
            <Boton titulo="Volver a comparar" variante="secundario" onPress={() => setConfirmando(null)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  header: { paddingHorizontal: margenPantalla, paddingTop: espacio.sm },
  volver: { flexDirection: 'row', alignItems: 'center', marginBottom: espacio.xxs },
  volverTexto: { ...t.pequenoFuerte, color: colores.primario },
  lista: { padding: margenPantalla },
  tarjeta: {
    backgroundColor: colores.superficie,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espacio.md,
    marginBottom: espacio.sm,
    ...sombra.nivel1,
  },
  cinta: {
    alignSelf: 'flex-start',
    backgroundColor: colores.exitoFondo,
    borderRadius: 999,
    paddingHorizontal: espacio.sm,
    paddingVertical: 2,
    marginBottom: espacio.xs,
  },
  cintaTexto: { ...t.etiqueta, color: colores.exitoTexto, fontWeight: '700' },
  filaTop: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
  monto: { ...t.h2, color: colores.primario },
  filaDatos: { flexDirection: 'row', alignItems: 'center', gap: espacio.xxs, marginTop: espacio.xs },
  dato: { ...t.pequeno },
  separador: { ...t.pequeno, color: colores.textoTenue },
  mensaje: { ...t.pequeno, marginTop: espacio.xs, fontStyle: 'italic' },
  acciones: { flexDirection: 'row', gap: espacio.sm, marginTop: espacio.sm },
  error: { ...t.pequeno, color: colores.error, marginBottom: espacio.sm },
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCaja: {
    backgroundColor: colores.superficie,
    borderTopLeftRadius: radio.lg,
    borderTopRightRadius: radio.lg,
    padding: espacio.lg,
    gap: espacio.xs,
  },
  modalTexto: { ...t.pequeno, marginBottom: espacio.sm },
});
