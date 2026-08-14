import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../api/cliente';
import { Solicitud } from '../api/tipos';
import { Boton } from '../componentes/Boton';
import { BotonChat } from '../componentes/BotonChat';
import { CampoTexto } from '../componentes/CampoTexto';
import { EstadoBadge } from '../componentes/EstadoBadge';
import { formatearFechaHoraTexto } from '../componentes/SelectorFechaHora';
import { OFICIOS } from '../datos/oficios';
import { useAuth } from '../estado/AuthContext';
import { TabProps } from '../navegacion/Navegacion';
import { colores, espacio, radio, tipografia } from '../tema/tema';
import { formatearCLP } from '../utilidades/moneda';

type Props = TabProps<'SolicitudesRecibidas'>;

const ETIQUETA_OFICIO: Record<string, string> = Object.fromEntries(
  OFICIOS.map((o) => [o.valor, o.etiqueta]),
);

export function SolicitudesRecibidasScreen({ navigation }: Props) {
  const { sesion } = useAuth();
  const token = sesion?.token ?? '';

  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [noLeidos, setNoLeidos] = useState<Record<string, number>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState<number | null>(null);
  // Formulario de cotización abierto (por solicitud).
  const [cotizando, setCotizando] = useState<number | null>(null);
  const [monto, setMonto] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargar = useCallback(async () => {
    setError('');
    try {
      const [lista, pendientes] = await Promise.all([
        api.solicitudes.recibidas(token),
        api.mensajes.noLeidos(token).catch(() => ({})),
      ]);
      setSolicitudes(lista);
      setNoLeidos(pendientes);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las solicitudes.');
    } finally {
      setCargando(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

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

  async function enviarCotizacion(id: number) {
    if (!monto || Number(monto) <= 0) {
      setError('Ingresa un monto válido.');
      return;
    }
    await accion(id, () => api.solicitudes.cotizar(token, id, Number(monto), mensaje.trim()));
    setCotizando(null);
    setMonto('');
    setMensaje('');
  }

  return (
    <SafeAreaView style={styles.contenedor}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Solicitudes recibidas</Text>
      </View>

      {cargando ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={colores.primario} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.lista} keyboardShouldPersistTaps="handled">
          {!!error && <Text style={styles.error}>{error}</Text>}

          {solicitudes.length === 0 && !error ? (
            <Text style={styles.vacio}>
              Todavía no recibes solicitudes. Cuando un cliente te contacte, aparecerán aquí.
            </Text>
          ) : (
            solicitudes.map((s) => (
              <View key={s.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.cliente}>{s.clienteNombre}</Text>
                  <EstadoBadge estado={s.estado} />
                </View>
                <Text style={styles.oficio}>{ETIQUETA_OFICIO[s.oficio] ?? s.oficio}</Text>
                <Text style={styles.descripcion}>{s.descripcion}</Text>
                <Text style={styles.dato}>📍 {s.direccion}</Text>
                {!!s.fechaPreferida && (
                  <Text style={styles.dato}>🗓️ {formatearFechaHoraTexto(s.fechaPreferida)}</Text>
                )}
                {s.presupuestoEstimado != null && (
                  <Text style={styles.dato}>
                    💰 Presupuesto del cliente: {formatearCLP(s.presupuestoEstimado)}
                  </Text>
                )}

                {s.cotizacionMonto != null && (
                  <View style={styles.cotizacion}>
                    <Text style={styles.cotizacionMonto}>
                      Tu cotización: {formatearCLP(s.cotizacionMonto)}
                    </Text>
                    {!!s.cotizacionMensaje && (
                      <Text style={styles.cotizacionMensaje}>{s.cotizacionMensaje}</Text>
                    )}
                  </View>
                )}

                {!!s.motivoCancelacion && <Text style={styles.motivo}>{s.motivoCancelacion}</Text>}

                {!!s.resolucionDisputa && (
                  <Text style={styles.motivo}>Resolución del admin: {s.resolucionDisputa}</Text>
                )}

                <BotonChat
                  noLeidos={noLeidos[String(s.id)] ?? 0}
                  onPress={() =>
                    navigation.navigate('Chat', { solicitudId: s.id, contraparteNombre: s.clienteNombre })
                  }
                />

                {(s.estado === 'PAGADO' || s.estado === 'CALIFICADO') && !s.yaCalifique && (
                  <View style={styles.acciones}>
                    <View style={{ flex: 1 }}>
                      <Boton
                        titulo="Calificar al cliente"
                        onPress={() =>
                          navigation.navigate('Calificar', {
                            solicitudId: s.id,
                            contraparteNombre: s.clienteNombre,
                            esMaestro: false,
                          })
                        }
                      />
                    </View>
                  </View>
                )}

                {s.yaCalifique && (
                  <Text style={styles.nota}>Ya calificaste a este cliente. ⭐</Text>
                )}

                {(s.estado === 'EN_CURSO' || s.estado === 'COMPLETADO' || s.estado === 'PAGADO') && (
                  <Pressable
                    onPress={() =>
                      accion(s.id, () =>
                        api.disputas.abrir(token, s.id, 'Problema reportado por el maestro'),
                      )
                    }>
                    <Text style={styles.reportar}>⚠️ Reportar un problema</Text>
                  </Pressable>
                )}

                {/* Acciones del maestro según el estado */}
                {s.estado === 'SOLICITADO' &&
                  (cotizando === s.id ? (
                    <View style={styles.formulario}>
                      <CampoTexto
                        etiqueta="Monto (CLP)"
                        value={monto}
                        onChangeText={setMonto}
                        keyboardType="number-pad"
                      />
                      <CampoTexto
                        etiqueta="Mensaje (opcional)"
                        value={mensaje}
                        onChangeText={setMensaje}
                        placeholder="Ej: incluye materiales y garantía"
                      />
                      <Boton
                        titulo="Enviar cotización"
                        cargando={procesando === s.id}
                        onPress={() => enviarCotizacion(s.id)}
                      />
                      <View style={{ height: espacio.sm }} />
                      <Boton titulo="Cancelar" variante="secundario" onPress={() => setCotizando(null)} />
                    </View>
                  ) : (
                    <View style={styles.acciones}>
                      <View style={{ flex: 1 }}>
                        <Boton titulo="Cotizar" onPress={() => setCotizando(s.id)} />
                      </View>
                      <View style={{ width: espacio.sm }} />
                      <View style={{ flex: 1 }}>
                        <Boton
                          titulo="Declinar"
                          variante="secundario"
                          deshabilitado={procesando === s.id}
                          onPress={() =>
                            accion(s.id, () =>
                              api.solicitudes.cancelar(token, s.id, 'El maestro no puede tomar el trabajo'),
                            )
                          }
                        />
                      </View>
                    </View>
                  ))}

                {s.estado === 'ACEPTADO' && (
                  <View style={styles.acciones}>
                    <View style={{ flex: 1 }}>
                      <Boton
                        titulo="Iniciar trabajo"
                        cargando={procesando === s.id}
                        onPress={() => accion(s.id, () => api.solicitudes.iniciar(token, s.id))}
                      />
                    </View>
                  </View>
                )}

                {s.estado === 'EN_CURSO' && (
                  <View style={styles.acciones}>
                    <View style={{ flex: 1 }}>
                      <Boton
                        titulo="Marcar como completado"
                        cargando={procesando === s.id}
                        onPress={() => accion(s.id, () => api.solicitudes.completar(token, s.id))}
                      />
                    </View>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: espacio.lg, paddingTop: espacio.sm },
  volver: { color: colores.primario, fontSize: tipografia.cuerpo, fontWeight: '600', marginBottom: espacio.xs },
  titulo: { fontSize: tipografia.titulo, fontWeight: '800', color: colores.texto },
  lista: { padding: espacio.lg },
  vacio: { textAlign: 'center', color: colores.textoSuave, marginTop: espacio.xl, paddingHorizontal: espacio.md },
  card: {
    backgroundColor: colores.blanco,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espacio.md,
    marginBottom: espacio.md,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: espacio.sm },
  cliente: { fontSize: tipografia.subtitulo, fontWeight: '700', color: colores.texto, flexShrink: 1 },
  oficio: { color: colores.primario, fontWeight: '600', marginTop: espacio.xs },
  descripcion: { color: colores.texto, marginTop: espacio.sm },
  dato: { color: colores.textoSuave, marginTop: espacio.xs, fontSize: tipografia.pequeno },
  cotizacion: {
    marginTop: espacio.md,
    backgroundColor: colores.primarioSuave,
    borderRadius: radio.sm,
    padding: espacio.sm,
  },
  cotizacionMonto: { color: colores.primario, fontWeight: '800', fontSize: tipografia.cuerpo },
  cotizacionMensaje: { color: colores.texto, marginTop: espacio.xs, fontSize: tipografia.pequeno },
  motivo: { color: colores.textoSuave, fontStyle: 'italic', marginTop: espacio.sm, fontSize: tipografia.pequeno },
  acciones: { flexDirection: 'row', marginTop: espacio.md },
  nota: { color: colores.textoSuave, fontSize: tipografia.pequeno, marginTop: espacio.md, fontStyle: 'italic' },
  reportar: {
    color: colores.error,
    fontSize: tipografia.pequeno,
    fontWeight: '600',
    marginTop: espacio.md,
    textAlign: 'center',
  },
  formulario: { marginTop: espacio.md },
  error: { color: colores.error, marginBottom: espacio.md, fontSize: tipografia.cuerpo },
});
