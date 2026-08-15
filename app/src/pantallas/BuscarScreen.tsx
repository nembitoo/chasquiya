import * as Location from 'expo-location';
import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../api/cliente';
import { FiltrosBusqueda, MaestroCercano, Oficio } from '../api/tipos';
import { Boton } from '../componentes/Boton';
import { ICONO_OFICIO, Icono, NombreIcono } from '../componentes/base/Icono';
import { MapaMaestros } from '../componentes/dominio/MapaMaestros';
import { TarjetaMaestro } from '../componentes/dominio/TarjetaMaestro';
import { EmptyState } from '../componentes/feedback/EmptyState';
import { SkeletonLista } from '../componentes/feedback/Skeleton';
import { NOMBRE_OFICIO, OFICIOS } from '../datos/oficios';
import { useAuth } from '../estado/AuthContext';
import { TabProps } from '../navegacion/Navegacion';
import { colores, espacio, margenPantalla, radio, texto as t } from '../tema/tema';
import { formatearCLP } from '../utilidades/moneda';

type Props = TabProps<'Buscar'>;

// Si el cliente no da permiso de ubicación, usamos el centro de Santiago.
const UBICACION_POR_DEFECTO = { lat: -33.4489, lon: -70.6693 };

const ORDENES: { valor: NonNullable<FiltrosBusqueda['orden']>; etiqueta: string }[] = [
  { valor: 'distancia', etiqueta: 'Más cercanos' },
  { valor: 'calificacion', etiqueta: 'Mejor evaluados' },
  { valor: 'precio', etiqueta: 'Más económicos' },
];

const RADIOS = [5, 10, 25, 50];
const PRECIOS = [10000, 20000, 30000, 50000];
const NOTAS = [3, 4, 4.5];

