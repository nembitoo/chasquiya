import '../utilidades/polyfills';

import { Client } from '@stomp/stompjs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../api/cliente';
import { WS_URL } from '../api/config';
import { Mensaje } from '../api/tipos';
import { Icono } from '../componentes/base/Icono';
import { useAuth } from '../estado/AuthContext';
import { RootStackParamList } from '../navegacion/Navegacion';
import { colores, espacio, radio, tipografia } from '../tema/tema';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

function hora(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function ChatScreen({ route, navigation }: Props) {
  const { solicitudId, contraparteNombre } = route.params;
  const { sesion } = useAuth();
  const token = sesion?.token ?? '';
  const miId = sesion?.id;

  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [conectado, setConectado] = useState(false);
  const [error, setError] = useState('');

  const scrollRef = useRef<ScrollView>(null);
  const clienteRef = useRef<Client | null>(null);

  /** Agrega un mensaje evitando duplicados (el propio llega también por WebSocket). */
  function agregar(m: Mensaje) {
    setMensajes((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
  }

  // Historial + marcar como leídos.
  useEffect(() => {
    (async () => {
      try {
        setMensajes(await api.mensajes.listar(token, solicitudId));
        await api.mensajes.marcarLeidos(token, solicitudId);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo cargar la conversación.');
      } finally {
        setCargando(false);
      }
    })();
  }, [token, solicitudId]);

  // Conexión en tiempo real (STOMP sobre WebSocket).
  useEffect(() => {
    const cliente = new Client({
      brokerURL: WS_URL,
      // El backend valida este token en el CONNECT y los permisos al suscribirse.
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 3000,
      onConnect: () => {
        setConectado(true);
        cliente.subscribe(`/topic/solicitudes/${solicitudId}`, (frame) => {
          try {
            agregar(JSON.parse(frame.body) as Mensaje);
          } catch {
            // Mensaje mal formado: lo ignoramos.
          }
        });
      },
      onDisconnect: () => setConectado(false),
      onWebSocketClose: () => setConectado(false),
      onStompError: () => setConectado(false),
    });
    cliente.activate();
    clienteRef.current = cliente;

    return () => {
      clienteRef.current = null;
      cliente.deactivate();
    };
  }, [token, solicitudId]);

  async function enviar() {
    const limpio = texto.trim();
    if (!limpio) {
      return;
    }
    setError('');
    setEnviando(true);
    try {
      // Se envía por REST (queda guardado y validado); el backend lo difunde.
      agregar(await api.mensajes.enviar(token, solicitudId, limpio));
      setTexto('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar el mensaje.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <SafeAreaView style={styles.contenedor}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.volver}>‹ Volver</Text>
        </Pressable>
        <View style={styles.headerFila}>
          <Text style={styles.titulo}>{contraparteNombre}</Text>
          <View style={[styles.punto, { backgroundColor: conectado ? colores.exito : colores.borde }]} />
        </View>
        <Text style={styles.estadoConexion}>{conectado ? 'En línea' : 'Conectando…'}</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        {cargando ? (
          <View style={styles.centro}>
            <ActivityIndicator size="large" color={colores.primario} />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.lista}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
            {mensajes.length === 0 && (
              <Text style={styles.vacio}>
                Aún no hay mensajes. Escribe para coordinar el servicio.
              </Text>
            )}
            {mensajes.map((m) => {
              const mio = m.autorId === miId;
              return (
                <View key={m.id} style={[styles.burbuja, mio ? styles.burbujaMia : styles.burbujaOtro]}>
                  <Text style={[styles.textoMensaje, mio && styles.textoMio]}>{m.texto}</Text>
                  <Text style={[styles.hora, mio && styles.horaMia]}>{hora(m.fechaCreacion)}</Text>
                </View>
              );
            })}
          </ScrollView>
        )}

        {!!error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.barra}>
          <TextInput
            style={styles.input}
            value={texto}
            onChangeText={setTexto}
            placeholder="Escribe un mensaje…"
            placeholderTextColor={colores.textoSuave}
            multiline
          />
          <Pressable
            style={[styles.enviar, (!texto.trim() || enviando) && styles.enviarInactivo]}
            onPress={enviar}
            disabled={!texto.trim() || enviando}>
            {enviando ? (
              <ActivityIndicator color={colores.blanco} size="small" />
            ) : (
              <Icono nombre="send" tamano="md" color={colores.blanco} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: espacio.lg,
    paddingTop: espacio.sm,
    paddingBottom: espacio.sm,
    borderBottomWidth: 1,
    borderBottomColor: colores.borde,
    backgroundColor: colores.blanco,
  },
  volver: { color: colores.primario, fontSize: tipografia.cuerpo, fontWeight: '600' },
  headerFila: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm, marginTop: espacio.xs },
  titulo: { fontSize: tipografia.subtitulo, fontWeight: '800', color: colores.texto },
  punto: { width: 8, height: 8, borderRadius: 4 },
  estadoConexion: { color: colores.textoSuave, fontSize: tipografia.pequeno },
  lista: { padding: espacio.lg, gap: espacio.sm },
  vacio: { textAlign: 'center', color: colores.textoSuave, marginTop: espacio.xl },
  burbuja: {
    maxWidth: '80%',
    borderRadius: radio.md,
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.sm,
  },
  burbujaMia: { alignSelf: 'flex-end', backgroundColor: colores.primario },
  burbujaOtro: {
    alignSelf: 'flex-start',
    backgroundColor: colores.blanco,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  textoMensaje: { color: colores.texto, fontSize: tipografia.cuerpo },
  textoMio: { color: colores.blanco },
  hora: { color: colores.textoSuave, fontSize: 11, marginTop: 2, alignSelf: 'flex-end' },
  horaMia: { color: 'rgba(255,255,255,0.8)' },
  barra: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: espacio.sm,
    padding: espacio.md,
    borderTopWidth: 1,
    borderTopColor: colores.borde,
    backgroundColor: colores.blanco,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.lg,
    paddingHorizontal: espacio.md,
    paddingTop: espacio.sm,
    paddingBottom: espacio.sm,
    color: colores.texto,
    fontSize: tipografia.cuerpo,
  },
  enviar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colores.primario,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enviarInactivo: { opacity: 0.5 },
  enviarTexto: { color: colores.blanco, fontSize: 18, fontWeight: '700' },
  error: { color: colores.error, paddingHorizontal: espacio.lg, paddingBottom: espacio.sm },
});
