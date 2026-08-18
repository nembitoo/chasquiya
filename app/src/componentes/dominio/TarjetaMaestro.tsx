import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MaestroCercano } from '../../api/tipos';
import { NOMBRE_OFICIO } from '../../datos/oficios';
import { colores, espacio, radio, sombra, texto as t } from '../../tema/tema';
import { formatearCLP } from '../../utilidades/moneda';
import { AvatarUsuario } from '../base/AvatarUsuario';
import { ICONO_OFICIO, Icono, NombreIcono } from '../base/Icono';
import { Estrellas } from '../Estrellas';

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
        {/* El precio es del oficio que se está buscando, y va con el nombre del
            servicio: un monto suelto haría creer que ESE es el precio de
            cualquier trabajo. */}
        <View style={styles.filaPrecio}>
          <Text style={styles.precio}>
            {maestro.precio == null
              ? 'Precio a convenir'
              : maestro.precioFijo
                ? formatearCLP(maestro.precio)
                : `Desde ${formatearCLP(maestro.precio)}`}
          </Text>
          {maestro.precio != null && maestro.precioFijo && (
            <View style={styles.sello}>
              <Text style={styles.selloTexto}>Precio fijo</Text>
            </View>
          )}
        </View>
        {!!maestro.precioServicio && (
          <Text style={styles.servicio} numberOfLines={1}>
            {maestro.precioServicio}
          </Text>
        )}

        <View style={styles.filaDatos}>
          <Text style={styles.dato}>{maestro.aniosExperiencia} años exp.</Text>
          {maestro.trabajosCompletados > 0 && (
            <>
              <Text style={styles.separador}>·</Text>
              <Text style={styles.dato}>{maestro.trabajosCompletados} trabajos</Text>
            </>
          )}
          {!!maestro.zonaCobertura && (
            <>
              <Text style={styles.separador}>·</Text>
              <Text style={styles.dato} numberOfLines={1}>
                {maestro.zonaCobertura}
              </Text>
            </>
          )}
        </View>
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
    marginTop: espacio.sm,
    paddingTop: espacio.sm,
    borderTopWidth: 1,
    borderTopColor: colores.borde,
  },
  filaPrecio: { flexDirection: 'row', alignItems: 'center', gap: espacio.xs },
  precio: { ...t.cuerpoFuerte, color: colores.primario },
  sello: {
    backgroundColor: colores.exitoFondo,
    borderRadius: radio.completo,
    paddingHorizontal: espacio.xs,
    paddingVertical: 1,
  },
  selloTexto: { ...t.etiqueta, color: colores.exitoTexto, fontWeight: '700' },
  servicio: { ...t.etiqueta, color: colores.textoSuave, marginTop: 1 },
  filaDatos: { flexDirection: 'row', alignItems: 'center', gap: espacio.xxs, marginTop: espacio.xs },
  dato: { ...t.pequeno, flexShrink: 1 },
  separador: { ...t.pequeno, color: colores.textoTenue },
});
