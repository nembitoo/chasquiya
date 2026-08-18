import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../api/cliente';
import { EstadoServicio, Solicitud, TipoCotizacion } from '../api/tipos';
import { Boton } from '../componentes/Boton';
import { BotonChat } from '../componentes/BotonChat';
import { Dato } from '../componentes/base/Dato';
import { GaleriaFotos } from '../componentes/dominio/GaleriaFotos';
import { LineaTiempo } from '../componentes/dominio/LineaTiempo';
import { Segmentos } from '../componentes/base/Segmentos';
import { CampoTexto } from '../componentes/CampoTexto';
import { EstadoBadge } from '../componentes/EstadoBadge';
import { formatearFechaHoraTexto } from '../componentes/SelectorFechaHora';
import { OFICIOS } from '../datos/oficios';
import { useAuth } from '../estado/AuthContext';
import { TabProps } from '../navegacion/Navegacion';
import { colores, espacio, radio, tipografia } from '../tema/tema';
import { formatearCLP } from '../utilidades/moneda';

type Props = TabProps<'SolicitudesRecibidas'>;
type Vista = 'activos' | 'abiertas' | 'historial';

/** Los trabajos terminados pasan al historial; el resto sigue "vivo". */
const ESTADOS_HISTORIAL: EstadoServicio[] = ['PAGADO', 'CALIFICADO', 'CANCELADO'];

const ETIQUETA_OFICIO: Record<string, string> = Object.fromEntries(
  OFICIOS.map((o) => [o.valor, o.etiqueta]),
);

