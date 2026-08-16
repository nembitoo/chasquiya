import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../api/cliente';
import { EstadoServicio, Solicitud } from '../api/tipos';
import { Boton } from '../componentes/Boton';
import { BotonChat } from '../componentes/BotonChat';
import { EstadoBadge } from '../componentes/EstadoBadge';
import { formatearFechaHoraTexto } from '../componentes/SelectorFechaHora';
import { AvatarUsuario } from '../componentes/base/AvatarUsuario';
import { Card } from '../componentes/base/Card';
import { Dato } from '../componentes/base/Dato';
import { GaleriaFotos } from '../componentes/dominio/GaleriaFotos';
import { LineaTiempo } from '../componentes/dominio/LineaTiempo';
import { Icono } from '../componentes/base/Icono';
import { Segmentos } from '../componentes/base/Segmentos';
import { EmptyState } from '../componentes/feedback/EmptyState';
import { SkeletonLista } from '../componentes/feedback/Skeleton';
import { OFICIOS } from '../datos/oficios';
import { useAuth } from '../estado/AuthContext';
import { TabProps } from '../navegacion/Navegacion';
import { colores, espacio, margenPantalla, radio, texto as t } from '../tema/tema';
import { formatearCLP } from '../utilidades/moneda';

type Props = TabProps<'MisSolicitudes'>;
type Vista = 'activos' | 'historial';

const NOMBRE_OFICIO: Record<string, string> = Object.fromEntries(
  OFICIOS.map((o) => [o.valor, o.etiqueta]),
);

/** Los servicios terminados van al historial; el resto sigue "vivo". */
const ESTADOS_HISTORIAL: EstadoServicio[] = ['PAGADO', 'CALIFICADO', 'CANCELADO'];

