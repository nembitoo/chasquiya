import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useState } from 'react';
import {
  Image,
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
import { CategoriaTicket, MensajeTicket, Solicitud, Ticket } from '../api/tipos';
import { Boton } from '../componentes/Boton';
import { CampoTexto } from '../componentes/CampoTexto';
import { Icono } from '../componentes/base/Icono';
import { Segmentos } from '../componentes/base/Segmentos';
import { GaleriaFotos } from '../componentes/dominio/GaleriaFotos';
import { EmptyState } from '../componentes/feedback/EmptyState';
import { NOMBRE_OFICIO } from '../datos/oficios';
import { useAuth } from '../estado/AuthContext';
import { RootStackParamList } from '../navegacion/Navegacion';
import { colores, espacio, margenPantalla, radio, texto as t } from '../tema/tema';
import { tiempoRelativo } from '../utilidades/tiempo';

type Props = NativeStackScreenProps<RootStackParamList, 'Ayuda'>;

const CATEGORIAS: { valor: CategoriaTicket; etiqueta: string }[] = [
  { valor: 'PAGO', etiqueta: 'Un pago' },
  { valor: 'SERVICIO', etiqueta: 'Un servicio' },
  { valor: 'CUENTA', etiqueta: 'Mi cuenta' },
  { valor: 'DENUNCIA', etiqueta: 'Denuncia' },
  { valor: 'SUGERENCIA', etiqueta: 'Sugerencia' },
  { valor: 'OTRO', etiqueta: 'Otro' },
];

/** Evidencia elegida en el teléfono, todavía sin subir. */
type FotoElegida = { uri: string; nombre: string; tipo: string };

/** Mismo tope que aplica el backend. */
const MAX_FOTOS = 5;

const ETIQUETA_ESTADO: Record<string, string> = {
  NUEVO: 'Recibido',
  EN_REVISION: 'En revisión',
  RESUELTO: 'Resuelto',
};

export function AyudaScreen({ navigation }: Props) {
  const { sesion } = useAuth();
  const token = sesion?.token ?? '';

  const [vista, setVista] = useState<'nuevo' | 'mios'>('nuevo');
  const [categoria, setCategoria] = useState<CategoriaTicket>('SERVICIO');
  const [servicios, setServicios] = useState<Solicitud[]>([]);
  const [servicioId, setServicioId] = useState<number | null>(null);
  const [fotos, setFotos] = useState<FotoElegida[]>([]);
  const [abierto, setAbierto] = useState<number | null>(null);
  const [hilo, setHilo] = useState<MensajeTicket[]>([]);
  const [cargandoHilo, setCargandoHilo] = useState(false);
  const [borrador, setBorrador] = useState('');
  const [enviandoMensaje, setEnviandoMensaje] = useState(false);
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mios, setMios] = useState<Ticket[]>([]);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const cargar = useCallback(async () => {
    try {
      setMios(await api.soporte.mios(token));
    } catch {
      /* si falla, la pestaña sale vacía */
    }
  }, [token]);

  /*
   * Los servicios propios, para poder decir de cuál es el reclamo. El maestro
   * ve los trabajos que le llegaron y el cliente los que pidió; el admin no
   * tiene servicios, así que el selector no aparece.
   */
  const cargarServicios = useCallback(async () => {
    if (sesion?.rol !== 'CLIENTE' && sesion?.rol !== 'MAESTRO') return;
    try {
      setServicios(
        sesion.rol === 'CLIENTE'
          ? await api.solicitudes.mias(token)
          : await api.solicitudes.recibidas(token),
      );
    } catch {
      /* sin servicios el reclamo igual se puede enviar: el campo es opcional */
    }
  }, [token, sesion?.rol]);

  useFocusEffect(
    useCallback(() => {
      cargar();
      cargarServicios();
    }, [cargar, cargarServicios]),
  );

  /*
   * La conversación se pide al abrirla, no al listar los reclamos: la mayoría
   * se miran sin entrar al hilo.
   */
  async function alternarHilo(ticketId: number) {
    if (abierto === ticketId) {
      setAbierto(null);
      return;
    }
    setAbierto(ticketId);
    setBorrador('');
    setHilo([]);
    setCargandoHilo(true);
    try {
      setHilo(await api.soporte.mensajes(token, ticketId));
    } catch {
      /* el hilo sale vacío; el reclamo se sigue viendo */
    } finally {
      setCargandoHilo(false);
    }
  }

  async function enviarMensaje(ticketId: number) {
    if (!borrador.trim()) return;
    try {
      setEnviandoMensaje(true);
      const m = await api.soporte.escribir(token, ticketId, borrador.trim());
      setHilo((prev) => [...prev, m]);
      setBorrador('');
      // El contador del reclamo vive en la lista, no en el hilo.
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar tu mensaje.');
    } finally {
      setEnviandoMensaje(false);
    }
  }

  async function elegirFotos() {
    setError('');
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      setError('Necesito permiso para acceder a tus fotos.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_FOTOS - fotos.length,
      quality: 0.6,
    });
    if (res.canceled) return;

    const nuevas = res.assets.map((a, i) => ({
      uri: a.uri,
      nombre: a.fileName ?? `evidencia-${Date.now()}-${i}.jpg`,
      tipo: a.mimeType ?? 'image/jpeg',
    }));
    setFotos((prev) => [...prev, ...nuevas].slice(0, MAX_FOTOS));
  }

  /** Con quién fue el trabajo: el maestro si soy cliente, y al revés. */
  function otraParte(s: Solicitud) {
    return sesion?.rol === 'MAESTRO' ? s.clienteNombre : s.maestroNombre;
  }

  async function enviar() {
    setError('');
    setExito('');
    if (!asunto.trim()) {
      setError('Escribe un asunto breve.');
      return;
    }
    if (mensaje.trim().length < 10) {
      setError('Cuéntanos un poco más para poder ayudarte.');
      return;
    }
    try {
      setEnviando(true);
      const creado = await api.soporte.crear(token, {
        categoria,
        asunto: asunto.trim(),
        mensaje: mensaje.trim(),
        solicitudId: servicioId,
      });

      // Las evidencias van después: recién ahora existe el reclamo del que
      // cuelgan. Si alguna falla no se pierde el reclamo, que es lo importante.
      let fallidas = 0;
      for (const f of fotos) {
        try {
          await api.soporte.fotos.subir(token, creado.id, f.uri, f.nombre, f.tipo);
        } catch {
          fallidas += 1;
        }
      }

      setAsunto('');
      setMensaje('');
      setServicioId(null);
      setFotos([]);
      setExito(
        fallidas > 0
          ? `Recibimos tu mensaje, pero ${fallidas} foto(s) no se pudieron subir.`
          : 'Recibimos tu mensaje. Te responderemos por acá.',
      );
      await cargar();
      setVista('mios');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar tu mensaje.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <SafeAreaView style={styles.contenedor} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.volver}>
          <Icono nombre="chevron-back" tamano="md" color={colores.primario} />
          <Text style={styles.volverTexto}>Volver</Text>
        </Pressable>
        <Text style={t.h1}>Ayuda</Text>
      </View>

      <View style={styles.segmentos}>
        <Segmentos
          opciones={[
            { valor: 'nuevo', etiqueta: 'Escribirnos' },
            { valor: 'mios', etiqueta: `Mis reclamos${mios.length ? ` (${mios.length})` : ''}` },
          ]}
          valor={vista}
          onCambio={(v) => setVista(v as 'nuevo' | 'mios')}
        />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {vista === 'nuevo' ? (
          <ScrollView contentContainerStyle={styles.cuerpo} keyboardShouldPersistTaps="handled">
            <Text style={styles.ayuda}>
              Si tu problema es con un servicio en curso, también puedes abrir una disputa desde ese
              servicio. Esto es para todo lo demás.
            </Text>

            <Text style={styles.etiqueta}>¿Sobre qué es?</Text>
            <View style={styles.pills}>
              {CATEGORIAS.map((c) => (
                <Pressable
                  key={c.valor}
                  onPress={() => setCategoria(c.valor)}
                  style={[styles.pildora, categoria === c.valor && styles.pildoraActiva]}>
                  <Text style={[styles.pildoraTexto, categoria === c.valor && styles.pildoraTextoActivo]}>
                    {c.etiqueta}
                  </Text>
                </Pressable>
              ))}
            </View>

            {servicios.length > 0 && (
              <View style={styles.bloqueServicios}>
                <Text style={styles.etiqueta}>¿Es sobre un servicio? (opcional)</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filaServicios}>
                  <Pressable
                    onPress={() => setServicioId(null)}
                    style={[styles.pildora, servicioId === null && styles.pildoraActiva]}>
                    <Text style={[styles.pildoraTexto, servicioId === null && styles.pildoraTextoActivo]}>
                      Ninguno
                    </Text>
                  </Pressable>
                  {servicios.map((s) => (
                    <Pressable
                      key={s.id}
                      onPress={() => setServicioId(s.id)}
                      style={[styles.pildora, styles.pildoraServicio, servicioId === s.id && styles.pildoraActiva]}>
                      <Text
                        style={[styles.pildoraTexto, servicioId === s.id && styles.pildoraTextoActivo]}
                        numberOfLines={1}>
                        {NOMBRE_OFICIO[s.oficio] ?? s.oficio}
                      </Text>
                      <Text style={styles.pildoraDetalle} numberOfLines={1}>
                        {otraParte(s)} · {tiempoRelativo(s.fechaCreacion)}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            <CampoTexto etiqueta="Asunto" value={asunto} onChangeText={setAsunto} maxLength={120} />
            <CampoTexto
              etiqueta="Cuéntanos qué pasó"
              value={mensaje}
              onChangeText={setMensaje}
              multiline
              numberOfLines={6}
              style={styles.multilinea}
              maxLength={2000}
            />

            <Text style={styles.etiqueta}>Fotos (opcional)</Text>
            <Text style={styles.ayudaFotos}>
              Una foto de la boleta o del trabajo mal hecho vale más que una explicación larga.
            </Text>
            <View style={styles.fotos}>
              {fotos.map((f, i) => (
                <View key={f.uri + i} style={styles.miniatura}>
                  <Image source={{ uri: f.uri }} style={styles.miniaturaImagen} />
                  <Pressable
                    onPress={() => setFotos((prev) => prev.filter((_, j) => j !== i))}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Quitar foto ${i + 1}`}
                    style={styles.quitarFoto}>
                    <Icono nombre="close" tamano="sm" color={colores.textoInverso} />
                  </Pressable>
                </View>
              ))}
              {fotos.length < MAX_FOTOS && (
                <Pressable onPress={elegirFotos} style={styles.agregarFoto} accessibilityRole="button">
                  <Icono nombre="camera-outline" tamano="lg" color={colores.primario} />
                  <Text style={styles.agregarFotoTexto}>Agregar</Text>
                </Pressable>
              )}
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}
            {!!exito && <Text style={styles.exito}>{exito}</Text>}

            <Boton titulo="Enviar" onPress={enviar} cargando={enviando} />
          </ScrollView>
        ) : mios.length === 0 ? (
          <EmptyState
            icono="chatbubble-ellipses-outline"
            titulo="Sin reclamos"
            descripcion="Cuando nos escribas, el estado de tu mensaje aparecerá acá."
            accion={{ titulo: 'Escribirnos', onPress: () => setVista('nuevo') }}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.cuerpo}>
            {mios.map((r) => (
              <View key={r.id} style={styles.tarjeta}>
                <View style={styles.filaTitulo}>
                  <Text style={[t.cuerpoFuerte, { flex: 1 }]} numberOfLines={1}>
                    {r.asunto}
                  </Text>
                  <View style={[styles.estado, r.estado === 'RESUELTO' && styles.estadoResuelto]}>
                    <Text style={[styles.estadoTexto, r.estado === 'RESUELTO' && styles.estadoTextoResuelto]}>
                      {ETIQUETA_ESTADO[r.estado] ?? r.estado}
                    </Text>
                  </View>
                </View>
                <Text style={styles.fecha}>{tiempoRelativo(r.fechaCreacion)}</Text>
                {!!r.solicitudId && (
                  <View style={styles.servicioTag}>
                    <Icono nombre="construct-outline" tamano="sm" color={colores.textoSuave} />
                    <Text style={styles.servicioTexto} numberOfLines={1}>
                      {r.servicioOficio
                        ? `${NOMBRE_OFICIO[r.servicioOficio] ?? r.servicioOficio}${
                            r.servicioMaestro ? ` · ${r.servicioMaestro}` : ''
                          }`
                        : `Servicio #${r.solicitudId}`}
                    </Text>
                  </View>
                )}
                <Text style={t.pequeno}>{r.mensaje}</Text>
                <GaleriaFotos
                  cantidad={r.cantidadFotos}
                  listar={() => api.soporte.fotos.listar(token, r.id)}
                  urlDe={(fotoId) => api.soporte.fotos.url(r.id, fotoId)}
                  etiqueta="Ver evidencia del reclamo"
                />
                {/* Con el hilo abierto la respuesta ya se ve dentro: aquí solo
                    resume mientras está cerrado. */}
                {!!r.respuesta && abierto !== r.id && (
                  <View style={styles.respuesta}>
                    <Text style={styles.respuestaTitulo}>Respuesta de ChasquiYa!</Text>
                    <Text style={t.pequeno}>{r.respuesta}</Text>
                  </View>
                )}

                <Pressable onPress={() => alternarHilo(r.id)} style={styles.verHilo} hitSlop={6}>
                  <Icono
                    nombre={abierto === r.id ? 'chevron-up' : 'chatbubble-ellipses-outline'}
                    tamano="sm"
                    color={colores.primario}
                  />
                  <Text style={styles.verHiloTexto}>
                    {abierto === r.id
                      ? 'Ocultar conversación'
                      : r.cantidadMensajes > 0
                        ? `Ver conversación (${r.cantidadMensajes})`
                        : 'Agregar información'}
                  </Text>
                </Pressable>

                {abierto === r.id && (
                  <View style={styles.hilo}>
                    {cargandoHilo && <Text style={styles.fecha}>Cargando conversación…</Text>}
                    {!cargandoHilo && hilo.length === 0 && (
                      <Text style={styles.fecha}>Todavía no hay respuestas.</Text>
                    )}
                    {hilo.map((m) => (
                      <View
                        key={m.id}
                        style={[styles.burbuja, m.esAdmin ? styles.burbujaSoporte : styles.burbujaMia]}>
                        <Text style={styles.burbujaAutor}>{m.esAdmin ? m.autor : 'Tú'}</Text>
                        <Text style={t.pequeno}>{m.cuerpo}</Text>
                        <Text style={styles.burbujaFecha}>{tiempoRelativo(m.fechaCreacion)}</Text>
                      </View>
                    ))}

                    {r.estado === 'RESUELTO' ? (
                      <Text style={styles.cerrado}>
                        Este reclamo está cerrado. Si sigues con el problema, abre uno nuevo.
                      </Text>
                    ) : (
                      <>
                        <CampoTexto
                          etiqueta="Agregar información"
                          value={borrador}
                          onChangeText={setBorrador}
                          multiline
                          numberOfLines={3}
                          style={styles.borrador}
                          maxLength={2000}
                        />
                        <Boton
                          titulo="Enviar"
                          onPress={() => enviarMensaje(r.id)}
                          cargando={enviandoMensaje}
                        />
                      </>
                    )}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  header: { paddingHorizontal: margenPantalla, paddingTop: espacio.sm },
  volver: { flexDirection: 'row', alignItems: 'center', marginBottom: espacio.xxs },
  volverTexto: { ...t.pequenoFuerte, color: colores.primario },
  segmentos: { paddingHorizontal: margenPantalla, paddingTop: espacio.sm },
  cuerpo: { padding: margenPantalla },
  ayuda: { ...t.pequeno, marginBottom: espacio.md },
  etiqueta: { ...t.pequenoFuerte, color: colores.textoSuave, marginBottom: espacio.sm },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.xs, marginBottom: espacio.md },
  pildora: {
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.xs,
    borderRadius: radio.completo,
    borderWidth: 1,
    borderColor: colores.borde,
    backgroundColor: colores.superficie,
  },
  pildoraActiva: { borderColor: colores.primario, backgroundColor: colores.primarioSuave },
  pildoraTexto: { ...t.pequeno },
  pildoraTextoActivo: { color: colores.primario, fontWeight: '700' },
  bloqueServicios: { marginBottom: espacio.md },
  filaServicios: { gap: espacio.xs, paddingRight: espacio.md },
  /* Acotado: si no, un nombre largo estira la píldora fuera de la pantalla. */
  pildoraServicio: { maxWidth: 210 },
  pildoraDetalle: { ...t.etiqueta, color: colores.textoTenue },
  servicioTag: { flexDirection: 'row', alignItems: 'center', gap: espacio.xxs, marginBottom: espacio.xxs },
  servicioTexto: { ...t.etiqueta, color: colores.textoSuave, flex: 1 },
  multilinea: { height: 130, textAlignVertical: 'top' },
  ayudaFotos: { ...t.pequeno, color: colores.textoSuave, marginBottom: espacio.sm },
  fotos: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.xs, marginBottom: espacio.md },
  miniatura: { width: 84, height: 84, borderRadius: radio.sm, overflow: 'visible' },
  miniaturaImagen: { width: 84, height: 84, borderRadius: radio.sm },
  quitarFoto: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colores.texto,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agregarFoto: {
    width: 84,
    height: 84,
    borderRadius: radio.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colores.primario,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  agregarFotoTexto: { ...t.etiqueta, color: colores.primario, fontWeight: '600' },
  error: { ...t.pequeno, color: colores.error, marginBottom: espacio.sm },
  exito: { ...t.pequeno, color: colores.exito, marginBottom: espacio.sm },
  tarjeta: {
    backgroundColor: colores.superficie,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espacio.md,
    marginBottom: espacio.sm,
    gap: 2,
  },
  filaTitulo: { flexDirection: 'row', alignItems: 'center', gap: espacio.xs },
  fecha: { ...t.etiqueta, color: colores.textoTenue, marginBottom: espacio.xxs },
  estado: {
    paddingHorizontal: espacio.xs,
    paddingVertical: 2,
    borderRadius: radio.completo,
    backgroundColor: colores.alertaFondo,
  },
  estadoResuelto: { backgroundColor: colores.exitoFondo },
  estadoTexto: { ...t.etiqueta, color: colores.alertaTexto, fontWeight: '700' },
  estadoTextoResuelto: { color: colores.exitoTexto },
  respuesta: {
    marginTop: espacio.sm,
    padding: espacio.sm,
    borderRadius: radio.sm,
    backgroundColor: colores.fondo,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  respuestaTitulo: { ...t.pequenoFuerte, color: colores.primario, marginBottom: 2 },
  verHilo: { flexDirection: 'row', alignItems: 'center', gap: espacio.xxs, marginTop: espacio.sm },
  verHiloTexto: { ...t.pequenoFuerte, color: colores.primario },
  hilo: { marginTop: espacio.sm, gap: espacio.xs },
  burbuja: { padding: espacio.sm, borderRadius: radio.md, maxWidth: '90%' },
  /* Soporte a la izquierda y yo a la derecha, como en cualquier conversación. */
  burbujaSoporte: { backgroundColor: colores.fondo, alignSelf: 'flex-start' },
  burbujaMia: { backgroundColor: colores.primarioSuave, alignSelf: 'flex-end' },
  burbujaAutor: { ...t.etiqueta, color: colores.textoSuave, fontWeight: '700', marginBottom: 2 },
  burbujaFecha: { ...t.etiqueta, color: colores.textoTenue, marginTop: 2 },
  borrador: { height: 80, textAlignVertical: 'top' },
  cerrado: { ...t.pequeno, color: colores.textoSuave, fontStyle: 'italic' },
});