export function SolicitudesRecibidasScreen({ navigation }: Props) {
  const { sesion } = useAuth();
  const token = sesion?.token ?? '';

  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [abiertas, setAbiertas] = useState<Solicitud[]>([]);
  const [noLeidos, setNoLeidos] = useState<Record<string, number>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState<number | null>(null);
  // Formulario de cotización abierto (por solicitud).
  const [cotizando, setCotizando] = useState<number | null>(null);
  const [monto, setMonto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [tipo, setTipo] = useState<TipoCotizacion>('CERRADO');
  const [costoVisita, setCostoVisita] = useState('');
  const [ajustando, setAjustando] = useState<number | null>(null);
  const [montoAjuste, setMontoAjuste] = useState('');
  const [motivoAjuste, setMotivoAjuste] = useState('');
  const [vista, setVista] = useState<Vista>('activos');

  const cargar = useCallback(async () => {
    setError('');
    try {
      const [lista, pendientes, disponibles] = await Promise.all([
        api.solicitudes.recibidas(token),
        api.mensajes.noLeidos(token).catch(() => ({})),
        // Si el perfil no está aprobado el backend responde 403: no es un error
        // que deba romper la pantalla, simplemente no hay trabajos disponibles.
        api.solicitudes.abiertas(token).catch(() => [] as Solicitud[]),
      ]);
      setSolicitudes(lista);
      setNoLeidos(pendientes);
      setAbiertas(disponibles);
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

  const activos = solicitudes.filter((s) => !ESTADOS_HISTORIAL.includes(s.estado));
  const historial = solicitudes.filter((s) => ESTADOS_HISTORIAL.includes(s.estado));
  const visibles = useMemo(
    () => (vista === 'activos' ? activos : vista === 'abiertas' ? abiertas : historial),
    [vista, activos, abiertas, historial],
  );

  /**
   * Abre el formulario limpio. Si la solicitud salió de su catálogo, el monto
   * llega precargado con lo que él mismo publicó: es un punto de partida, no
   * una obligación — puede cambiarlo antes de enviar.
   */
  function abrirCotizacion(s: Solicitud) {
    setMonto(s.precioCatalogo != null ? String(s.precioCatalogo) : '');
    setMensaje('');
    setTipo('CERRADO');
    setCostoVisita('');
    setCotizando(s.id);
  }

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

  async function enviarAjuste(id: number) {
    if (!montoAjuste || Number(montoAjuste) <= 0) {
      setError('Ingresa el monto nuevo.');
      return;
    }
    if (!motivoAjuste.trim()) {
      setError('Explica por qué cambia el precio: el cliente tiene que entenderlo.');
      return;
    }
    await accion(id, () =>
      api.solicitudes.proponerAjuste(token, id, Number(montoAjuste), motivoAjuste.trim()),
    );
    setAjustando(null);
    setMontoAjuste('');
    setMotivoAjuste('');
  }

  async function enviarCotizacion(id: number, esAbierta = false) {
    if (!monto || Number(monto) <= 0) {
      setError('Ingresa un monto válido.');
      return;
    }
    await accion(id, () =>
      api.solicitudes.cotizar(
        token,
        id,
        Number(monto),
        mensaje.trim(),
        tipo,
        tipo === 'ESTIMADO' && costoVisita ? Number(costoVisita) : null,
      ),
    );
    // Las abiertas viven en otra lista: hay que recargar para que la tarjeta
    // muestre la cotización recién enviada.
    if (esAbierta) {
      await cargar();
    }
    setCotizando(null);
    setMonto('');
    setMensaje('');
    setCostoVisita('');
    setTipo('CERRADO');
  }

  return (
    <SafeAreaView style={styles.contenedor} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Solicitudes recibidas</Text>
        <View style={styles.segmentos}>
          <Segmentos<Vista>
            valor={vista}
            onCambio={setVista}
            opciones={[
              { valor: 'activos', etiqueta: 'Activas', cantidad: activos.length },
              { valor: 'abiertas', etiqueta: 'Disponibles', cantidad: abiertas.length },
              { valor: 'historial', etiqueta: 'Historial', cantidad: historial.length },
            ]}
          />
        </View>
      </View>

      {cargando ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={colores.primario} />
        </View>
      ) : (
        /* El formulario vive dentro de la lista: sin esto el teclado tapa el
           campo justo cuando lo estas escribiendo. */
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.lista} keyboardShouldPersistTaps="handled">
          {!!error && <Text style={styles.error}>{error}</Text>}

          {vista === 'abiertas' && visibles.length > 0 && (
            <Text style={styles.ayudaAbiertas}>
              Trabajos publicados por clientes de tu zona. Cotizar no te compromete: el cliente
              compara y decide.
            </Text>
          )}

          {visibles.length === 0 && !error ? (
            <Text style={styles.vacio}>
              {vista === 'activos'
                ? 'No tienes solicitudes activas. Cuando un cliente te contacte, aparecerán aquí.'
                : vista === 'abiertas'
                  ? 'Aquí aparecen los trabajos de los oficios que tengas publicados en tu catálogo. Si no ves ninguno, publica tus servicios con precio o vuelve más tarde.'
                  : 'Aquí verás los trabajos que ya terminaste.'}
            </Text>
          ) : (
            visibles.map((s) => (
              <View key={s.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.cliente}>{s.clienteNombre}</Text>
                  <EstadoBadge estado={s.estado} />
                </View>
                <Text style={styles.oficio}>{ETIQUETA_OFICIO[s.oficio] ?? s.oficio}</Text>
                <Text style={styles.descripcion}>{s.descripcion}</Text>
                <Dato icono="location-outline" texto={s.direccion} />
                {!!s.fechaPreferida && (
                  <Dato icono="calendar-outline" texto={formatearFechaHoraTexto(s.fechaPreferida)} />
                )}
                <GaleriaFotos solicitudId={s.id} cantidad={s.cantidadFotos} />
                <LineaTiempo estado={s.estado} />
                {s.presupuestoEstimado != null && (
                  <Text style={styles.dato}>
                    Presupuesto del cliente: {formatearCLP(s.presupuestoEstimado)}
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

                {/* En una solicitud abierta todavía no hay relación con el
                    cliente: el chat se abre recién si te eligen. */}
                {!s.abierta && (
                  <BotonChat
                    noLeidos={noLeidos[String(s.id)] ?? 0}
                    onPress={() =>
                      navigation.navigate('Chat', { solicitudId: s.id, contraparteNombre: s.clienteNombre })
                    }
                  />
                )}

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
                  <Text style={styles.nota}>Ya calificaste a este cliente.</Text>
                )}

                {(s.estado === 'EN_CURSO' || s.estado === 'COMPLETADO' || s.estado === 'PAGADO') && (
                  <Pressable
                    onPress={() =>
                      accion(s.id, () =>
                        api.disputas.abrir(token, s.id, 'Problema reportado por el maestro'),
                      )
                    }>
                    <Text style={styles.reportar}>Reportar un problema</Text>
                  </Pressable>
                )}

                {/* Acciones del maestro según el estado */}
                {s.estado === 'SOLICITADO' &&
                  (cotizando === s.id ? (
                    <View style={styles.formulario}>
                      {/* Comprometerse a un precio o avisar que es estimado
                          cambia todo para el cliente: se elige explícito. */}
                      <Text style={styles.etiquetaTipo}>Tu precio</Text>
                      <View style={styles.tipos}>
                        {(['CERRADO', 'ESTIMADO'] as const).map((tp) => (
                          <Pressable
                            key={tp}
                            onPress={() => setTipo(tp)}
                            style={[styles.tipoOpcion, tipo === tp && styles.tipoOpcionActiva]}>
                            <Text style={[styles.tipoTitulo, tipo === tp && styles.tipoTituloActivo]}>
                              {tp === 'CERRADO' ? 'Precio cerrado' : 'Estimado'}
                            </Text>
                            <Text style={styles.tipoAyuda}>
                              {tp === 'CERRADO'
                                ? 'No cambia. Te comprometes a ese monto.'
                                : 'Puedes ajustarlo tras ver el trabajo.'}
                            </Text>
                          </Pressable>
                        ))}
                      </View>

                      <CampoTexto
                        etiqueta={tipo === 'CERRADO' ? 'Monto (CLP)' : 'Monto estimado (CLP)'}
                        value={monto}
                        onChangeText={setMonto}
                        keyboardType="number-pad"
                      />

                      {tipo === 'ESTIMADO' && (
                        <CampoTexto
                          etiqueta="Costo de la visita (CLP, opcional)"
                          value={costoVisita}
                          onChangeText={setCostoVisita}
                          keyboardType="number-pad"
                          ayuda="Se descuenta si el trabajo se hace. Solo se cobra si el cliente no acepta el precio final. Déjalo vacío si no cobras la visita."
                        />
                      )}
                      <CampoTexto
                        etiqueta="Mensaje (opcional)"
                        value={mensaje}
                        onChangeText={setMensaje}
                        placeholder="Ej: incluye materiales y garantía"
                      />
                      <Boton
                        titulo="Enviar cotización"
                        cargando={procesando === s.id}
                        onPress={() => enviarCotizacion(s.id, s.abierta)}
                      />
                      <View style={{ height: espacio.sm }} />
                      <Boton titulo="Cancelar" variante="secundario" onPress={() => setCotizando(null)} />
                    </View>
                  ) : (
                    <View style={styles.acciones}>
                      <View style={{ flex: 1 }}>
                        <Boton titulo="Cotizar" onPress={() => abrirCotizacion(s)} />
                      </View>
                      {/* En una abierta no se ofrece "Declinar": el trabajo no es
                          tuyo, así que no hay nada que cancelar. Basta con no
                          cotizar, y eso no se penaliza (Ley 21.431). */}
                      {!s.abierta && <View style={{ width: espacio.sm }} />}
                      <View style={{ flex: 1 }}>
                        {!s.abierta && (
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
                        )}
                      </View>
                    </View>
                  ))}

                {/*
                  * Cotizado y esperando al cliente. Un pedido del catálogo con
                  * precio fijo entra directo aquí, sin pasar por "Cotizar", así
                  * que sin esta salida el maestro quedaría atado a un trabajo
                  * que nunca aceptó. Declinar no se penaliza (Ley 21.431).
                  */}
                {s.estado === 'COTIZADO' && (
                  <>
                    <Text style={styles.nota}>Esperando que el cliente acepte tu precio.</Text>
                    <View style={styles.acciones}>
                      <View style={{ flex: 1 }}>
                        <Boton
                          titulo="Ya no puedo tomarlo"
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
                  </>
                )}

                {s.estado === 'ACEPTADO' &&
                  (ajustando === s.id ? (
                    <View style={styles.formulario}>
                      <Text style={styles.etiquetaTipo}>Precio nuevo</Text>
                      <CampoTexto
                        etiqueta="Monto (CLP)"
                        value={montoAjuste}
                        onChangeText={setMontoAjuste}
                        keyboardType="number-pad"
                      />
                      <CampoTexto
                        etiqueta="¿Por qué cambia?"
                        value={motivoAjuste}
                        onChangeText={setMotivoAjuste}
                        placeholder="Ej: el tablero estaba quemado, hay que cambiarlo entero"
                      />
                      <Text style={styles.avisoAjuste}>
                        El trabajo queda detenido hasta que el cliente lo apruebe. Si no acepta,
                        cobras solo la visita que habías informado.
                      </Text>
                      <Boton
                        titulo="Enviar precio nuevo"
                        cargando={procesando === s.id}
                        onPress={() => enviarAjuste(s.id)}
                      />
                      <View style={{ height: espacio.sm }} />
                      <Boton titulo="Cancelar" variante="secundario" onPress={() => setAjustando(null)} />
                    </View>
                  ) : (
                    <View style={styles.acciones}>
                      <View style={{ flex: 1 }}>
                        <Boton
                          titulo="Iniciar trabajo"
                          cargando={procesando === s.id}
                          onPress={() => accion(s.id, () => api.solicitudes.iniciar(token, s.id))}
                        />
                      </View>
                      {/* Solo quien cotizó estimado puede reajustar: un precio
                          cerrado es un compromiso. */}
                      {s.cotizacionTipo === 'ESTIMADO' && (
                        <>
                          <View style={{ width: espacio.sm }} />
                          <View style={{ flex: 1 }}>
                            <Boton
                              titulo="Ajustar precio"
                              variante="secundario"
                              onPress={() => setAjustando(s.id)}
                            />
                          </View>
                        </>
                      )}
                    </View>
                  ))}

                {s.estado === 'AJUSTE_PROPUESTO' && (
                  <View style={styles.ajustePendiente}>
                    <Text style={styles.ajusteTitulo}>
                      Esperando respuesta: {formatearCLP(s.montoAjustado ?? 0)}
                    </Text>
                    {!!s.mensajeAjuste && <Text style={styles.dato}>{s.mensajeAjuste}</Text>}
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
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: espacio.lg, paddingTop: espacio.sm },
  segmentos: { marginTop: espacio.sm, marginBottom: espacio.xs },
  volver: { color: colores.primario, fontSize: tipografia.cuerpo, fontWeight: '600', marginBottom: espacio.xs },
  titulo: { fontSize: tipografia.titulo, fontWeight: '800', color: colores.texto },
  lista: { padding: espacio.lg },
  etiquetaTipo: {
    fontSize: tipografia.pequeno,
    color: colores.textoSuave,
    fontWeight: '600',
    marginBottom: espacio.xs,
  },
  tipos: { flexDirection: 'row', gap: espacio.sm, marginBottom: espacio.md },
  tipoOpcion: {
    flex: 1,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.sm,
    padding: espacio.sm,
    backgroundColor: colores.superficie,
  },
  tipoOpcionActiva: { borderColor: colores.primario, backgroundColor: colores.primarioSuave },
  tipoTitulo: { fontSize: tipografia.cuerpo, fontWeight: '700', color: colores.texto },
  tipoTituloActivo: { color: colores.primario },
  tipoAyuda: { fontSize: tipografia.pequeno, color: colores.textoSuave, marginTop: 2 },
  avisoAjuste: {
    fontSize: tipografia.pequeno,
    color: colores.textoSuave,
    marginBottom: espacio.sm,
  },
  ajustePendiente: {
    backgroundColor: colores.alertaFondo,
    borderRadius: radio.sm,
    padding: espacio.sm,
    marginTop: espacio.sm,
  },
  ajusteTitulo: { fontSize: tipografia.cuerpo, fontWeight: '700', color: colores.alertaTexto },
  ayudaAbiertas: {
    fontSize: tipografia.pequeno,
    color: colores.textoSuave,
    marginBottom: espacio.sm,
  },
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