export function BuscarScreen({ navigation }: Props) {
  const { sesion } = useAuth();
  const token = sesion?.token ?? '';

  const [ubicacion, setUbicacion] = useState<{ lat: number; lon: number } | null>(null);
  const [usandoDefecto, setUsandoDefecto] = useState(false);
  const [oficio, setOficio] = useState<Oficio | null>(null);
  const [filtros, setFiltros] = useState<FiltrosBusqueda>({ orden: 'distancia' });
  const [panelAbierto, setPanelAbierto] = useState(false);

  const insets = useSafeAreaInsets();
  const [vista, setVista] = useState<'lista' | 'mapa'>('lista');
  const [texto, setTexto] = useState('');
  const [maestros, setMaestros] = useState<MaestroCercano[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Ubicación, una sola vez al abrir.
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setUsandoDefecto(true);
          setUbicacion(UBICACION_POR_DEFECTO);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        setUbicacion({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      } catch {
        setUsandoDefecto(true);
        setUbicacion(UBICACION_POR_DEFECTO);
      }
    })();
  }, []);

  const cargar = useCallback(async () => {
    if (!ubicacion) return;
    setError('');
    setCargando(true);
    try {
      setMaestros(
        await api.descubrimiento.buscar(token, ubicacion.lat, ubicacion.lon, {
          ...filtros,
          oficio: oficio ?? undefined,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo buscar.');
    } finally {
      setCargando(false);
    }
  }, [ubicacion, oficio, filtros, token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  /** Guarda o quita el favorito, actualizando la tarjeta al instante. */
  async function alternarFavorito(maestroId: number) {
    setMaestros((prev) =>
      prev.map((m) => (m.usuarioId === maestroId ? { ...m, esFavorito: !m.esFavorito } : m)),
    );
    try {
      await api.favoritos.alternar(token, maestroId);
    } catch {
      cargar();
    }
  }

  const busqueda = texto.trim().toLowerCase();
  const visibles = busqueda
    ? maestros.filter((m) =>
        [m.nombre, m.apellido, m.zonaCobertura ?? '', ...m.oficios.map((o) => NOMBRE_OFICIO[o] ?? o)]
          .join(' ')
          .toLowerCase()
          .includes(busqueda),
      )
    : maestros;

  const filtrosActivos =
    (filtros.radioKm ? 1 : 0) +
    (filtros.precioMaximo ? 1 : 0) +
    (filtros.calificacionMinima ? 1 : 0) +
    (filtros.orden && filtros.orden !== 'distancia' ? 1 : 0);

  return (
    <SafeAreaView style={styles.contenedor} edges={['top']}>
      <View style={styles.header}>
        <Text style={t.h1}>Buscar maestros</Text>
        {usandoDefecto && (
          <Text style={styles.aviso}>Sin permiso de ubicación: buscando desde el centro de Santiago.</Text>
        )}
        {/* Filtra sobre los resultados ya traídos: no hace falta volver al servidor. */}
        <View style={styles.buscador}>
          <Icono nombre="search" tamano="md" color={colores.textoTenue} />
          <TextInput
            value={texto}
            onChangeText={setTexto}
            placeholder="Nombre, oficio o zona"
            placeholderTextColor={colores.textoTenue}
            style={styles.buscadorInput}
            autoCorrect={false}
          />
          {texto.length > 0 && (
            <Pressable onPress={() => setTexto('')} hitSlop={8} accessibilityLabel="Limpiar búsqueda">
              <Icono nombre="close-circle" tamano="md" color={colores.textoTenue} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Categorías */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chips}
        contentContainerStyle={styles.chipsContenido}>
        <Chip texto="Todos" activo={oficio === null} onPress={() => setOficio(null)} />
        {OFICIOS.map((o) => (
          <Chip
            key={o.valor}
            texto={o.etiqueta}
            icono={ICONO_OFICIO[o.valor] as NombreIcono}
            activo={oficio === o.valor}
            onPress={() => setOficio(oficio === o.valor ? null : o.valor)}
          />
        ))}
      </ScrollView>

      {/* Resumen + acceso a filtros */}
      <View style={styles.barraFiltros}>
        <Text style={styles.contador}>
          {cargando ? 'Buscando…' : `${visibles.length} ${visibles.length === 1 ? 'maestro' : 'maestros'}`}
        </Text>
        {/* Lista o mapa: la misma búsqueda vista de dos maneras. */}
        <View style={styles.selectorVista}>
          {(['lista', 'mapa'] as const).map((v) => (
            <Pressable
              key={v}
              onPress={() => setVista(v)}
              accessibilityRole="button"
              accessibilityState={{ selected: vista === v }}
              style={[styles.selectorBoton, vista === v && styles.selectorBotonActivo]}>
              <Icono
                nombre={v === 'lista' ? 'list' : 'map'}
                tamano="sm"
                color={vista === v ? colores.textoInverso : colores.textoSuave}
              />
              <Text style={[styles.selectorTexto, vista === v && styles.selectorTextoActivo]}>
                {v === 'lista' ? 'Lista' : 'Mapa'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.botonFiltros} onPress={() => setPanelAbierto(true)}>
          <Icono nombre="options-outline" tamano="sm" color={colores.primario} />
          <Text style={styles.botonFiltrosTexto}>Filtros</Text>
          {filtrosActivos > 0 && (
            <View style={styles.contadorFiltros}>
              <Text style={styles.contadorFiltrosTexto}>{filtrosActivos}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {vista === 'mapa' && !cargando && ubicacion ? (
        <MapaMaestros
          maestros={visibles}
          centro={ubicacion}
          onVerPerfil={(usuarioId) => navigation.navigate('MaestroPublico', { usuarioId })}
        />
      ) : cargando ? (
        <View style={styles.lista}>
          <SkeletonLista cantidad={4} />
        </View>
      ) : visibles.length === 0 ? (
        <EmptyState
          icono="search-outline"
          titulo="Sin resultados"
          descripcion={
            busqueda
              ? `Ningún maestro cercano coincide con "${texto.trim()}".`
              : 'No hay maestros aprobados con esos filtros. Prueba ampliando la distancia o cambiando de categoría.'
          }
          accion={{
            titulo: busqueda ? 'Limpiar búsqueda' : 'Limpiar filtros',
            onPress: () => {
              if (busqueda) {
                setTexto('');
              } else {
                setOficio(null);
                setFiltros({ orden: 'distancia' });
              }
            },
          }}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.lista}>
          {!!error && <Text style={styles.error}>{error}</Text>}
          {visibles.map((m) => (
            <TarjetaMaestro
              key={m.usuarioId}
              maestro={m}
              onPress={() => navigation.navigate('MaestroPublico', { usuarioId: m.usuarioId })}
              onFavorito={() => alternarFavorito(m.usuarioId)}
            />
          ))}
        </ScrollView>
      )}

      {/* Panel de filtros (hoja inferior con el Modal nativo) */}
      <Modal visible={panelAbierto} transparent animationType="slide" onRequestClose={() => setPanelAbierto(false)}>
        <Pressable style={styles.modalFondo} onPress={() => setPanelAbierto(false)}>
          {/* El inset deja el botón de aplicar sobre los controles del teléfono. */}
          <Pressable
            style={[styles.hoja, { paddingBottom: margenPantalla + insets.bottom }]}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.asa} />
            <Text style={[t.h2, styles.hojaTitulo]}>Filtros</Text>

            <Text style={styles.grupoTitulo}>Ordenar por</Text>
            <View style={styles.grupo}>
              {ORDENES.map((o) => (
                <Chip
                  key={o.valor}
                  texto={o.etiqueta}
                  activo={(filtros.orden ?? 'distancia') === o.valor}
                  onPress={() => setFiltros({ ...filtros, orden: o.valor })}
                />
              ))}
            </View>

            <Text style={styles.grupoTitulo}>Distancia máxima</Text>
            <View style={styles.grupo}>
              {RADIOS.map((r) => (
                <Chip
                  key={r}
                  texto={`${r} km`}
                  activo={filtros.radioKm === r}
                  onPress={() => setFiltros({ ...filtros, radioKm: filtros.radioKm === r ? undefined : r })}
                />
              ))}
            </View>

            <Text style={styles.grupoTitulo}>Precio hasta</Text>
            <View style={styles.grupo}>
              {PRECIOS.map((p) => (
                <Chip
                  key={p}
                  texto={formatearCLP(p)}
                  activo={filtros.precioMaximo === p}
                  onPress={() =>
                    setFiltros({ ...filtros, precioMaximo: filtros.precioMaximo === p ? undefined : p })
                  }
                />
              ))}
            </View>

            <Text style={styles.grupoTitulo}>Calificación mínima</Text>
            <View style={styles.grupo}>
              {NOTAS.map((n) => (
                <Chip
                  key={n}
                  texto={`${n}+`}
                  icono="star"
                  activo={filtros.calificacionMinima === n}
                  onPress={() =>
                    setFiltros({
                      ...filtros,
                      calificacionMinima: filtros.calificacionMinima === n ? undefined : n,
                    })
                  }
                />
              ))}
            </View>

            <View style={styles.hojaAcciones}>
              <Boton titulo="Ver resultados" onPress={() => setPanelAbierto(false)} />
              <Boton
                titulo="Limpiar"
                variante="terciario"
                onPress={() => setFiltros({ orden: 'distancia' })}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function Chip({
  texto,
  icono,
  activo,
  onPress,
}: {
  texto: string;
  icono?: NombreIcono;
  activo: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, activo && styles.chipActivo]}>
      {!!icono && (
        <Icono nombre={icono} tamano="sm" color={activo ? colores.primario : colores.textoSuave} />
      )}
      <Text style={[styles.chipTexto, activo && styles.chipTextoActivo]}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  header: { paddingHorizontal: margenPantalla, paddingTop: espacio.sm },
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.xs,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.md,
    paddingHorizontal: espacio.md,
    height: 46,
    marginTop: espacio.sm,
  },
  buscadorInput: { flex: 1, ...t.cuerpo, paddingVertical: 0 },
  selectorVista: {
    flexDirection: 'row',
    backgroundColor: colores.neutral[100],
    borderRadius: 999,
    padding: 3,
    marginRight: espacio.xs,
  },
  selectorBoton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.xxs,
    paddingHorizontal: espacio.sm,
    paddingVertical: espacio.xxs,
    borderRadius: 999,
  },
  selectorBotonActivo: { backgroundColor: colores.primario },
  selectorTexto: { ...t.pequenoFuerte, color: colores.textoSuave },
  selectorTextoActivo: { color: colores.textoInverso },
  aviso: { ...t.etiqueta, marginTop: espacio.xxs },
  chips: { maxHeight: 52, marginTop: espacio.sm },
  chipsContenido: { paddingHorizontal: margenPantalla, gap: espacio.xs, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.xxs,
    borderRadius: radio.completo,
    borderWidth: 1.5,
    borderColor: colores.borde,
    backgroundColor: colores.superficie,
    paddingHorizontal: espacio.sm + 2,
    height: 38,
  },
  chipActivo: { borderColor: colores.primario, backgroundColor: colores.primarioSuave },
  chipTexto: { ...t.pequenoFuerte, color: colores.textoSuave },
  chipTextoActivo: { color: colores.primario },
  barraFiltros: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: margenPantalla,
    paddingVertical: espacio.sm,
  },
  contador: { ...t.pequeno },
  botonFiltros: { flexDirection: 'row', alignItems: 'center', gap: espacio.xxs },
  botonFiltrosTexto: { ...t.pequenoFuerte, color: colores.primario },
  contadorFiltros: {
    minWidth: 18,
    height: 18,
    borderRadius: radio.completo,
    backgroundColor: colores.primario,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  contadorFiltrosTexto: { ...t.etiqueta, color: colores.blanco, fontWeight: '800' },
  lista: { paddingHorizontal: margenPantalla, paddingBottom: espacio.lg },
  error: { ...t.pequeno, color: colores.error, marginBottom: espacio.sm },
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  hoja: {
    backgroundColor: colores.superficie,
    borderTopLeftRadius: radio.xl,
    borderTopRightRadius: radio.xl,
    padding: margenPantalla,
    paddingBottom: espacio.xl,
  },
  asa: {
    width: 40,
    height: 4,
    borderRadius: radio.completo,
    backgroundColor: colores.bordeFuerte,
    alignSelf: 'center',
    marginBottom: espacio.md,
  },
  hojaTitulo: { marginBottom: espacio.md },
  grupoTitulo: { ...t.etiqueta, fontWeight: '700', marginBottom: espacio.xs, marginTop: espacio.sm },
  grupo: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.xs },
  hojaAcciones: { marginTop: espacio.lg, gap: espacio.xs },
});