export function MisSolicitudesScreen({ navigation }: Props) {
  const { sesion } = useAuth();
  const token = sesion?.token ?? '';

  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [noLeidos, setNoLeidos] = useState<Record<string, number>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState<number | null>(null);
  const [vista, setVista] = useState<Vista>('activos');
  const [busqueda, setBusqueda] = useState('');

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
      setError(e instanceof Error ? e.message : 'No se pudieron cargar tus servicios.');
    } finally {
      setCargando(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const activos = solicitudes.filter((s) => !ESTADOS_HISTORIAL.includes(s.estado));
  const historial = solicitudes.filter((s) => ESTADOS_HISTORIAL.includes(s.estado));

  /** En el historial se puede buscar por maestro, descripción, oficio o dirección. */
  const visibles = useMemo(() => {
    const base = vista === 'activos' ? activos : historial;
    const q = busqueda.trim().toLowerCase();
    if (!q) return base;
    return base.filter((s) =>
      [s.maestroNombre, s.descripcion, NOMBRE_OFICIO[s.oficio] ?? s.oficio, s.direccion]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [vista, activos, historial, busqueda]);

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

  /** Abre una solicitud nueva al mismo maestro, con los datos ya cargados. */
  function volverAContratar(s: Solicitud) {
    navigation.navigate('NuevaSolicitud', {
      maestroId: s.maestroId,
      maestroNombre: s.maestroNombre,
      oficios: [s.oficio],
      precargar: { descripcion: s.descripcion, direccion: s.direccion },
    });
  }

  return (
    <SafeAreaView style={styles.contenedor} edges={['top']}>
      <View style={styles.header}>
        <Text style={t.h1}>Mis servicios</Text>
        <View style={styles.segmentos}>
          <Segmentos<Vista>
            valor={vista}
            onCambio={setVista}
            opciones={[
              { valor: 'activos', etiqueta: 'Activos', cantidad: activos.length },
              { valor: 'historial', etiqueta: 'Historial', cantidad: historial.length },
            ]}
          />
        </View>

        {vista === 'historial' && historial.length > 0 && (
          <View style={styles.buscador}>
            <Icono nombre="search" tamano="sm" color={colores.textoTenue} />
            <TextInput
              style={styles.buscadorInput}
              value={busqueda}
              onChangeText={setBusqueda}
              placeholder="Buscar en el historial"
              placeholderTextColor={colores.textoTenue}
            />
            {!!busqueda && (
              <Pressable onPress={() => setBusqueda('')} hitSlop={8}>
                <Icono nombre="close-circle" tamano="sm" color={colores.textoTenue} />
              </Pressable>
            )}
          </View>
        )}
      </View>

      {cargando ? (
        <View style={styles.lista}>
          <SkeletonLista cantidad={3} />
        </View>
      ) : visibles.length === 0 ? (
        <EmptyState
          icono={vista === 'activos' ? 'briefcase-outline' : 'time-outline'}
          titulo={
            busqueda
              ? 'Sin coincidencias'
              : vista === 'activos'
                ? 'Sin servicios activos'
                : 'Historial vacío'
          }
          descripcion={
            busqueda
              ? 'Prueba con otras palabras.'
              : vista === 'activos'
                ? 'Cuando solicites un servicio, podrás seguirlo desde aquí.'
                : 'Aquí verás los servicios que ya terminaste.'
          }
          accion={
            vista === 'activos' && !busqueda
              ? { titulo: 'Buscar maestros', onPress: () => navigation.navigate('Buscar') }
              : undefined
          }
        />
      ) : (
        <ScrollView contentContainerStyle={styles.lista}>
          {!!error && <Text style={styles.error}>{error}</Text>}

          {visibles.map((s) => (
            <Card key={s.id}>
              {/* Cabecera: maestro + estado */}
              <View style={styles.cardTop}>
                <AvatarUsuario
                  usuarioId={s.maestroId}
                  nombre={s.maestroNombre}
                  tieneAvatar={s.maestroTieneAvatar}
                  tamano={40}
                />
                <View style={{ flex: 1 }}>
                  <Text style={t.cuerpoFuerte} numberOfLines={1}>
                    {s.maestroNombre}
                  </Text>
                  <Text style={styles.oficio}>{NOMBRE_OFICIO[s.oficio] ?? s.oficio}</Text>
                </View>
                <EstadoBadge estado={s.estado} />
              </View>

              <Text style={styles.descripcion}>{s.descripcion}</Text>
              <Dato icono="location-outline" texto={s.direccion} />
              {!!s.fechaPreferida && (
                <Dato icono="calendar-outline" texto={formatearFechaHoraTexto(s.fechaPreferida)} />
              )}
              <GaleriaFotos solicitudId={s.id} cantidad={s.cantidadFotos} />
              <LineaTiempo estado={s.estado} />

              {/* Abierta: lo que importa es cuántas ofertas llegaron, no una sola. */}
              {s.abierta && (
                <Pressable
                  style={styles.abierta}
                  onPress={() =>
                    navigation.navigate('Cotizaciones', {
                      solicitudId: s.id,
                      descripcion: s.descripcion,
                    })
                  }>
                  <Icono nombre="pricetags-outline" tamano="md" color={colores.primario} />
                  <Text style={styles.abiertaTexto}>
                    {s.cantidadCotizaciones === 0
                      ? 'Publicada, esperando cotizaciones'
                      : `${s.cantidadCotizaciones} cotización${s.cantidadCotizaciones === 1 ? '' : 'es'} · toca para comparar`}
                  </Text>
                  {s.cantidadCotizaciones > 0 && (
                    <Icono nombre="chevron-forward" tamano="md" color={colores.primario} />
                  )}
                </Pressable>
              )}

              {s.cotizacionMonto != null && (
                <View style={styles.cotizacion}>
                  <Text style={styles.cotizacionMonto}>
                    {vista === 'historial' ? 'Total: ' : 'Cotización: '}
                    {formatearCLP(s.cotizacionMonto)}
                    {s.cotizacionTipo === 'ESTIMADO' && ' (estimado)'}
                  </Text>
                  {s.cotizacionTipo === 'ESTIMADO' && !!s.cotizacionCostoVisita && (
                    <Text style={styles.cotizacionMensaje}>
                      Visita {formatearCLP(s.cotizacionCostoVisita)} · se descuenta si el trabajo se
                      hace
                    </Text>
                  )}
                  {!!s.cotizacionMensaje && (
                    <Text style={styles.cotizacionMensaje}>{s.cotizacionMensaje}</Text>
                  )}
                </View>
              )}

              {/* El trabajo está detenido: el cliente decide si acepta el precio nuevo. */}
              {s.estado === 'AJUSTE_PROPUESTO' && (
                <View style={styles.ajuste}>
                  <Text style={styles.ajusteTitulo}>
                    Nuevo precio: {formatearCLP(s.montoAjustado ?? 0)}
                  </Text>
                  {!!s.mensajeAjuste && <Text style={styles.ajusteMotivo}>{s.mensajeAjuste}</Text>}
                  <Text style={styles.ajusteAyuda}>
                    {s.cotizacionCostoVisita
                      ? `Si no aceptas, el trabajo no se hace y pagas solo la visita (${formatearCLP(
                          s.cotizacionCostoVisita,
                        )}), que ya habías aceptado.`
                      : 'Si no aceptas, el trabajo no se hace y no pagas nada.'}
                  </Text>
                  <View style={styles.acciones}>
                    <View style={{ flex: 1 }}>
                      <Boton
                        titulo="Aceptar precio"
                        tamano="sm"
                        cargando={procesando === s.id}
                        onPress={() => accion(s.id, () => api.solicitudes.aprobarAjuste(token, s.id))}
                      />
                    </View>
                    <View style={{ width: espacio.sm }} />
                    <View style={{ flex: 1 }}>
                      <Boton
                        titulo="No aceptar"
                        variante="secundario"
                        tamano="sm"
                        deshabilitado={procesando === s.id}
                        onPress={() => accion(s.id, () => api.solicitudes.rechazarAjuste(token, s.id))}
                      />
                    </View>
                  </View>
                </View>
              )}

              {s.montoVisitaCobrado != null && (
                <Text style={styles.soloVisita}>
                  El trabajo no se realizó. Se cobra solo la visita de diagnóstico.
                </Text>
              )}

              {!!s.motivoCancelacion && <Text style={styles.motivo}>{s.motivoCancelacion}</Text>}
              {!!s.resolucionDisputa && (
                <Text style={styles.motivo}>Resolución del admin: {s.resolucionDisputa}</Text>
              )}

              {/* --- Acción principal según el estado (la máquina de estados manda) --- */}
              {s.estado === 'COTIZADO' && (
                <View style={styles.acciones}>
                  <Boton
                    titulo="Aceptar"
                    style={styles.mitad}
                    cargando={procesando === s.id}
                    onPress={() => accion(s.id, () => api.solicitudes.aceptar(token, s.id))}
                  />
                  <Boton
                    titulo="Rechazar"
                    variante="secundario"
                    style={styles.mitad}
                    deshabilitado={procesando === s.id}
                    onPress={() => accion(s.id, () => api.solicitudes.rechazar(token, s.id))}
                  />
                </View>
              )}

              {s.estado === 'COMPLETADO' && (
                <View style={styles.acciones}>
                  <Boton
                    titulo="Pagar servicio"
                    icono="card-outline"
                    onPress={() => navigation.navigate('Pago', { solicitudId: s.id })}
                  />
                </View>
              )}

              {(s.estado === 'PAGADO' || s.estado === 'CALIFICADO') && !s.yaCalifique && (
                <View style={styles.acciones}>
                  <Boton
                    titulo="Calificar servicio"
                    icono="star-outline"
                    onPress={() =>
                      navigation.navigate('Calificar', {
                        solicitudId: s.id,
                        contraparteNombre: s.maestroNombre,
                        esMaestro: true,
                      })
                    }
                  />
                </View>
              )}

              {/* Recompra: el gran atajo del historial */}
              {vista === 'historial' && s.estado !== 'CANCELADO' && s.yaCalifique && (
                <View style={styles.acciones}>
                  <Boton
                    titulo="Volver a contratar"
                    variante="secundario"
                    icono="repeat"
                    onPress={() => volverAContratar(s)}
                  />
                </View>
              )}

              {/* --- Enlaces secundarios --- */}
              <View style={styles.secundarias}>
                <BotonChat
                  noLeidos={noLeidos[String(s.id)] ?? 0}
                  onPress={() =>
                    navigation.navigate('Chat', { solicitudId: s.id, contraparteNombre: s.maestroNombre })
                  }
                />
                {(s.estado === 'SOLICITADO' || s.estado === 'ACEPTADO') && (
                  <Pressable
                    hitSlop={8}
                    onPress={() =>
                      accion(s.id, () => api.solicitudes.cancelar(token, s.id, 'Cancelado por el cliente'))
                    }>
                    <Text style={styles.enlaceGris}>Cancelar</Text>
                  </Pressable>
                )}
                {(s.estado === 'EN_CURSO' || s.estado === 'COMPLETADO' || s.estado === 'PAGADO') && (
                  <Pressable
                    hitSlop={8}
                    onPress={() =>
                      accion(s.id, () =>
                        api.disputas.abrir(token, s.id, 'Problema reportado por el cliente'),
                      )
                    }>
                    <Text style={styles.enlaceRojo}>Reportar problema</Text>
                  </Pressable>
                )}
                {vista === 'historial' && s.estado === 'CANCELADO' && (
                  <Pressable hitSlop={8} onPress={() => volverAContratar(s)}>
                    <Text style={styles.enlaceRojo}>Volver a contratar</Text>
                  </Pressable>
                )}
              </View>

              {s.yaCalifique && vista === 'activos' && (
                <Text style={styles.nota}>Ya calificaste este servicio.</Text>
              )}
            </Card>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  header: { paddingHorizontal: margenPantalla, paddingTop: espacio.sm },
  segmentos: { marginTop: espacio.sm },
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.xs,
    marginTop: espacio.sm,
    height: 44,
    paddingHorizontal: espacio.sm,
    borderRadius: radio.sm,
    borderWidth: 1,
    borderColor: colores.borde,
    backgroundColor: colores.superficie,
  },
  buscadorInput: { ...t.cuerpo, flex: 1, paddingVertical: 0 },
  lista: { padding: margenPantalla, paddingTop: espacio.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
  oficio: { ...t.pequeno, color: colores.primario },
  descripcion: { ...t.cuerpo, marginTop: espacio.sm },
  ajuste: {
    backgroundColor: colores.alertaFondo,
    borderRadius: radio.sm,
    padding: espacio.md,
    marginTop: espacio.sm,
  },
  ajusteTitulo: { ...t.cuerpoFuerte, color: colores.alertaTexto },
  ajusteMotivo: { ...t.pequeno, color: colores.alertaTexto, marginTop: 2 },
  ajusteAyuda: { ...t.etiqueta, color: colores.alertaTexto, marginTop: espacio.xs },
  soloVisita: { ...t.pequeno, color: colores.textoSuave, marginTop: espacio.xs, fontStyle: 'italic' },
  abierta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.xs,
    backgroundColor: colores.primarioSuave,
    borderRadius: radio.sm,
    padding: espacio.sm,
    marginTop: espacio.sm,
  },
  abiertaTexto: { ...t.pequenoFuerte, color: colores.primario, flex: 1 },
  cotizacion: {
    marginTop: espacio.sm,
    backgroundColor: colores.primarioSuave,
    borderRadius: radio.sm,
    padding: espacio.sm,
  },
  cotizacionMonto: { ...t.cuerpoFuerte, color: colores.primario },
  cotizacionMensaje: { ...t.pequeno, marginTop: 2 },
  motivo: { ...t.pequeno, fontStyle: 'italic', marginTop: espacio.xs },
  acciones: { flexDirection: 'row', gap: espacio.sm, marginTop: espacio.md },
  mitad: { flex: 1 },
  secundarias: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacio.sm,
    marginTop: espacio.xs,
  },
  enlaceGris: { ...t.pequenoFuerte, color: colores.textoSuave },
  enlaceRojo: { ...t.pequenoFuerte, color: colores.error },
  nota: { ...t.etiqueta, fontStyle: 'italic', marginTop: espacio.xs },
  error: { ...t.pequeno, color: colores.error, marginBottom: espacio.sm },
});
