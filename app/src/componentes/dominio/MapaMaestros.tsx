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

  /*
   * Los marcadores tienen contenido propio (el precio). En Android,
   * react-native-maps convierte ese contenido en imagen UNA vez; si se le dice
   * `tracksViewChanges={false}` desde el inicio, saca la foto antes de que el
   * contenido se haya medido y el marcador queda invisible.
   *
   * Por eso se sigue el cambio al principio y se corta después: así se dibuja
   * bien y igual se evita el costo de redibujar en cada movimiento del mapa.
   */
  const [rastrear, setRastrear] = useState(true);

  const ubicables = maestros.filter((m) => m.latitudAprox != null && m.longitudAprox != null);

  useEffect(() => {
    setRastrear(true);
    const t = setTimeout(() => setRastrear(false), 1000);
    return () => clearTimeout(t);
  }, [maestros]);

  /*
   * La búsqueda trae maestros de hasta 25 km, pero el zoom inicial muestra unos
   * 6. Sin esto, los que están más lejos quedan fuera de la pantalla y el mapa
   * parece vacío aunque los marcadores existan.
   *
   * Se encuadra sobre los maestros y sobre uno mismo, para no perder la
   * referencia de dónde está uno.
   */
  useEffect(() => {
    if (ubicables.length === 0) return;
    const puntos = [
      { latitude: centro.lat, longitude: centro.lon },
      ...ubicables.map((m) => ({
        latitude: m.latitudAprox as number,
        longitude: m.longitudAprox as number,
      })),
    ];
    // Un respiro para que el mapa termine de montarse antes de encuadrar.
    const t = setTimeout(() => {
      mapa.current?.fitToCoordinates(puntos, {
        edgePadding: { top: 90, right: 60, bottom: 190, left: 60 },
        animated: true,
      });
    }, 600);
    return () => clearTimeout(t);
  }, [maestros, centro.lat, centro.lon]);

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
            tracksViewChanges={rastrear}>
            {/* La envoltura transparente le da aire al recorte que hace Android. */}
            <View style={styles.pinEnvoltura}>
              <View style={[styles.pin, elegido?.usuarioId === m.usuarioId && styles.pinActivo]}>
                <Text
                  style={[
                    styles.pinTexto,
                    elegido?.usuarioId === m.usuarioId && styles.pinTextoActivo,
                  ]}
                  numberOfLines={1}
                  // Sin esto, un teléfono con letra grande agranda el texto pero
                  // no la caja del marcador, y el precio sale cortado.
                  allowFontScaling={false}>
                  {m.tarifaReferencial ? formatearCLP(m.tarifaReferencial) : 'A convenir'}
                </Text>
              </View>
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={styles.aviso}>
        <Icono nombre="information-circle-outline" tamano="sm" color={colores.textoSuave} />
        <Text style={styles.avisoTexto}>
          {ubicables.length} en el mapa · zona aproximada
        </Text>
      </View>

      <Pressable style={styles.botonCentrar} onPress={centrarEnMi} accessibilityLabel="Centrar en mi ubicación">
        <Icono nombre="locate" tamano="lg" color={colores.primario} />
      </Pressable>

      {ubicables.length === 0 && (
        <View style={styles.sinUbicacion}>
          <Text style={styles.sinUbicacionTexto}>
            {maestros.length === 0
              ? 'No hay maestros cerca con estos filtros. Prueba ampliando la distancia.'
              : 'Los maestros encontrados no tienen su zona registrada, así que no se pueden ubicar en el mapa.'}
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
  // Margen alrededor del globo: Android convierte el marcador en imagen y sin
  // este aire recorta el borde y la sombra.
  pinEnvoltura: { paddingHorizontal: 6, paddingVertical: 4 },
  pin: {
    /*
     * Ancho y alto FIJOS a propósito.
     *
     * Con `minWidth` la caja tenía que crecer según lo que midiera el texto, y
     * al convertir el marcador en imagen esa medida se perdía: la caja quedaba
     * en el mínimo y el precio salía cortado ("$20.00" en vez de "$20.000").
     *
     * Con un ancho fijo el tamaño se conoce en la primera pasada de layout, sin
     * depender del texto. 82 px alcanzan para "$100.000" y para "A convenir".
     */
    width: 82,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.superficie,
    borderWidth: 1.5,
    borderColor: colores.primario,
    borderRadius: 999,
    paddingHorizontal: 8,
    // Sin `elevation`: en un marcador de Android la sombra sale recortada.
  },
  pinActivo: { backgroundColor: colores.primario, borderColor: colores.primario },
  pinTexto: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: colores.primario,
    textAlign: 'center',
    // Si algún texto no cabe, que se acorte con "…" y no que se recorte al borde.
    width: '100%',
  },
  pinTextoActivo: { color: colores.textoInverso },
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
