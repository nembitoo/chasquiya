import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

import { MaestroCercano } from '../../api/tipos';
import { NOMBRE_OFICIO } from '../../datos/oficios';
import { colores, espacio, radio, sombra, texto as t } from '../../tema/tema';
import { formatearCLP } from '../../utilidades/moneda';
import { AvatarUsuario } from '../base/AvatarUsuario';
import { Icono } from '../base/Icono';
import { Estrellas } from '../Estrellas';

type Props = {
  maestros: MaestroCercano[];
  /** Centro inicial: dónde está el cliente. */
  centro: { lat: number; lon: number };
  onVerPerfil: (usuarioId: number) => void;
};

/** Grados de latitud que se ven de una vez. 0.06 ≈ 6-7 km, un barrio amplio. */
const ZOOM_INICIAL = 0.06;

/**
 * Mapa de maestros cercanos.
 *
 * Los marcadores usan la posición APROXIMADA que entrega el backend (~500 m),
 * no la dirección del maestro. Por eso el mapa dice "zona aproximada": promete
 * exactamente lo que muestra.
 */
export function MapaMaestros({ maestros, centro, onVerPerfil }: Props) {
  const mapa = useRef<MapView>(null);
  const [elegido, setElegido] = useState<MaestroCercano | null>(null);

  const ubicables = maestros.filter((m) => m.latitudAprox != null && m.longitudAprox != null);

  // Si cambian los resultados, el seleccionado puede ya no estar en la lista.
  useEffect(() => {
    setElegido((actual) =>
      actual && ubicables.some((m) => m.usuarioId === actual.usuarioId) ? actual : null,
    );
  }, [maestros]);

  function centrarEnMi() {
    mapa.current?.animateToRegion({
      latitude: centro.lat,
      longitude: centro.lon,
      latitudeDelta: ZOOM_INICIAL,
      longitudeDelta: ZOOM_INICIAL,
    });
  }

  return (
    <View style={styles.contenedor}>
      <MapView
        ref={mapa}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: centro.lat,
          longitude: centro.lon,
          latitudeDelta: ZOOM_INICIAL,
          longitudeDelta: ZOOM_INICIAL,
        }}
        showsUserLocation
        showsMyLocationButton={false}
        // Tocar el mapa (fuera de un marcador) cierra la tarjeta.
        onPress={() => setElegido(null)}>
        {ubicables.map((m) => (
          <Marker
            key={m.usuarioId}
            coordinate={{ latitude: m.latitudAprox as number, longitude: m.longitudAprox as number }}
            onPress={() => setElegido(m)}
            tracksViewChanges={false}>
            <View style={[styles.pin, elegido?.usuarioId === m.usuarioId && styles.pinActivo]}>
              <Text style={styles.pinTexto}>
                {m.tarifaReferencial ? formatearCLP(m.tarifaReferencial) : '$—'}
              </Text>
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={styles.aviso}>
        <Icono nombre="information-circle-outline" tamano="sm" color={colores.textoSuave} />
        <Text style={styles.avisoTexto}>Zona aproximada, no la dirección exacta</Text>
      </View>

      <Pressable style={styles.botonCentrar} onPress={centrarEnMi} accessibilityLabel="Centrar en mi ubicación">
        <Icono nombre="locate" tamano="lg" color={colores.primario} />
      </Pressable>

      {ubicables.length === 0 && (
        <View style={styles.sinUbicacion}>
          <Text style={styles.sinUbicacionTexto}>
            Ningún maestro de esta búsqueda tiene su zona registrada.
          </Text>
        </View>
      )}

      {!!elegido && (
        <Pressable style={styles.tarjeta} onPress={() => onVerPerfil(elegido.usuarioId)}>
          <AvatarUsuario
            usuarioId={elegido.usuarioId}
            nombre={`${elegido.nombre} ${elegido.apellido}`}
            tieneAvatar={elegido.tieneAvatar}
            tamano={48}
          />
          <View style={{ flex: 1 }}>
            <Text style={t.h3} numberOfLines={1}>
              {elegido.nombre} {elegido.apellido}
            </Text>
            <Text style={styles.oficio} numberOfLines={1}>
              {elegido.oficios.map((o) => NOMBRE_OFICIO[o] ?? o).join(' · ')}
            </Text>
            <View style={styles.filaDatos}>
              <Estrellas valor={elegido.calificacionPromedio} cantidad={elegido.cantidadCalificaciones} />
              <Text style={styles.distancia}>{elegido.distanciaKm} km</Text>
            </View>
          </View>
          <Icono nombre="chevron-forward" tamano="md" color={colores.textoTenue} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
  pin: {
    backgroundColor: colores.superficie,
    borderWidth: 1.5,
    borderColor: colores.primario,
    borderRadius: 999,
    paddingHorizontal: espacio.xs,
    paddingVertical: 3,
    ...sombra.nivel1,
  },
  pinActivo: { backgroundColor: colores.primario },
  pinTexto: { ...t.etiqueta, fontWeight: '700', color: colores.primario },
  aviso: {
    position: 'absolute',
    top: espacio.sm,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.xxs,
    backgroundColor: colores.superficie,
    borderRadius: 999,
    paddingHorizontal: espacio.sm,
    paddingVertical: espacio.xxs,
    ...sombra.nivel1,
  },
  avisoTexto: { ...t.etiqueta, color: colores.textoSuave },
  botonCentrar: {
    position: 'absolute',
    right: espacio.md,
    bottom: espacio.xl,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colores.superficie,
    alignItems: 'center',
    justifyContent: 'center',
    ...sombra.nivel2,
  },
  sinUbicacion: {
    position: 'absolute',
    left: espacio.md,
    right: espacio.md,
    bottom: espacio.md,
    backgroundColor: colores.superficie,
    borderRadius: radio.md,
    padding: espacio.md,
    ...sombra.nivel1,
  },
  sinUbicacionTexto: { ...t.pequeno, textAlign: 'center' },
  tarjeta: {
    position: 'absolute',
    left: espacio.md,
    right: espacio.md,
    bottom: espacio.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    backgroundColor: colores.superficie,
    borderRadius: radio.md,
    padding: espacio.md,
    ...sombra.nivel2,
  },
  oficio: { ...t.pequeno, color: colores.primario },
  filaDatos: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm, marginTop: 2 },
  distancia: { ...t.pequenoFuerte, color: colores.primario },
});
