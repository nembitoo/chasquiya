import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MaestroCercano } from '../../api/tipos';
import { OFICIOS } from '../../datos/oficios';
import { colores, espacio, radio, sombra, texto as t } from '../../tema/tema';
import { formatearCLP } from '../../utilidades/moneda';
import { AvatarUsuario } from '../base/AvatarUsuario';
import { ICONO_OFICIO, Icono, NombreIcono } from '../base/Icono';
import { Estrellas } from '../Estrellas';

const NOMBRE_OFICIO: Record<string, string> = Object.fromEntries(
  OFICIOS.map((o) => [o.valor, o.etiqueta]),
);

type Props = {
  maestro: MaestroCercano;
  onPress: () => void;
  onFavorito?: () => void;
  /** La distancia no aplica en la lista de favoritos. */
  mostrarDistancia?: boolean;
};

/**
 * Tarjeta de maestro: la pieza más visible de la app.
 * Se usa en búsqueda, favoritos y (a futuro) en el home.
 */
export function TarjetaMaestro({ maestro, onPress, onFavorito, mostrarDistancia = true }: Props) {
  const oficioPrincipal = maestro.oficios[0];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ver perfil de ${maestro.nombre} ${maestro.apellido}`}
      style={({ pressed }) => [styles.card, pressed && styles.presionada]}>
      <View style={styles.fila}>
        <AvatarUsuario
          usuarioId={maestro.usuarioId}
          nombre={`${maestro.nombre} ${maestro.apellido}`}
          tieneAvatar={maestro.tieneAvatar}
          tamano={56}
        />

        <View style={styles.centro}>
          <View style={styles.filaNombre}>
            <Text style={styles.nombre} numberOfLines={1}>
              {maestro.nombre} {maestro.apellido}
            </Text>
            {mostrarDistancia && maestro.distanciaKm > 0 && (
              <Text style={styles.distancia}>{maestro.distanciaKm} km</Text>
            )}
          </View>

          {!!oficioPrincipal && (
            <View style={styles.filaOficio}>
              <Icono
                nombre={(ICONO_OFICIO[oficioPrincipal] ?? 'ellipsis-horizontal') as NombreIcono}
                tamano="sm"
                color={colores.primario}
              />
              <Text style={styles.oficio} numberOfLines={1}>
                {maestro.oficios.map((o) => NOMBRE_OFICIO[o] ?? o).join(' · ')}
              </Text>
            </View>
          )}

          <View style={styles.filaEstrellas}>
            <Estrellas valor={maestro.calificacionPromedio} cantidad={maestro.cantidadCalificaciones} />
          </View>
        </View>

        {!!onFavorito && (
          <Pressable
            onPress={onFavorito}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={maestro.esFavorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}>
            <Icono
              nombre={maestro.esFavorito ? 'heart' : 'heart-outline'}
              tamano="lg"
              color={maestro.esFavorito ? colores.primario : colores.textoTenue}
            />
          </Pressable>
        )}
      </View>

      <View style={styles.pie}>
        <Text style={styles.precio}>
          {maestro.tarifaReferencial ? `Desde ${formatearCLP(maestro.tarifaReferencial)}` : 'Precio a convenir'}
        </Text>
        <Text style={styles.separador}>·</Text>
        <Text style={styles.dato}>{maestro.aniosExperiencia} años exp.</Text>
        {!!maestro.zonaCobertura && (
          <>
            <Text style={styles.separador}>·</Text>
            <Text style={styles.dato} numberOfLines={1}>
              {maestro.zonaCobertura}
            </Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colores.superficie,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espacio.md,
    marginBottom: espacio.sm,
    ...sombra.nivel1,
  },
  presionada: { opacity: 0.75 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
  centro: { flex: 1, gap: 2 },
  filaNombre: { flexDirection: 'row', alignItems: 'center', gap: espacio.xs },
  nombre: { ...t.h3, flex: 1 },
  distancia: { ...t.pequenoFuerte, color: colores.primario },
  filaOficio: { flexDirection: 'row', alignItems: 'center', gap: espacio.xxs },
  oficio: { ...t.pequeno, color: colores.primario, flex: 1 },
  filaEstrellas: { marginTop: 2 },
  pie: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.xxs,
    marginTop: espacio.sm,
    paddingTop: espacio.sm,
    borderTopWidth: 1,
    borderTopColor: colores.borde,
  },
  precio: { ...t.pequenoFuerte },
  dato: { ...t.pequeno, flexShrink: 1 },
  separador: { ...t.pequeno, color: colores.textoTenue },
});
