import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../api/cliente';
import { Calificacion, MaestroPublico, ServicioCatalogo } from '../api/tipos';
import { Boton } from '../componentes/Boton';
import { Estrellas } from '../componentes/Estrellas';
import { Icono } from '../componentes/base/Icono';
import { OFICIOS } from '../datos/oficios';
import { useAuth } from '../estado/AuthContext';
import { RootStackParamList } from '../navegacion/Navegacion';
import { colores, espacio, radio, tipografia } from '../tema/tema';
import { formatearCLP } from '../utilidades/moneda';

type Props = NativeStackScreenProps<RootStackParamList, 'MaestroPublico'>;

const ETIQUETA_OFICIO: Record<string, string> = Object.fromEntries(
  OFICIOS.map((o) => [o.valor, o.etiqueta]),
);

export function MaestroPublicoScreen({ route, navigation }: Props) {
  const { usuarioId } = route.params;
  const { sesion } = useAuth();
  const token = sesion?.token ?? '';

  const [maestro, setMaestro] = useState<MaestroPublico | null>(null);
  const [resenas, setResenas] = useState<Calificacion[]>([]);
  const [servicios, setServicios] = useState<ServicioCatalogo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [m, r, s] = await Promise.all([
          api.descubrimiento.maestro(token, usuarioId),
          api.calificaciones.resenasDe(token, usuarioId).catch(() => []),
          // El catálogo es opcional: sin él el perfil se ve igual.
          api.catalogo.deMaestro(token, usuarioId).catch(() => []),
        ]);
        setMaestro(m);
        setResenas(r);
        setServicios(s);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo cargar el maestro.');
      } finally {
        setCargando(false);
      }
    })();
  }, [token, usuarioId]);

  /** Guarda o quita al maestro de favoritos. */
  async function alternarFavorito() {
    if (!maestro) return;
    setMaestro({ ...maestro, esFavorito: !maestro.esFavorito });
    try {
      await api.favoritos.alternar(token, maestro.usuarioId);
    } catch {
      setMaestro({ ...maestro });
    }
  }

  if (cargando) {
    return (
      <SafeAreaView style={[styles.contenedor, styles.centro]}>
        <ActivityIndicator size="large" color={colores.primario} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.contenedor}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.volver}>‹ Volver</Text>
        </Pressable>
      </View>

      {error || !maestro ? (
        <Text style={styles.error}>{error || 'Maestro no disponible.'}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.filaNombre}>
            <Text style={[styles.nombre, { flex: 1 }]}>
              {maestro.nombre} {maestro.apellido}
            </Text>
            <Pressable onPress={alternarFavorito} hitSlop={10} accessibilityRole="button">
              <Icono
                nombre={maestro.esFavorito ? 'heart' : 'heart-outline'}
                tamano="xl"
                color={maestro.esFavorito ? colores.primario : colores.textoTenue}
              />
            </Pressable>
          </View>
          <View style={styles.filaEstrellas}>
            <Estrellas
              valor={maestro.calificacionPromedio}
              cantidad={maestro.cantidadCalificaciones}
              tamano={16}
            />
          </View>
          <Text style={styles.oficios}>
            {maestro.oficios.map((o) => ETIQUETA_OFICIO[o] ?? o).join('  ')}
          </Text>

          <View style={styles.filaDatos}>
            <Dato etiqueta="Experiencia" valor={`${maestro.aniosExperiencia} años`} />
            <Dato etiqueta="Trabajos" valor={`${maestro.trabajosCompletados}`} />
            <Dato etiqueta="Zona" valor={maestro.zonaCobertura ?? '—'} />
            <Dato
              etiqueta="Tarifa ref."
              valor={maestro.tarifaReferencial ? `$${maestro.tarifaReferencial}` : '—'}
            />
          </View>

          {servicios.length > 0 && (
            <>
              <Text style={styles.seccion}>Servicios y precios</Text>
              {servicios.map((s) => (
                <View key={s.id} style={styles.servicio}>
                  <View style={styles.servicioTop}>
                    <Text style={styles.servicioTitulo}>{s.titulo}</Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.servicioPrecio}>
                        {s.precioFijo ? '' : 'desde '}
                        {formatearCLP(s.precio)}
                      </Text>
                      {!!s.unidad && <Text style={styles.servicioUnidad}>{s.unidad}</Text>}
                    </View>
                  </View>

                  {/* Un precio fijo y un "desde" no son lo mismo: decirlo evita
                      que el cliente crea que ya sabe lo que va a pagar. */}
                  <View style={[styles.sello, s.precioFijo ? styles.selloFirme : styles.selloDesde]}>
                    <Text
                      style={[
                        styles.selloTexto,
                        s.precioFijo ? styles.selloTextoFirme : styles.selloTextoDesde,
                      ]}>
                      {s.precioFijo ? 'Precio fijo' : 'Precio de referencia'}
                    </Text>
                  </View>

                  {!!s.descripcion && <Text style={styles.servicioDetalle}>{s.descripcion}</Text>}

                  <Pressable
                    hitSlop={8}
                    onPress={() =>
                      navigation.navigate('NuevaSolicitud', {
                        maestroId: maestro.usuarioId,
                        maestroNombre: `${maestro.nombre} ${maestro.apellido}`,
                        oficios: maestro.oficios,
                        servicio: {
                          id: s.id,
                          titulo: s.titulo,
                          precio: s.precio,
                          precioFijo: s.precioFijo,
                          oficio: s.oficio,
                        },
                      })
                    }>
                    <Text style={styles.servicioPedir}>Pedir este servicio ›</Text>
                  </Pressable>
                </View>
              ))}
            </>
          )}

          {!!maestro.descripcion && (
            <>
              <Text style={styles.seccion}>Sobre mí</Text>
              <Text style={styles.descripcion}>{maestro.descripcion}</Text>
            </>
          )}

          {resenas.length > 0 && (
            <>
              <Text style={styles.seccion}>Reseñas de clientes</Text>
              {resenas.slice(0, 5).map((r) => (
                <View key={r.id} style={styles.resena}>
                  <View style={styles.resenaTop}>
                    <Text style={styles.resenaAutor}>{r.autorNombre}</Text>
                    <Estrellas valor={r.estrellas} />
                  </View>
                  {!!r.comentario && <Text style={styles.resenaComentario}>{r.comentario}</Text>}
                </View>
              ))}
            </>
          )}

          {!!aviso && <Text style={styles.aviso}>{aviso}</Text>}

          <View style={styles.acciones}>
            <Boton
              titulo="Solicitar servicio"
              onPress={() =>
                navigation.navigate('NuevaSolicitud', {
                  maestroId: maestro.usuarioId,
                  maestroNombre: `${maestro.nombre} ${maestro.apellido}`,
                  oficios: maestro.oficios,
                })
              }
            />
            <View style={{ height: espacio.sm }} />
            <Boton
              titulo="Enviar mensaje"
              variante="secundario"
              onPress={() =>
                setAviso('El chat se abre cuando tengas un servicio con este maestro. Solicítalo primero.')
              }
            />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.dato}>
      <Text style={styles.datoEtiqueta}>{etiqueta}</Text>
      <Text style={styles.datoValor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  centro: { justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: espacio.lg, paddingTop: espacio.sm },
  volver: { color: colores.primario, fontSize: tipografia.cuerpo, fontWeight: '600' },
  scroll: { padding: espacio.lg },
  nombre: { fontSize: tipografia.titulo, fontWeight: '800', color: colores.texto },
  filaNombre: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
  oficios: { color: colores.primario, fontWeight: '600', fontSize: tipografia.cuerpo, marginTop: espacio.xs },
  filaDatos: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: espacio.lg,
    backgroundColor: colores.blanco,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espacio.md,
  },
  dato: { alignItems: 'center', flex: 1 },
  datoEtiqueta: { color: colores.textoSuave, fontSize: tipografia.pequeno },
  datoValor: { color: colores.texto, fontWeight: '700', marginTop: espacio.xs },
  seccion: { fontSize: tipografia.subtitulo, fontWeight: '700', color: colores.texto, marginTop: espacio.lg },
  servicio: {
    backgroundColor: colores.blanco,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espacio.md,
    marginTop: espacio.sm,
  },
  servicioTop: { flexDirection: 'row', alignItems: 'flex-start', gap: espacio.sm },
  servicioTitulo: { flex: 1, fontWeight: '700', color: colores.texto, fontSize: tipografia.cuerpo },
  servicioPrecio: { fontWeight: '800', color: colores.primario, fontSize: tipografia.cuerpo },
  servicioUnidad: { fontSize: tipografia.pequeno, color: colores.textoSuave },
  sello: {
    alignSelf: 'flex-start',
    borderRadius: radio.completo,
    paddingHorizontal: espacio.sm,
    paddingVertical: 2,
    marginTop: espacio.xs,
  },
  selloFirme: { backgroundColor: colores.exitoFondo },
  selloDesde: { backgroundColor: colores.alertaFondo },
  selloTexto: { fontSize: tipografia.pequeno, fontWeight: '700' },
  selloTextoFirme: { color: colores.exitoTexto },
  selloTextoDesde: { color: colores.alertaTexto },
  servicioDetalle: { color: colores.textoSuave, fontSize: tipografia.pequeno, marginTop: espacio.xs },
  servicioPedir: {
    color: colores.primario,
    fontWeight: '700',
    fontSize: tipografia.pequeno,
    marginTop: espacio.sm,
  },
  descripcion: { color: colores.texto, marginTop: espacio.sm, lineHeight: 22 },
  filaEstrellas: { marginTop: espacio.sm },
  resena: {
    backgroundColor: colores.blanco,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espacio.md,
    marginTop: espacio.sm,
  },
  resenaTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resenaAutor: { fontWeight: '700', color: colores.texto, flexShrink: 1 },
  resenaComentario: { color: colores.textoSuave, marginTop: espacio.xs },
  aviso: { color: colores.textoSuave, marginTop: espacio.lg, fontStyle: 'italic' },
  acciones: { marginTop: espacio.xl },
  error: { color: colores.error, padding: espacio.lg, fontSize: tipografia.cuerpo },
});
