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
        {/*
          Marcador ESTÁNDAR, sin vista propia dentro.

          Antes cada pin era un <View> nuestro con el precio flotando. Eso
          fallaba distinto en cada plataforma y por la misma causa: la vista
          personalizada.
            · Android la convierte en imagen y la recortaba (5 intentos de
              arreglo: tracksViewChanges, collapsable, ancho fijo, sin sombra…).
            · iOS la dibujaba bien pero se comía el toque, así que no se podía
              seleccionar al maestro.

          El pin nativo no se rasteriza ni intercepta nada. El precio se mudó a
          la tarjeta de abajo, que es una vista normal fuera del mapa y por eso
          se comporta igual en los dos sistemas. Se pierde ver todos los precios
          de una mirada; se gana un mapa que funciona.
        */}
        {ubicables.map((m) => (
          <Marker
            key={m.usuarioId}
            coordinate={{ latitude: m.latitudAprox as number, longitude: m.longitudAprox as number }}
            /* Todos del mismo color: Android no re-renderiza pinColor sin
               remontar el marcador, y cual esta elegido ya lo dice la tarjeta. */
            pinColor={colores.primario}
            onPress={() => setElegido(m)}
          />
        ))}
      </MapView>

      <View style={styles.aviso}>
        <Icono nombre="information-circle-outline" tamano="sm" color={colores.textoSuave} />
        {/* "zona aproximada" no es relleno: es la promesa de que el mapa nunca
            muestra la ubicación exacta del maestro (Ley 21.719). */}
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

      {/* El precio dejó de estar en el pin, así que hay que decir dónde está. */}
      {!elegido && ubicables.length > 0 && (
        <View style={styles.pista}>
          <Icono nombre="hand-left-outline" tamano="sm" color={colores.textoSuave} />
          <Text style={styles.pistaTexto}>Toca un pin para ver el precio</Text>
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

            {/* El precio del oficio buscado. Antes vivía flotando en el pin;
                aquí cabe entero y además puede decir de qué servicio es. */}
            <View style={styles.filaPrecio}>
              <Text style={styles.precio}>
                {elegido.precio == null
                  ? 'Precio a convenir'
                  : elegido.precioFijo
                    ? formatearCLP(elegido.precio)
                    : `Desde ${formatearCLP(elegido.precio)}`}
              </Text>
              {elegido.precio != null && elegido.precioFijo && (
                <View style={styles.sello}>
                  <Text style={styles.selloTexto}>Precio fijo</Text>
                </View>
              )}
            </View>
            {!!elegido.precioServicio && (
              <Text style={styles.servicio} numberOfLines={1}>
                {elegido.precioServicio}
              </Text>
            )}
          </View>
          <Icono nombre="chevron-forward" tamano="md" color={colores.textoTenue} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
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
  pista: {
    position: 'absolute',
    left: espacio.md,
    right: espacio.md,
    bottom: espacio.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio.xxs,
    backgroundColor: colores.superficie,
    borderRadius: 999,
    paddingVertical: espacio.xs,
    ...sombra.nivel1,
  },
  pistaTexto: { ...t.pequeno, color: colores.textoSuave },
  filaPrecio: { flexDirection: 'row', alignItems: 'center', gap: espacio.xs, marginTop: espacio.xxs },
  precio: { ...t.cuerpoFuerte, color: colores.primario },
  sello: {
    backgroundColor: colores.exitoFondo,
    borderRadius: 999,
    paddingHorizontal: espacio.xs,
    paddingVertical: 1,
  },
  selloTexto: { ...t.etiqueta, color: colores.exitoTexto, fontWeight: '700' },
  servicio: { ...t.etiqueta, color: colores.textoSuave },
  oficio: { ...t.pequeno, color: colores.primario },
  filaDatos: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm, marginTop: 2 },
  distancia: { ...t.pequenoFuerte, color: colores.primario },
});
