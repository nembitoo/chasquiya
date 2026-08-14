import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../api/cliente';
import { Boton } from '../componentes/Boton';
import { CampoTexto } from '../componentes/CampoTexto';
import { SelectorEstrellas } from '../componentes/Estrellas';
import { useAuth } from '../estado/AuthContext';
import { RootStackParamList } from '../navegacion/Navegacion';
import { colores, espacio, tipografia } from '../tema/tema';

type Props = NativeStackScreenProps<RootStackParamList, 'Calificar'>;

export function CalificarScreen({ route, navigation }: Props) {
  const { solicitudId, contraparteNombre, esMaestro } = route.params;
  const { sesion } = useAuth();
  const token = sesion?.token ?? '';

  const [estrellas, setEstrellas] = useState(0);
  const [puntualidad, setPuntualidad] = useState(0);
  const [calidad, setCalidad] = useState(0);
  const [trato, setTrato] = useState(0);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [listo, setListo] = useState(false);

  async function enviar() {
    setError('');
    if (estrellas === 0) {
      setError('Elige cuántas estrellas le das.');
      return;
    }
    try {
      setEnviando(true);
      await api.calificaciones.calificar(token, solicitudId, {
        estrellas,
        comentario: comentario.trim() || null,
        // Los aspectos solo aplican al calificar a un maestro.
        puntualidad: esMaestro && puntualidad > 0 ? puntualidad : null,
        calidad: esMaestro && calidad > 0 ? calidad : null,
        trato: esMaestro && trato > 0 ? trato : null,
      });
      setListo(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar la evaluación.');
    } finally {
      setEnviando(false);
    }
  }

  if (listo) {
    return (
      <SafeAreaView style={styles.contenedor}>
        <View style={styles.exito}>
          <Text style={styles.exitoIcono}>🙌</Text>
          <Text style={styles.exitoTitulo}>¡Gracias por tu evaluación!</Text>
          <Text style={styles.exitoTexto}>
            Tu opinión ayuda a que otras personas encuentren buenos maestros.
          </Text>
          <View style={styles.exitoBoton}>
            <Boton titulo="Volver" onPress={() => navigation.goBack()} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.contenedor}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.volver}>‹ Volver</Text>
        </Pressable>
        <Text style={styles.titulo}>¿Cómo fue tu experiencia?</Text>
        <Text style={styles.subtitulo}>con {contraparteNombre}</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <SelectorEstrellas valor={estrellas} onCambio={setEstrellas} etiqueta="Calificación general" />

          {esMaestro && (
            <>
              <Text style={styles.seccion}>Cuéntanos más (opcional)</Text>
              <SelectorEstrellas valor={puntualidad} onCambio={setPuntualidad} etiqueta="Puntualidad" />
              <SelectorEstrellas valor={calidad} onCambio={setCalidad} etiqueta="Calidad del trabajo" />
              <SelectorEstrellas valor={trato} onCambio={setTrato} etiqueta="Trato" />
            </>
          )}

          <CampoTexto
            etiqueta="Comentario (opcional)"
            value={comentario}
            onChangeText={setComentario}
            multiline
            numberOfLines={4}
            style={styles.multilinea}
            placeholder="Cuenta cómo te fue con el servicio…"
          />

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Boton titulo="Enviar evaluación" onPress={enviar} cargando={enviando} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  header: { paddingHorizontal: espacio.lg, paddingTop: espacio.sm },
  volver: { color: colores.primario, fontSize: tipografia.cuerpo, fontWeight: '600', marginBottom: espacio.xs },
  titulo: { fontSize: tipografia.titulo, fontWeight: '800', color: colores.texto },
  subtitulo: { color: colores.textoSuave, marginTop: 2 },
  scroll: { padding: espacio.lg },
  seccion: {
    fontSize: tipografia.pequeno,
    color: colores.textoSuave,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: espacio.md,
    marginBottom: espacio.sm,
  },
  multilinea: { height: 100, paddingTop: espacio.sm, textAlignVertical: 'top' },
  error: { color: colores.error, marginBottom: espacio.md, fontSize: tipografia.cuerpo },
  exito: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: espacio.lg },
  exitoIcono: { fontSize: 56 },
  exitoTitulo: { fontSize: tipografia.titulo, fontWeight: '800', color: colores.texto, marginTop: espacio.md },
  exitoTexto: { color: colores.textoSuave, textAlign: 'center', marginTop: espacio.sm },
  exitoBoton: { alignSelf: 'stretch', marginTop: espacio.xl },
});
